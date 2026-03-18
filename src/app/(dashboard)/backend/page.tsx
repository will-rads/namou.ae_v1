"use client";

import { useState, useEffect, useCallback } from "react";
import ContentCard from "@/components/ContentCard";
import {
  plots,
  landCategories,
  ORIGINAL_PLOTS,
  areas,
  type Plot,
  type LandCategory,
} from "@/data/mock";
import { savePlots, clearPlots } from "@/data/plotsStore";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `plot-${Date.now().toString(36)}`;
}

function newPlot(): Plot {
  return {
    id: generateId(),
    name: "New Plot",
    area: areas[0],
    category: "residential",
    plotArea: 0,
    askingPrice: 0,
    pricePerSqFt: 0,
    landUse: "Residential",
    location: "",
    plotType: "Single",
    airportEta: "",
    casinoEta: "",
  };
}

const CATEGORY_OPTIONS: LandCategory[] = [
  "residential",
  "commercial",
  "industrial",
  "mixed-use",
];

// ── Column definitions ───────────────────────────────────────────────────────

interface Col {
  key: keyof Plot;
  label: string;
  type: "text" | "number" | "select-area" | "select-category";
  width: string;
  step?: number;
  optional?: boolean;
}

const COLUMNS: Col[] = [
  { key: "name", label: "Name", type: "text", width: "min-w-[200px]" },
  { key: "area", label: "Area", type: "select-area", width: "min-w-[240px]" },
  { key: "category", label: "Category", type: "select-category", width: "min-w-[140px]" },
  { key: "plotArea", label: "Plot Area (sqft)", type: "number", width: "min-w-[140px]" },
  { key: "askingPrice", label: "Asking Price (AED)", type: "number", width: "min-w-[160px]" },
  { key: "pricePerSqFt", label: "Price/sqft", type: "number", width: "min-w-[120px]" },
  { key: "landUse", label: "Land Use", type: "text", width: "min-w-[260px]" },
  { key: "location", label: "Location", type: "text", width: "min-w-[320px]" },
  { key: "plotType", label: "Plot Type", type: "text", width: "min-w-[110px]" },
  { key: "airportEta", label: "Airport ETA", type: "text", width: "min-w-[110px]" },
  { key: "casinoEta", label: "Casino ETA", type: "text", width: "min-w-[110px]" },
  { key: "maxHeight", label: "Max Height", type: "text", width: "min-w-[120px]", optional: true },
  { key: "far", label: "FAR", type: "number", width: "min-w-[80px]", step: 0.01, optional: true },
  { key: "gfa", label: "GFA", type: "number", width: "min-w-[120px]", optional: true },
  { key: "zoning", label: "Zoning", type: "text", width: "min-w-[260px]", optional: true },
  { key: "infrastructure", label: "Infrastructure", type: "text", width: "min-w-[200px]", optional: true },
  { key: "paymentPlan", label: "Payment Plan", type: "text", width: "min-w-[380px]", optional: true },
  { key: "googleMapsUrl", label: "Google Maps Location", type: "text", width: "min-w-[340px]", optional: true },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BackendPage() {
  const [editablePlots, setEditablePlots] = useState<Plot[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setEditablePlots(JSON.parse(JSON.stringify(plots)));
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // ── Field update ──

  function updateField(index: number, field: keyof Plot, raw: string) {
    setEditablePlots((prev) => {
      const next = [...prev];
      const col = COLUMNS.find((c) => c.key === field);
      let value: string | number | undefined;

      if (col?.type === "number") {
        if (raw === "") {
          value = col.optional ? undefined : 0;
        } else {
          value = parseFloat(raw);
          if (isNaN(value as number)) value = col.optional ? undefined : 0;
        }
      } else {
        value = raw === "" && col?.optional ? undefined : raw;
      }

      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setIsDirty(true);
  }

  // ── Row operations ──

  function addRow() {
    setEditablePlots((prev) => [...prev, newPlot()]);
    setIsDirty(true);
    // Scroll to bottom after render
    setTimeout(() => {
      const el = document.getElementById("backend-table-end");
      el?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function removeRow(index: number) {
    const plot = editablePlots[index];
    if (!window.confirm(`Remove "${plot.name}"? This cannot be undone.`)) return;
    setEditablePlots((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  // ── Apply changes ──

  function applyChanges() {
    // Save to localStorage
    savePlots(editablePlots);

    // Mutate the module-level plots array in-place
    plots.length = 0;
    plots.push(...editablePlots);

    // Recompute landCategories plotCounts
    for (const cat of landCategories) {
      cat.plotCount = plots.filter((p) => p.category === cat.slug).length;
    }

    setIsDirty(false);
    showToast("Changes saved. Other pages will reflect the updates.", "success");
  }

  // ── Reset to default ──

  function resetToDefault() {
    if (!window.confirm("Reset all plots to the original default data? This will discard all your edits.")) return;

    clearPlots();

    const original: Plot[] = JSON.parse(JSON.stringify(ORIGINAL_PLOTS));
    setEditablePlots(original);

    plots.length = 0;
    plots.push(...original);

    for (const cat of landCategories) {
      cat.plotCount = plots.filter((p) => p.category === cat.slug).length;
    }

    setIsDirty(false);
    showToast("Data reset to defaults.", "success");
  }

  // ── Cell renderer ──

  function renderCell(plot: Plot, index: number, col: Col) {
    const val = plot[col.key];
    const strVal = val === undefined || val === null ? "" : String(val);

    const inputCls =
      "w-full px-3 py-1.5 rounded-lg border border-mint-light/60 bg-white text-sm text-deep-forest focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none transition-colors";

    if (col.type === "select-area") {
      return (
        <select
          value={strVal}
          onChange={(e) => updateField(index, col.key, e.target.value)}
          className={inputCls}
        >
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "select-category") {
      return (
        <select
          value={strVal}
          onChange={(e) => updateField(index, col.key, e.target.value)}
          className={inputCls}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === "number") {
      return (
        <input
          type="number"
          step={col.step ?? 1}
          value={strVal}
          onChange={(e) => updateField(index, col.key, e.target.value)}
          className={inputCls + " text-right"}
          placeholder={col.optional ? "—" : "0"}
        />
      );
    }

    return (
      <input
        type="text"
        value={strVal}
        onChange={(e) => updateField(index, col.key, e.target.value)}
        className={inputCls}
        placeholder={col.optional ? "—" : ""}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
            Backend Admin
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Manage land plot data. Edits are saved to browser storage and reflected across the app.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="bg-mint-bg border border-mint-light/60 px-2.5 py-1 rounded-full font-medium">
            {editablePlots.length} plots
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
            <thead className="sticky top-0 z-10">
              <tr className="bg-mint-bg border-b border-mint-light/60">
                <th className="px-2 py-2 text-left text-[10px] uppercase tracking-widest text-muted font-semibold min-w-[44px] sticky left-0 bg-mint-bg z-20">
                  #
                </th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted font-semibold min-w-[180px]">
                  ID
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 text-left text-[10px] uppercase tracking-widest text-muted font-semibold ${col.width}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[10px] uppercase tracking-widest text-muted font-semibold min-w-[44px]" />
              </tr>
            </thead>
            <tbody>
              {editablePlots.map((plot, i) => (
                <tr
                  key={plot.id + "-" + i}
                  className="border-b border-mint-light/30 hover:bg-mint-bg/20 transition-colors"
                >
                  {/* Row number */}
                  <td className="px-2 py-1.5 text-xs text-muted font-mono sticky left-0 bg-white/90 backdrop-blur-sm z-10">
                    {i + 1}
                  </td>
                  {/* ID (read-only) */}
                  <td className="px-3 py-1.5">
                    <span className="text-xs text-muted font-mono whitespace-nowrap" title={plot.id}>
                      {plot.id}
                    </span>
                  </td>
                  {/* Editable columns */}
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-2 py-1.5">
                      {renderCell(plot, i, col)}
                    </td>
                  ))}
                  {/* Delete button */}
                  <td className="px-2 py-1.5 text-center">
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
          <div id="backend-table-end" />
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

      {/* Footer bar — Apply + Reset */}
      <div className="flex items-center justify-end gap-3 shrink-0 py-1">
        <button
          onClick={resetToDefault}
          className="px-5 py-2 bg-white border border-mint-light text-deep-forest rounded-xl font-medium text-sm hover:bg-mint-bg transition-colors"
        >
          Reset to Default
        </button>
        <button
          onClick={applyChanges}
          disabled={!isDirty}
          className="px-6 py-2.5 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-deep-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply Changes
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
