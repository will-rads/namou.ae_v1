// Plot data — parsed from CSV (source of truth)
// To update seed data, edit src/data/plots.csv

import { type Plot, type LandCategory } from "./mock";
import csvText from "./plotsCsv";

// ── Column definitions (key → label) for the backend table ────────────────────

export interface SpreadsheetColumn {
  key: string;
  label: string;
  width: string;
}

export const SPREADSHEET_COLUMNS: SpreadsheetColumn[] = [
  { key: "plotName", label: "Plot Name", width: "min-w-[300px]" },
  { key: "area", label: "Area", width: "min-w-[200px]" },
  { key: "landUse", label: "Land Use", width: "min-w-[150px]" },
  { key: "jv", label: "Deal Type", width: "min-w-[120px]" },
  { key: "plotArea", label: "Plot Area", width: "min-w-[120px]" },
  { key: "plotType", label: "Plot Type", width: "min-w-[200px]" },
  { key: "askingPrice", label: "Asking Price", width: "min-w-[150px]" },
  { key: "pricePerSqFt", label: "Price / sq ft", width: "min-w-[120px]" },
  { key: "gfa", label: "GFA", width: "min-w-[120px]" },
  { key: "far", label: "FAR", width: "min-w-[80px]" },
  { key: "maxHeight", label: "Max Height", width: "min-w-[200px]" },
  { key: "zoning", label: "Zoning", width: "min-w-[250px]" },
  { key: "infrastructure", label: "Infrastructure", width: "min-w-[200px]" },
  { key: "locationPin", label: "Location Pin", width: "min-w-[250px]" },
  { key: "costPerGfaSqFt", label: "Cost / GFA sq ft", width: "min-w-[130px]" },
  { key: "sellingPricePerNsa", label: "Selling Price / NSA", width: "min-w-[150px]" },
  { key: "paymentPlan", label: "Payment Plan", width: "min-w-[350px]" },
  { key: "bookingAed", label: "Booking (AED)", width: "min-w-[150px]" },
  { key: "bookingPct", label: "Booking Percentage", width: "min-w-[110px]" },
  { key: "spa", label: "SPA", width: "min-w-[200px]" },
  { key: "spaPct", label: "SPA Percentage", width: "min-w-[100px]" },
  { key: "balanceInstallments", label: "Balance & Installments", width: "min-w-[160px]" },
  { key: "balanceInstallmentsPct", label: "Balance & Installments %", width: "min-w-[110px]" },
  { key: "balanceInstallmentsMethod", label: "Balance & Installments Method", width: "min-w-[260px]" },
  { key: "landRegFee", label: "Land Registration Fee", width: "min-w-[210px]" },
  { key: "landRegFeePct", label: "Land Reg. Fee %", width: "min-w-[100px]" },
  { key: "commissionFee", label: "Commission Fee", width: "min-w-[140px]" },
  { key: "commissionFeePct", label: "Commission Fee %", width: "min-w-[110px]" },
  { key: "adminFee", label: "Admin Fee", width: "min-w-[130px]" },
  { key: "adminFeePct", label: "Admin Fee %", width: "min-w-[100px]" },
  { key: "annualServiceCharge", label: "Annual Service/Community Charge", width: "min-w-[180px]" },
  { key: "image1", label: "Gallery Image 1", width: "min-w-[250px]" },
  { key: "image2", label: "Gallery Image 2", width: "min-w-[250px]" },
  { key: "image3", label: "Gallery Image 3", width: "min-w-[250px]" },
  { key: "image4", label: "Gallery Image 4", width: "min-w-[250px]" },
  { key: "category", label: "Category", width: "min-w-[140px]" },
];

export type SpreadsheetRow = Record<string, string>;

const KEYS = SPREADSHEET_COLUMNS.map(c => c.key);

function emptyRow(): SpreadsheetRow {
  const r: SpreadsheetRow = {};
  for (const k of KEYS) r[k] = "";
  return r;
}

export function newSpreadsheetRow(): SpreadsheetRow {
  return emptyRow();
}

// ── CSV parser ────────────────────────────────────────────────────────────────

