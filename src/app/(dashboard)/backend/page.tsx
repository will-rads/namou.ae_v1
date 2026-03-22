"use client";

import { useState, useEffect, useCallback } from "react";
import ContentCard from "@/components/ContentCard";
import {
  SPREADSHEET_COLUMNS,
  ORIGINAL_SPREADSHEET_ROWS,
  newSpreadsheetRow,
  saveSpreadsheetRows,
  loadSpreadsheetRows,
  clearSpreadsheetRows,
  spreadsheetRowsToPlots,
  type SpreadsheetRow,
} from "@/data/spreadsheetData";
import { savePlots, clearPlots } from "@/data/plotsStore";
import { reloadPlotsFromStorage } from "@/data/mock";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BackendPage() {
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const stored = loadSpreadsheetRows();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration (SSR-safe)
      setRows(stored);
    } else {
      setRows(JSON.parse(JSON.stringify(ORIGINAL_SPREADSHEET_ROWS)));
    }
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // ── Field update ──

  function updateField(index: number, key: string, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
    setIsDirty(true);
  }

  // ── Row operations ──

  function addRow() {
    setRows((prev) => [...prev, newSpreadsheetRow()]);
    setIsDirty(true);
    setTimeout(() => {
      const el = document.getElementById("backend-table-end");
      el?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function removeRow(index: number) {
    const row = rows[index];
    const name = row.plotName || `Row ${index + 1}`;
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  // ── Apply changes ──

  function applyChanges() {
    saveSpreadsheetRows(rows);
    savePlots(spreadsheetRowsToPlots(rows));
    reloadPlotsFromStorage();
    setIsDirty(false);
    showToast("Changes saved and published to website.", "success");
  }

  // ── Reset to default ──

  function resetToDefault() {
    if (!window.confirm("Reset all data to the original spreadsheet? This will discard all your edits.")) return;
    clearSpreadsheetRows();
    clearPlots();
    reloadPlotsFromStorage();
    const original: SpreadsheetRow[] = JSON.parse(JSON.stringify(ORIGINAL_SPREADSHEET_ROWS));
    setRows(original);
    setIsDirty(false);
    showToast("Data reset to defaults.", "success");
  }

  // ── Cell renderer ──

  const inputCls =
    "w-full px-2 py-1.5 rounded-lg border border-mint-light/60 bg-white text-sm text-deep-forest focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none transition-colors";

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
            Backend Admin
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Full spreadsheet data. Edits are saved to browser storage.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="bg-mint-bg border border-mint-light/60 px-2.5 py-1 rounded-full font-medium">
            {rows.length} rows &middot; {SPREADSHEET_COLUMNS.length} columns
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
                {SPREADSHEET_COLUMNS.map((col) => (
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
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-mint-light/30 hover:bg-mint-bg/20 transition-colors"
                >
                  {/* Row number */}
                  <td className="px-2 py-1.5 text-xs text-muted font-mono sticky left-0 bg-white/90 backdrop-blur-sm z-10">
                    {i + 1}
                  </td>
                  {/* Editable columns */}
                  {SPREADSHEET_COLUMNS.map((col) => (
                    <td key={col.key} className="px-2 py-1.5">
                      {col.key === "jv" ? (
                        <select
                          value={row[col.key] ?? ""}
                          onChange={(e) => updateField(i, col.key, e.target.value)}
                          className={inputCls}
                          title={row[col.key] ?? ""}
                        >
                          <option value="">—</option>
                          <option value="JV Only">JV Only</option>
                          <option value="Sale Only">Sale Only</option>
                          <option value="Sale + JV">Sale + JV</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={row[col.key] ?? ""}
                          onChange={(e) => updateField(i, col.key, e.target.value)}
                          className={inputCls}
                          title={row[col.key] ?? ""}
                        />
                      )}
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

        {/* Bottom bar — Add Row + Apply/Reset */}
        <div className="border-t border-mint-light/40 px-4 py-2 shrink-0 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
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
        </div>
      </ContentCard>

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
