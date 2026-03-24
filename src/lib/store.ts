/**
 * Shared persistence layer for backend-managed spreadsheet data.
 *
 * Production (Vercel):  uses @vercel/blob — requires BLOB_READ_WRITE_TOKEN env var.
 * Local dev:            falls back to filesystem (data/spreadsheet-override.json).
 */

import { ORIGINAL_SPREADSHEET_ROWS, type SpreadsheetRow } from "@/data/spreadsheetData";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
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
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
  if (blobs.length === 0) return null;
  const res = await fetch(blobs[0].url);
  if (!res.ok) return null;
  return res.json();
}

async function blobWrite(rows: SpreadsheetRow[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(rows), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
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
  return USE_BLOB ? blobRead() : fsRead();
}

/** Read rows, auto-seeding from ORIGINAL_SPREADSHEET_ROWS if nothing stored. */
export async function readRowsOrSeed(): Promise<SpreadsheetRow[]> {
  const existing = await readRows();
  if (existing && existing.length > 0) return existing;
  // Auto-seed
  await writeRows(ORIGINAL_SPREADSHEET_ROWS);
  return ORIGINAL_SPREADSHEET_ROWS;
}

/** Write rows to persistent store. */
export async function writeRows(rows: SpreadsheetRow[]): Promise<void> {
  return USE_BLOB ? blobWrite(rows) : fsWrite(rows);
}

/** Delete stored rows (next readRowsOrSeed will re-seed). */
export async function deleteRows(): Promise<void> {
  return USE_BLOB ? blobDelete() : fsDelete();
}