/** Parse a CSV string into an array of string arrays (handles quoted fields). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const fields: string[] = [];
    // Parse each field in the row
    while (i < len) {
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let val = "";
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              val += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            val += text[i];
            i++;
          }
        }
        fields.push(val);
        // Skip comma or end of line
        if (i < len && text[i] === ',') i++;
        else if (i < len && (text[i] === '\r' || text[i] === '\n')) {
          if (text[i] === '\r' && i + 1 < len && text[i + 1] === '\n') i += 2;
          else i++;
          break;
        }
      } else {
        // Unquoted field — read until comma or newline
        let start = i;
        while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') i++;
        fields.push(text.substring(start, i));
        if (i < len && text[i] === ',') i++;
        else if (i < len && (text[i] === '\r' || text[i] === '\n')) {
          if (text[i] === '\r' && i + 1 < len && text[i + 1] === '\n') i += 2;
          else i++;
          break;
        }
      }
    }
    // Also break if we reached end without newline
    if (fields.length > 0) rows.push(fields);
  }
  return rows;
}

/** Parse CSV text into SpreadsheetRow[] using the header row for keys. */
function parseCsvToRows(text: string): SpreadsheetRow[] {
  const raw = parseCsvRows(text.trim());
  if (raw.length < 2) return [];
  const headers = raw[0];
  return raw.slice(1).map(fields => {
    const row: SpreadsheetRow = {};
    // Ensure all known keys are present
    for (const k of KEYS) row[k] = "";
    headers.forEach((h, idx) => {
      row[h] = fields[idx] ?? "";
    });
    return row;
  });
}

// ── Parse seed data from CSV ──────────────────────────────────────────────────

export const ORIGINAL_SPREADSHEET_ROWS: SpreadsheetRow[] = parseCsvToRows(csvText);

// ── Derive defaults for site-essential columns ────────────────────────────────

const AREA_ETAS: Record<string, { airport: string; casino: string }> = {
  "Al Marjan Beach District": { airport: "~20 min", casino: "~5 min" },
  "Al Maireed": { airport: "~10 min", casino: "~20 min" },
  "Al Nakheel": { airport: "~15 min", casino: "~15 min" },
  "RAK Central": { airport: "~15 min", casino: "~15 min" },
};

function deriveCategoryFromLandUse(landUse: string): LandCategory {
  const lu = landUse.toLowerCase();
  if (lu.includes("industrial")) return "industrial";
  if (lu.includes("mixed") || lu.includes("c+r") || lu.includes("c + r")) return "mixed-use";
  if (lu.includes("hospitality")) return "commercial";
  if (lu.includes("commercial") && lu.includes("residential")) return "mixed-use";
  if (lu.includes("residential") && lu.includes("commercial")) return "mixed-use";
  if (lu.includes("commercial") || lu.includes("retail") || lu.includes("hotel")) return "commercial";
  if (lu.includes("residential")) return "residential";
  return "mixed-use";
}

for (const row of ORIGINAL_SPREADSHEET_ROWS) {
  if (!row.category) row.category = deriveCategoryFromLandUse(row.landUse || "");
  const etas = AREA_ETAS[row.area];
  if (etas) {
    if (!row.airportEta) row.airportEta = etas.airport;
    if (!row.casinoEta) row.casinoEta = etas.casino;
  }
}

// ── Derive map coordinates from location strings / URLs ─────────────────────

