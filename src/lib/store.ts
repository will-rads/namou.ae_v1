/**
 * Shared persistence layer for backend-managed spreadsheet data.
 *
 * Primary source: Google Sheets (live, no redeploy needed for data changes).
 * Fallback: ORIGINAL_SPREADSHEET_ROWS (hardcoded seed, used if Sheets is unreachable).
 * Local dev: filesystem cache (data/spreadsheet-override.json).
 */

import { ORIGINAL_SPREADSHEET_ROWS, SPREADSHEET_COLUMNS, type SpreadsheetRow } from "@/data/spreadsheetData";

const IS_VERCEL = !!process.env.VERCEL;
const BLOB_KEY = "spreadsheet-override.json";

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "1KAsPi-FB6WH7GESe5ZmvGziXSPWj2vjZgwxrwI1bXpk";
const GOOGLE_SHEET_GID = process.env.GOOGLE_SHEET_GID || "2114072871";

// ── CSV header → app key mapping ────────────────────────────────────────────

const HEADER_TO_KEY: Record<string, string> = {
  "PLOT NAME": "plotName",
  "PLOT NAME (OPTION 1)": "plotName",
  "AREA": "area",
  "LAND USE": "landUse",
  "DEAL TYPE": "jv",
  "PLOT AREA": "plotArea",
  "PLOT TYPE": "plotType",
  "ASKING PRICE": "askingPrice",
  // "PRICE / SQ FT" removed — pricePerSqFt is now computed from askingPrice / plotArea
  "GFA": "gfa",
  "FAR": "far",
  "MAX HEIGHT": "maxHeight",
  "ZONING": "zoning",
  "INFRASTRUCTURE": "infrastructure",
  "LOCATION PIN / COORDS OR URL": "locationPin",
  "LOCATION PIN": "locationPin",
  "COST / GFA SQ FT": "costPerGfaSqFt",
  "SELLING PRICE / NSA": "sellingPricePerNsa",
  "PAYMENT PLAN": "paymentPlan",
  "BOOKING (AED)": "bookingAed",
  "BOOKING PERCENTAGE": "bookingPct",
  "SPA": "spa",
  "SPA PERCENTAGE": "spaPct",
  "BALANCE & INSTALLMENTS": "balanceInstallments",
  "BALANCE & INSTALLMENTS %": "balanceInstallmentsPct",
  "BALANCE & INSTALLMENTS METHOD": "balanceInstallmentsMethod",
  "LAND REGISTRATION FEE": "landRegFee",
  "LAND REG. FEE %": "landRegFeePct",
  "COMMISSION FEE": "commissionFee",
  "COMMISSION FEE %": "commissionFeePct",
  "ADMIN FEE": "adminFee",
  "ADMIN FEE %": "adminFeePct",
  "ANNUAL SERVICE/COMMUNITY CHARGE": "annualServiceCharge",
  "GALLERY IMAGE 1": "galleryImage1",
  "GALLERY IMAGE 2": "galleryImage2",
  "GALLERY IMAGE 3": "galleryImage3",
  "GALLERY IMAGE 4": "galleryImage4",
  "GALLERY VIDEO 1": "galleryVideo1",
  "VIDEO 1": "galleryVideo1",
  "GALLERY VIDEO 2": "galleryVideo2",
  "VIDEO 2": "galleryVideo2",
  "CATEGORY": "category",
  "AVAILABILITY": "availability",
};

// ── Simple CSV parser (handles quoted fields with commas) ───────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length) {
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = "";
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
        if (i < text.length && text[i] === ',') i++; // skip comma
      } else {
        // Unquoted field
        let field = "";
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i];
          i++;
        }
        row.push(field);
        if (i < text.length && text[i] === ',') { i++; continue; }
      }
      // End of row?
      if (i >= text.length || text[i] === '\n' || text[i] === '\r') break;
    }
    // Skip line endings
    while (i < text.length && (text[i] === '\n' || text[i] === '\r')) i++;
    if (row.length > 1 || (row.length === 1 && row[0].trim())) rows.push(row);
  }
  return rows;
}

// ── Google Sheets fetch ─────────────────────────────────────────────────────

// In-memory cache: { data, fetchedAt }
let sheetsCache: { data: SpreadsheetRow[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

async function googleSheetsRead(): Promise<SpreadsheetRow[] | null> {
  // Return cached data if fresh
  if (sheetsCache && Date.now() - sheetsCache.fetchedAt < CACHE_TTL_MS) {
    return sheetsCache.data;
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[store] Google Sheets returned ${res.status}`);
      return null;
    }

    const text = await res.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) return null; // need header + at least 1 data row

    const headers = parsed[0];
    // Map CSV column indices to app keys
    const colMap: (string | null)[] = headers.map(h => {
      const normalized = h.trim().toUpperCase();
      return HEADER_TO_KEY[normalized] ?? null;
    });

    const allKeys = SPREADSHEET_COLUMNS.map(c => c.key);
    const rows: SpreadsheetRow[] = [];

    for (let r = 1; r < parsed.length; r++) {
      const csvRow = parsed[r];
      const obj: SpreadsheetRow = {};
      // Initialize all keys to empty string
      for (const k of allKeys) obj[k] = "";
      // Fill from CSV
      for (let c = 0; c < colMap.length && c < csvRow.length; c++) {
        const key = colMap[c];
        if (key) obj[key] = csvRow[c]?.trim() ?? "";
      }
      // Skip rows without a plot name
      if (!obj.plotName) continue;
      rows.push(obj);
    }

    if (rows.length > 0) {
      sheetsCache = { data: rows, fetchedAt: Date.now() };
    }

    return rows.length > 0 ? rows : null;
  } catch (e) {
    clearTimeout(timeout);
    console.error("[store] Google Sheets fetch failed", e);
    return null;
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

// ── Public API ──────────────────────────────────────────────────────────────

/** Read rows from persistent store. Returns null if nothing is stored. */
export async function readRows(): Promise<SpreadsheetRow[] | null> {
  // Try Google Sheets first (primary source of truth)
  try {
    const sheets = await googleSheetsRead();
    if (sheets && sheets.length > 0) return sheets;
  } catch (e) {
    console.error("[store] Google Sheets read failed", e);
  }
  // Fallback to filesystem (local dev)
  if (!IS_VERCEL) {
    try {
      return await fsRead();
    } catch (e) {
      console.error("[store] fsRead failed", e);
    }
  }
  return null;
}

/** Read rows, auto-seeding from ORIGINAL_SPREADSHEET_ROWS if nothing stored. */
export async function readRowsOrSeed(): Promise<SpreadsheetRow[]> {
  try {
    const existing = await readRows();
    if (existing && existing.length > 0) return existing;
  } catch { /* fall through to seed */ }
  return ORIGINAL_SPREADSHEET_ROWS;
}

/** Write rows to persistent store (local dev filesystem only). */
export async function writeRows(rows: SpreadsheetRow[]): Promise<void> {
  if (IS_VERCEL) return; // Google Sheets is the source of truth on production
  return fsWrite(rows);
}

/** Delete stored rows (next readRowsOrSeed will re-seed). */
export async function deleteRows(): Promise<void> {
  if (IS_VERCEL) return;
  return fsDelete();
}

/** Invalidate the in-memory Google Sheets cache so next read fetches fresh data. */
export function invalidateSheetsCache(): void {
  sheetsCache = null;
}
