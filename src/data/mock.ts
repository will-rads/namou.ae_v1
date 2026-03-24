/* ── Mock data for the baseline UI (v1, no backend) ── */

import { ORIGINAL_SPREADSHEET_ROWS, spreadsheetRowsToPlots, loadSpreadsheetRows, saveSpreadsheetRows } from "./spreadsheetData";

export type LandCategory = "residential" | "commercial" | "industrial" | "mixed-use";

export interface Plot {
  id: string;
  name: string;
  area: string;
  category: LandCategory;
  plotArea: number; // sq ft
  askingPrice: number; // AED
  pricePerSqFt: number; // AED
  landUse: string;
  location: string;
  plotType: string;
  airportEta: string;
  casinoEta: string;
  maxHeight?: string;
  far?: number;
  gfa?: number;
  zoning?: string;
  infrastructure?: string;
  dimensions?: { width: number; depth: number };
  developmentPotential?: string;
  paymentPlan?: string;
  lat?: number; // WGS84 latitude (decimal degrees)
  lng?: number; // WGS84 longitude (decimal degrees)
  googleMapsUrl?: string;
}

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  images: string[];
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: "image" | "video";
}

export interface ItineraryItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface LandCategoryInfo {
  slug: LandCategory;
  label: string;
  description: string;
  plotCount: number;
}

export interface ROIInputs {
  constructionCostPerSqFt: number;
  salePricePerSqFt: number;
  netSellableAreaPct: number;
  targetProfitMarginPct: number;
}

export interface ROIOutputs {
  roi: number;
  totalDevelopmentValue: number;
  maximumLandPrice: number;
  gfaPrice: number;
}

/* ── Derive default plots from the spreadsheet (source of truth for /backend) ── */
const _defaultPlots: Plot[] = spreadsheetRowsToPlots(ORIGINAL_SPREADSHEET_ROWS);

/* ── Areas (derived from spreadsheet plots) ── */
export const areas: string[] = [...new Set(_defaultPlots.map(p => p.area).filter(Boolean))];

/* ── Frozen copy of original areas (before any localStorage overrides) ── */
const ORIGINAL_AREAS: readonly string[] = Object.freeze([...areas]);

/* ── Plots (derived from spreadsheet — /backend is the source of truth) ── */
export const plots: Plot[] = [..._defaultPlots];

/* ── Frozen copy of the original plots (before any localStorage overrides) ── */
export const ORIGINAL_PLOTS: readonly Plot[] = JSON.parse(JSON.stringify(plots));

/* ── Filter categories for Master Plan ── */
export const masterPlanFilters = [
  "Master Plan",
  "Residential",
  "Residential / Mixed-use",
  "Residential / Commercial",
  "Commercial / Residential",
  "Residential / Commercial / Mixed-Use",
];

/* ── Landmarks ── */
export const landmarks: Landmark[] = [
  {
    id: "mina-al-arab",
    name: "Mina Al Arab",
    lat: 25.805,
    lng: 55.965,
    images: [
      "/images/landmarks/mina-al-arab-1.jpg",
      "/images/landmarks/mina-al-arab-2.jpg",
      "/images/landmarks/mina-al-arab-3.jpg",
    ],
  },
  {
    id: "al-hamra",
    name: "Al Hamra",
    lat: 25.725,
    lng: 55.788,
    images: [
      "/images/landmarks/al-hamra-1.jpg",
      "/images/landmarks/al-hamra-2.jpg",
      "/images/landmarks/al-hamra-3.jpg",
    ],
  },
];

/* ── Gallery ── */
export const galleryImages: GalleryImage[] = [
  { id: "g1", src: "/images/gallery/rak-1.jpg", alt: "RAK waterfront aerial", category: "image" },
  { id: "g2", src: "/images/gallery/rak-2.jpg", alt: "RAK modern architecture", category: "image" },
  { id: "g3", src: "/images/gallery/rak-3.jpg", alt: "RAK beachfront", category: "image" },
  { id: "g4", src: "/images/gallery/rak-4.jpg", alt: "RAK marina", category: "image" },
  { id: "g5", src: "/images/gallery/rak-5.jpg", alt: "RAK skyline", category: "image" },
  { id: "g6", src: "/images/gallery/rak-6.jpg", alt: "RAK landscape", category: "image" },
];

/* ── Itinerary ── */
export const itineraryItems: ItineraryItem[] = [
  {
    id: "it-1",
    title: "Founder Meeting",
    description: "Meet NAMOU's Founder in person",
    icon: "user",
  },
  {
    id: "it-2",
    title: "Contractor Meeting",
    description: "Meet on-site to confirm build readiness.",
    icon: "hard-hat",
  },
  {
    id: "it-3",
    title: "Al Marjan Island Site Visit",
    description: "Private guided tour of the Al Marjan project.",
    icon: "map-pin",
  },
  {
    id: "it-4",
    title: "Senior COC Member Meeting",
    description: "Discuss Compliance and regulatory clearance.",
    icon: "briefcase",
  },
  {
    id: "it-5",
    title: "Meet a member of RAK Municipality",
    description: "Verify local zoning and government protocols.",
    icon: "building",
  },
  {
    id: "it-6",
    title: "Meet the Master Plan Developer",
    description: "Deep dive into the comprehensive project blueprint.",
    icon: "layout",
  },
];

