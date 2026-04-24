"use client";

import { useState, useEffect, useCallback } from "react";
import ContentCard from "@/components/ContentCard";

// ── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "namou_database_rows";

// ── Column definitions ───────────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  group: string;
  width: string;
}

const COLUMNS: Column[] = [
  // Land identity / basic info
  { key: "id", label: "ID", group: "Land Identity", width: "min-w-[80px]" },
  { key: "plotName", label: "Plot Name", group: "Land Identity", width: "min-w-[180px]" },
  { key: "areaDistrict", label: "Area / District", group: "Land Identity", width: "min-w-[160px]" },
  { key: "category", label: "Category", group: "Land Identity", width: "min-w-[130px]" },
  { key: "landUse", label: "Land Use", group: "Land Identity", width: "min-w-[140px]" },
  { key: "plotType", label: "Plot Type", group: "Land Identity", width: "min-w-[110px]" },
  { key: "plotArea", label: "Plot Area (sqft)", group: "Land Identity", width: "min-w-[130px]" },
  { key: "gfa", label: "GFA", group: "Land Identity", width: "min-w-[100px]" },
  { key: "far", label: "FAR", group: "Land Identity", width: "min-w-[80px]" },
  { key: "maxHeight", label: "Max Height", group: "Land Identity", width: "min-w-[110px]" },
  { key: "infrastructure", label: "Infrastructure", group: "Land Identity", width: "min-w-[180px]" },
  { key: "zoning", label: "Zoning", group: "Land Identity", width: "min-w-[160px]" },
  { key: "location", label: "Location", group: "Land Identity", width: "min-w-[200px]" },
  { key: "googleMapsLocation", label: "Google Maps Location", group: "Land Identity", width: "min-w-[280px]" },

  // Pricing / commercial info
  { key: "askingPrice", label: "Asking Price (AED)", group: "Pricing", width: "min-w-[150px]" },
  { key: "priceSqft", label: "Price / sqft", group: "Pricing", width: "min-w-[110px]" },
  { key: "roiBasePrice", label: "ROI Base Price", group: "Pricing", width: "min-w-[130px]" },
  { key: "roiConservativePrice", label: "ROI Conservative Price", group: "Pricing", width: "min-w-[160px]" },
  { key: "roiOptimisticPrice", label: "ROI Optimistic Price", group: "Pricing", width: "min-w-[160px]" },

  // Payment plan info
  { key: "paymentPlanName", label: "Payment Plan Name", group: "Payment Plan", width: "min-w-[180px]" },
  { key: "numStages", label: "Number of Stages", group: "Payment Plan", width: "min-w-[130px]" },
  { key: "stage1Pct", label: "Stage 1 %", group: "Payment Plan", width: "min-w-[100px]" },
  { key: "stage1Timing", label: "Stage 1 Timing", group: "Payment Plan", width: "min-w-[140px]" },
  { key: "stage2Pct", label: "Stage 2 %", group: "Payment Plan", width: "min-w-[100px]" },
  { key: "stage2Timing", label: "Stage 2 Timing", group: "Payment Plan", width: "min-w-[140px]" },
  { key: "stage3Pct", label: "Stage 3 %", group: "Payment Plan", width: "min-w-[100px]" },
  { key: "stage3Timing", label: "Stage 3 Timing", group: "Payment Plan", width: "min-w-[140px]" },
  { key: "stage4Pct", label: "Stage 4 %", group: "Payment Plan", width: "min-w-[100px]" },
  { key: "stage4Timing", label: "Stage 4 Timing", group: "Payment Plan", width: "min-w-[140px]" },
  { key: "paymentNotes", label: "Notes", group: "Payment Plan", width: "min-w-[200px]" },

  // Access / surroundings / convenience info
  { key: "airportEta", label: "Airport ETA", group: "Access & Surroundings", width: "min-w-[110px]" },
  { key: "casinoEta", label: "Casino ETA", group: "Access & Surroundings", width: "min-w-[110px]" },
  { key: "mallEta", label: "Mall ETA", group: "Access & Surroundings", width: "min-w-[110px]" },
  { key: "beachDistance", label: "Beach / Waterfront Distance", group: "Access & Surroundings", width: "min-w-[200px]" },
  { key: "nearbyLandmarks", label: "Nearby Landmarks", group: "Access & Surroundings", width: "min-w-[200px]" },
  { key: "specialistNotes", label: "Specialist Notes", group: "Access & Surroundings", width: "min-w-[200px]" },

  // Media / content info
  { key: "image1", label: "Image 1", group: "Media", width: "min-w-[200px]" },
  { key: "image2", label: "Image 2", group: "Media", width: "min-w-[200px]" },
  { key: "image3", label: "Image 3", group: "Media", width: "min-w-[200px]" },
  { key: "image4", label: "Image 4", group: "Media", width: "min-w-[200px]" },
  { key: "brochureLink", label: "Brochure Link", group: "Media", width: "min-w-[200px]" },
  { key: "galleryNotes", label: "Gallery Notes", group: "Media", width: "min-w-[200px]" },

  // Agreement / admin reference info
  { key: "brokerFormRequired", label: "Broker Form Required", group: "Admin", width: "min-w-[160px]" },
  { key: "investorFormRequired", label: "Investor Form Required", group: "Admin", width: "min-w-[170px]" },
  { key: "agentToAgentRequired", label: "Agent to Agent Required", group: "Admin", width: "min-w-[170px]" },
  { key: "status", label: "Status", group: "Admin", width: "min-w-[120px]" },
  { key: "internalNotes", label: "Internal Notes", group: "Admin", width: "min-w-[240px]" },
];

