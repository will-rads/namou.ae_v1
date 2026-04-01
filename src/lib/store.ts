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

async function blobRead(): Promise<SpreadsheetRow[] | null> {
  try {
    const { list, get } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
    if (blobs.length === 0) return null;
    // Use SDK get() instead of fetch(downloadUrl) to bypass CDN caching
    const result = await get(blobs[0].url, { access: "private" });
    if (!result || !result.stream) return null;
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    return JSON.parse(text);
  } catch (error) {
    console.error("[store] blobRead failed, falling back to seeded rows", error);
    return null;
  }
}

async function blobWrite(rows: SpreadsheetRow[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(rows), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

async function blobDelete(): Promise<void> {
  const { list, del } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
  if (blobs.length > 0) await del(blobs[0].url);
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Read rows from persistent store. Returns null if nothing is stored. */
export async function readRows(): Promise<SpreadsheetRow[] | null> {
  try {
    return USE_BLOB ? await blobRead() : await fsRead();
  } catch (e) {
    console.error("[store] readRows failed, returning null", e);
    return null;
  }
}

/** Read rows, auto-seeding from ORIGINAL_SPREADSHEET_ROWS if nothing stored.
 *  If seeding fails (e.g. missing blob token), still returns seed data so the
 *  site can load — writes will surface the real error separately. */
export async function readRowsOrSeed(): Promise<SpreadsheetRow[]> {
  try {
    const existing = await readRows();
    if (existing && existing.length > 0) return existing;
  } catch { /* fall through to seed */ }
  // Try to persist the seed; if it fails, return seed data anyway
  try { await writeRows(ORIGINAL_SPREADSHEET_ROWS); } catch { /* ignore */ }
  return ORIGINAL_SPREADSHEET_ROWS;
}

/** Write rows to persistent store. */
export async function writeRows(rows: SpreadsheetRow[]): Promise<void> {
  if (USE_BLOB) return blobWrite(rows);
  if (IS_VERCEL) return; // no blob token — skip silently, localStorage handles client-side
  return fsWrite(rows);
}

/** Delete stored rows (next readRowsOrSeed will re-seed). */
export async function deleteRows(): Promise<void> {
  if (USE_BLOB) return blobDelete();
  if (IS_VERCEL) return; // no blob token — skip silently
  return fsDelete();
}