/* ── Helper to format numbers ── */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatAED(n: number): string {
  return `AED ${n.toLocaleString("en-US")}`;
}

/* ── Land categories (Jad: bundle by TYPE not area) ── */
export const landCategories: LandCategoryInfo[] = [
  {
    slug: "residential",
    label: "Residential",
    description: "High-density and villa residential plots across RAK's prime districts.",
    plotCount: plots.filter((p) => p.category === "residential").length,
  },
  {
    slug: "commercial",
    label: "Commercial",
    description: "Hospitality, convention, and retail-zoned plots with strong ROI potential.",
    plotCount: plots.filter((p) => p.category === "commercial").length,
  },
  {
    slug: "industrial",
    label: "Industrial",
    description: "Logistically connected industrial plots near ports and free zones.",
    plotCount: plots.filter((p) => p.category === "industrial").length,
  },
  {
    slug: "mixed-use",
    label: "Mixed-use",
    description: "Combined residential, retail, and hospitality zoning for versatile development.",
    plotCount: plots.filter((p) => p.category === "mixed-use").length,
  },
];

/* ── ROI calculation helper ── */
export function calculateROI(inputs: ROIInputs, gfa: number): ROIOutputs {
  const { constructionCostPerSqFt, salePricePerSqFt, netSellableAreaPct, targetProfitMarginPct } = inputs;
  const nsa = gfa * (netSellableAreaPct / 100);
  const totalDevelopmentValue = nsa * salePricePerSqFt;
  const totalConstructionCost = gfa * constructionCostPerSqFt;
  const profit = totalDevelopmentValue - totalConstructionCost;
  const roi = totalConstructionCost > 0 ? (profit / totalConstructionCost) * 100 : 0;
  const maximumLandPrice = totalDevelopmentValue - totalConstructionCost - totalDevelopmentValue * (targetProfitMarginPct / 100);
  const gfaPrice = gfa > 0 ? maximumLandPrice / gfa : 0;

  return {
    roi: Math.round(roi * 100) / 100,
    totalDevelopmentValue: Math.round(totalDevelopmentValue),
    maximumLandPrice: Math.round(Math.max(0, maximumLandPrice)),
    gfaPrice: Math.round(Math.max(0, gfaPrice) * 100) / 100,
  };
}

/* ── Example deal defaults (RAK Central, Jad: $800/sqft construction) ── */
export const exampleDealDefaults: ROIInputs = {
  constructionCostPerSqFt: 800,
  salePricePerSqFt: 1500,
  netSellableAreaPct: 75,
  targetProfitMarginPct: 20,
};

export const exampleDealGFA = 2_000_000; // sq ft — RAK Central tower

// ── Apply a Plot[] override to the in-memory data (plots, areas, category counts) ──
function applyPlotsOverride(parsed: Plot[]): void {
  plots.length = 0;
  plots.push(...parsed);
  // Rebuild areas from actual plot data
  const plotAreas = [...new Set(parsed.map((p) => p.area).filter(Boolean))];
  areas.length = 0;
  areas.push(...plotAreas);
  // Update category counts
  for (const cat of landCategories) {
    cat.plotCount = plots.filter((p) => p.category === cat.slug).length;
  }
}

function restoreDefaults(): void {
  plots.length = 0;
  plots.push(...JSON.parse(JSON.stringify(ORIGINAL_PLOTS)));
  areas.length = 0;
  areas.push(...ORIGINAL_AREAS);
  for (const cat of landCategories) {
    cat.plotCount = plots.filter((p) => p.category === cat.slug).length;
  }
}

/** Derive plots from the spreadsheet rows source of truth, or fall back to
 *  the pre-computed plots cache, or defaults.  Always re-runs coordsFromUrl()
 *  so any parsing improvements apply retroactively. */
function loadOverride(): Plot[] | null {
  if (typeof window === "undefined") return null;
  // Server-injected data (shared across all devices/browsers)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serverRows = (window as any).__NAMOU_SERVER_DATA__;
    if (serverRows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__NAMOU_SERVER_DATA__;
      if (Array.isArray(serverRows) && serverRows.length > 0) {
        saveSpreadsheetRows(serverRows);
        return spreadsheetRowsToPlots(serverRows);
      }
    }
  } catch { /* ignore */ }
  // Primary: derive fresh from spreadsheet rows (source of truth)
  try {
    const rows = loadSpreadsheetRows();
    if (rows && rows.length > 0) return spreadsheetRowsToPlots(rows);
  } catch { /* ignore */ }
  // Fallback: pre-computed Plot[] cache (backward compat)
  try {
    const stored = localStorage.getItem("namou_plots_override");
    if (stored) {
      const parsed: Plot[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

/** Re-read localStorage and update the in-memory plots/areas/categories.
 *  Call after saving or clearing the plots override from /backend. */
export function reloadPlotsFromStorage(): void {
  const override = loadOverride();
  if (override) { applyPlotsOverride(override); return; }
  restoreDefaults();
}

// ── Client-side: apply localStorage overrides if present ──────────────────────
{
  const override = loadOverride();
  if (override) applyPlotsOverride(override);
}