/** Try to extract lat/lng from a Google Maps URL or raw "lat,lng" string. */
function coordsFromUrl(url: string): [number, number] | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Raw coordinates: "25.665,55.760" or "25.665, 55.760"
  const rawMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  // Full URL: @lat,lng pattern
  const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  // Full URL: !3d...!4d... pattern
  const d3 = trimmed.match(/!3d(-?\d+\.?\d*)/);
  const d4 = trimmed.match(/!4d(-?\d+\.?\d*)/);
  if (d3 && d4) {
    const lat = parseFloat(d3[1]);
    const lng = parseFloat(d4[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  // Shortened URL: look up by short code (legacy support)
  const shortMatch = trimmed.match(/maps\.app\.goo\.gl\/([A-Za-z0-9]+)/);
  if (shortMatch && URL_COORDS[shortMatch[1]]) return URL_COORDS[shortMatch[1]];
  return null;
}

// Legacy pre-resolved coordinates (kept for backwards compat with localStorage overrides)
const URL_COORDS: Record<string, [number, number]> = {
  "vPwinu7hV9rF8MkE9": [25.823206, 55.968924],
  "sM9dApPNbQnR1RtC6": [25.829107, 55.972191],
  "RAeiRMiTebWebxHV6": [25.665357, 55.760766],
  "abZacusdbfBoV9PYA": [25.6653611, 55.7607778],
  "khYWFNE4mAzD1wej6": [25.6653611, 55.7607778],
  "riqob5Gi94PtmHkr9": [25.661685, 55.750762],
  "NKxDnTc9cTqZer8H7": [25.681053, 55.767013],
  "ufdYaZDxBmtDvYEg8": [25.6870833, 55.7964444],
};

// ── Convert spreadsheet rows → Plot[] for the rest of the site ──────────────

function parseNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;
}

const VALID_CATEGORIES = new Set<string>(["residential", "commercial", "industrial", "mixed-use"]);

/** Convert a Google Drive view URL to a direct-embeddable thumbnail URL. */
export function driveUrlToImage(url: string): string {
  if (!url) return "";
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  return url; // already a direct URL or unknown format
}

export function spreadsheetRowsToPlots(rows: SpreadsheetRow[]): Plot[] {
  const seenIds = new Set<string>();
  return rows
    .filter((row) => row.plotName?.trim())
    .map((row, index) => {
      // Stable ID from plot name
      let id = row.plotName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60);
      if (!id) id = `plot-${index}`;
      if (seenIds.has(id)) id = `${id}-${index}`;
      seenIds.add(id);

      // Category: explicit column first, fallback to derivation from landUse
      const catRaw = (row.category || "").toLowerCase().trim();
      const category: LandCategory = VALID_CATEGORIES.has(catRaw)
        ? (catRaw as LandCategory)
        : deriveCategoryFromLandUse(row.landUse || "");

      const farVal = row.far ? parseNum(row.far) : undefined;
      const gfaVal = row.gfa ? parseNum(row.gfa) : undefined;

      // Derive coordinates from Location Pin
      let latVal: number | undefined;
      let lngVal: number | undefined;
      if (row.locationPin) {
        const coords = coordsFromUrl(row.locationPin);
        if (coords) { latVal = coords[0]; lngVal = coords[1]; }
      }

      // Collect image URLs (up to 4)
      const images: string[] = [row.image1, row.image2, row.image3, row.image4]
        .map(u => (u || "").trim())
        .filter(Boolean);

      return {
        id,
        name: row.plotName.trim(),
        area: row.area || "Unknown",
        category,
        plotArea: parseNum(row.plotArea),
        askingPrice: parseNum(row.askingPrice),
        pricePerSqFt: parseNum(row.pricePerSqFt),
        landUse: row.landUse || "",
        location: row.area ? `${row.area}, Ras Al Khaimah` : "Ras Al Khaimah",
        plotType: row.plotType || "",
        airportEta: row.airportEta || "",
        casinoEta: row.casinoEta || "",
        ...(row.maxHeight ? { maxHeight: row.maxHeight } : {}),
        ...(farVal != null ? { far: farVal } : {}),
        ...(gfaVal != null ? { gfa: gfaVal } : {}),
        ...(row.zoning ? { zoning: row.zoning } : {}),
        ...(row.infrastructure ? { infrastructure: row.infrastructure } : {}),
        ...(row.paymentPlan ? { paymentPlan: row.paymentPlan } : {}),
        ...(latVal != null ? { lat: latVal } : {}),
        ...(lngVal != null ? { lng: lngVal } : {}),
        ...(row.locationPin ? { googleMapsUrl: row.locationPin } : {}),
        ...(images.length > 0 ? { images } : {}),
      } satisfies Plot;
    });
}

// ── localStorage persistence ────────────────────────────────────────────────

const STORAGE_KEY = "namou_spreadsheet_override";

export function saveSpreadsheetRows(data: SpreadsheetRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — silently ignore */ }
}

export function loadSpreadsheetRows(): SpreadsheetRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* parse error */ }
  return null;
}

export function clearSpreadsheetRows(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