// ── Row type ─────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

function createEmptyRow(): Row {
  const row: Row = {};
  for (const col of COLUMNS) {
    row[col.key] = "";
  }
  return row;
}

// ── Compute group header spans ───────────────────────────────────────────────

interface GroupSpan {
  group: string;
  colSpan: number;
}

function getGroupSpans(): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;
  for (const col of COLUMNS) {
    if (current && current.group === col.group) {
      current.colSpan++;
    } else {
      current = { group: col.group, colSpan: 1 };
      spans.push(current);
    }
  }
  return spans;
}

const GROUP_SPANS = getGroupSpans();

const GROUP_COLORS: Record<string, string> = {
  "Land Identity": "bg-emerald-50 text-emerald-800",
  "Pricing": "bg-blue-50 text-blue-800",
  "Payment Plan": "bg-violet-50 text-violet-800",
  "Access & Surroundings": "bg-amber-50 text-amber-800",
  "Media": "bg-pink-50 text-pink-800",
  "Admin": "bg-slate-100 text-slate-700",
};

// ── Page component ───────────────────────────────────────────────────────────

export default function DatabasePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration (SSR-safe)
          setRows(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    // Default: 5 empty rows
    setRows(Array.from({ length: 5 }, () => createEmptyRow()));
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // ── Cell update ──

  function updateCell(rowIndex: number, colKey: string, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [colKey]: value };
      return next;
    });
    setIsDirty(true);
  }

  // ── Row operations ──

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
    setIsDirty(true);
    setTimeout(() => {
      const el = document.getElementById("database-table-end");
      el?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function removeRow(index: number) {
    if (!window.confirm(`Remove row ${index + 1}? This cannot be undone.`)) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  // ── Save ──

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      setIsDirty(false);
      showToast("Database saved to browser storage.", "success");
    } catch {
      showToast("Failed to save data.", "error");
    }
  }

  // ── Clear all ──

  function clearAll() {
    if (!window.confirm("Clear all rows and reset to empty? This cannot be undone.")) return;
    const empty = Array.from({ length: 5 }, () => createEmptyRow());
    setRows(empty);
    localStorage.removeItem(STORAGE_KEY);
    setIsDirty(false);
    showToast("All data cleared.", "success");
  }

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
            Database
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Reference spreadsheet for land and deal information. Edits are saved to browser storage.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="bg-mint-bg border border-mint-light/60 px-2.5 py-1 rounded-full font-medium">
            {rows.length} rows
          </span>
          {isDirty && (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <ContentCard className="flex-1 min-h-0 overflow-hidden flex flex-col !p-0">
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse text-sm">
            {/* Group header row */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-white border-b border-mint-light/40">
                {/* Row # column */}
                <th
                  rowSpan={2}
                  className="px-2 py-1.5 text-center text-[10px] uppercase tracking-widest text-muted font-semibold min-w-[44px] sticky left-0 bg-white z-20 border-r border-mint-light/30"
                >
                  #
                </th>
                {GROUP_SPANS.map((gs) => (
                  <th
                    key={gs.group}
                    colSpan={gs.colSpan}
                    className={`px-2 py-1.5 text-center text-[10px] uppercase tracking-wider font-semibold border-r border-mint-light/30 last:border-r-0 ${GROUP_COLORS[gs.group] ?? "bg-gray-50 text-gray-600"}`}
                  >
                    {gs.group}
                  </th>
                ))}
                {/* Actions column */}
                <th
                  rowSpan={2}
                  className="px-2 py-1.5 text-center text-[10px] uppercase tracking-widest text-muted font-semibold min-w-[44px] bg-white border-l border-mint-light/30"
                />
              </tr>
              {/* Column header row */}
              <tr className="bg-mint-bg border-b border-mint-light/60">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 text-left text-[10px] uppercase tracking-widest text-muted font-semibold ${col.width}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-mint-light/30 hover:bg-mint-bg/20 transition-colors"
                >
                  {/* Row number */}
                  <td className="px-2 py-1 text-xs text-muted font-mono text-center sticky left-0 bg-white/90 backdrop-blur-sm z-10 border-r border-mint-light/20">
                    {i + 1}
                  </td>
                  {/* Editable cells */}
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-1.5 py-1">
                      <input
                        type="text"
                        value={row[col.key] ?? ""}
                        onChange={(e) => updateCell(i, col.key, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-transparent bg-transparent text-sm text-deep-forest hover:border-mint-light/60 focus:border-forest/40 focus:bg-white focus:ring-1 focus:ring-forest/10 outline-none transition-colors"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  {/* Delete button */}
                  <td className="px-2 py-1 text-center border-l border-mint-light/20">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-muted hover:text-red-500 transition-colors p-1"
                      title="Remove row"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div id="database-table-end" />
        </div>

        {/* Add row button */}
        <div className="border-t border-mint-light/40 px-4 py-2 shrink-0">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-forest/30 text-forest rounded-xl text-sm font-medium hover:bg-mint-bg/50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Row
          </button>
        </div>
      </ContentCard>

      {/* Footer bar — Save + Clear */}
      <div className="flex items-center justify-end gap-3 shrink-0 py-1">
        <button
          onClick={clearAll}
          className="px-5 py-2 bg-white border border-mint-light text-deep-forest rounded-xl font-medium text-sm hover:bg-mint-bg transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={saveData}
          disabled={!isDirty}
          className="px-6 py-2.5 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-deep-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ── Toast component ──────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
        type === "success" ? "bg-forest text-white" : "bg-red-600 text-white"
      }`}
    >
      {message}
    </div>
  );
}
