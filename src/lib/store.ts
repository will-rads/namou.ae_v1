/**
 * Shared persistence layer for backend-managed spreadsheet data.
 *
 * Production (Vercel):  uses @vercel/blob — requires BLOB_READ_WRITE_TOKEN env var.
 * Local dev:            falls back to filesystem (data/spreadsheet-override.json).
 */

import { ORIGINAL_SPREADSHEET_ROWS, type SpreadsheetRow } from "@/data/spreadsheetData";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;
const BLOB_KEY = "spreadsheet-override.json";

/** Throw a clear error when running on Vercel without blob storage configured. */
function assertNotEphemeralFs(): void {
  if (IS_VERCEL && !USE_BLOB) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured — filesystem storage is ephemeral on Vercel");
  }
}

// ── Filesystem helpers (local dev only) ─────────────────────────────────────

async function fsRead(): Promise<SpreadsheetRow[] | null> {
  const { readFile } = await import("fs/promises");
  const { join } = await import("path");
  const { existsSync } = await import("fs");
  const filePath = join(process.cwd(), "data", BLOB_KEY);
  if (!existsSync(filePath)) return null;
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function fsWrite(rows: SpreadsheetRow[]): Promise<void> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const { existsSync } = await import("fs");
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(join(dir, BLOB_KEY), JSON.stringify(rows), "utf-8");
}

async function fsDelete(): Promise<void> {
  const { unlink } = await import("fs/promises");
  const { join } = await import("path");
  const { existsSync } = await import("fs");
  const filePath = join(process.cwd(), "data", BLOB_KEY);
  if (existsSync(filePath)) await unlink(filePath);
}

// ── Blob helpers (Vercel production) ────────────────────────────────────────

/** Cached blob URL — set after the first successful put or list. */
let _blobUrl: string | null = null;

async function blobRead(): Promise<SpreadsheetRow[] | null> {
  const { list, head } = await import("@vercel/blob");
  // Try the known URL first (fast path after a write)
  if (_blobUrl) {
    try {
      const meta = await head(_blobUrl);
      const res = await fetch(meta.downloadUrl, { cache: "no-store" });
      if (res.ok) return res.json();
    } catch { /* blob may have been deleted — fall through to list */ }
  }
  // Discover via list
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
  if (blobs.length === 0) return null;
  _blobUrl = blobs[0].url;
  const res = await fetch(blobs[0].downloadUrl, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function blobWrite(rows: SpreadsheetRow[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  const blob = await put(BLOB_KEY, JSON.stringify(rows), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  _blobUrl = blob.url;
}

async function blobDelete(): Promise<void> {
  const { list, del } = await import("@vercel/blob");
  if (_blobUrl) {
    try { await del(_blobUrl); } catch { /* ignore */ }
    _blobUrl = null;
    return;
  }
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
  if (blobs.length > 0) await del(blobs[0].url);
  _blobUrl = null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Read rows from persistent store. Returns null if nothing is stored. */
export async function readRows(): Promise<SpreadsheetRow[] | null> {
  return USE_BLOB ? blobRead() : fsRead();
}

/** Read rows, auto-seeding from ORIGINAL_SPREADSHEET_ROWS if nothing stored.
 *  If seeding fails (e.g. missing blob token), still returns seed data so the
 *  site can load — writes will surface the real error separately. */
export async function readRowsOrSeed(): Promise<SpreadsheetRow[]> {
  const existing = await readRows();
  if (existing && existing.length > 0) return existing;
  // Try to persist the seed; if it fails, return seed data anyway
  try { await writeRows(ORIGINAL_SPREADSHEET_ROWS); } catch { /* write will fail again on next save and surface the error */ }
  return ORIGINAL_SPREADSHEET_ROWS;
}

/** Write rows to persistent store. */
export async function writeRows(rows: SpreadsheetRow[]): Promise<void> {
  if (USE_BLOB) return blobWrite(rows);
  assertNotEphemeralFs();
  return fsWrite(rows);
}

/** Delete stored rows (next readRowsOrSeed will re-seed). */
export async function deleteRows(): Promise<void> {
  if (USE_BLOB) return blobDelete();
  assertNotEphemeralFs();
  return fsDelete();
}
