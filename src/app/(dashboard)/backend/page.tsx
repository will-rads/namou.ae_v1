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
  coordsFromUrl,
  type SpreadsheetRow,
} from "@/data/spreadsheetData";
import { savePlots, clearPlots } from "@/data/plotsStore";
import { reloadPlotsFromStorage } from "@/data/mock";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BackendPage() {
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /** Fill blank/missing jv fields with "Sale Only". */
  function normalizeJv(src: SpreadsheetRow[]): SpreadsheetRow[] {
    return src.map(r => (r.jv ? r : { ...r, jv: "Sale Only" }));
  }

  useEffect(() => {
    // Always fetch from server API — persistent storage is the source of truth
    fetch("/api/spreadsheet")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(normalizeJv(data));
          // Update localStorage cache from server truth
          saveSpreadsheetRows(data);
        }
      })
      .catch(() => {
        // Network/server error — fall back to stale localStorage cache
        const stored = loadSpreadsheetRows();
        if (stored) setRows(normalizeJv(stored));
      })
      .finally(() => setLoading(false));
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
      if (el) {
        // Scroll only the table's own overflow container, not ancestor elements
        const scrollParent = el.closest(".overflow-auto");
        if (scrollParent) {
          scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: "smooth" });
        }
      }
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

  async function applyChanges() {
    setSaving(true);
    try {
      // Resolve any shortened Google Maps URLs that coordsFromUrl can't parse locally
      const resolved = normalizeJv(await resolveLocationPins(rows));
      // Save to server (persistent storage — source of truth)
      let serverOk = false;
      let serverDetail = "";
      try {
        const res = await fetch("/api/spreadsheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolved),
        });
        serverOk = res.ok;
        if (!serverOk) {
          try { const body = await res.json(); serverDetail = body.details || body.error || ""; } catch { /* ignore */ }
        }
      } catch { serverDetail = "Network error — is the server running?"; }
      if (!serverOk) {
        showToast(`Save failed: ${serverDetail || "unknown error"}`, "error");
        return;
      }
      // Server save succeeded — now update local cache
      saveSpreadsheetRows(resolved);
      savePlots(spreadsheetRowsToPlots(resolved));
      reloadPlotsFromStorage();
      setRows(resolved);
      setIsDirty(false);
      showToast("Changes saved and published to website.", "success");
    } finally {
      setSaving(false);
    }
  }

  /** For each row whose locationPin is a shortened maps URL that coordsFromUrl
   *  cannot resolve locally, call the server-side resolver to follow the
   *  redirect and replace the shortened URL with the full coordinate URL. */
  async function resolveLocationPins(src: SpreadsheetRow[]): Promise<SpreadsheetRow[]> {
    const out = [...src];
    for (let i = 0; i < out.length; i++) {
      const pin = out[i].locationPin;
      if (!pin || !pin.includes("maps.app.goo.gl")) continue;
      if (coordsFromUrl(pin)) continue; // already resolvable locally
      try {
        const res = await fetch("/api/resolve-maps-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: pin }),
        });
        if (res.ok) {
          const { fullUrl } = await res.json();
          if (fullUrl && typeof fullUrl === "string") {
            out[i] = { ...out[i], locationPin: fullUrl };
          }
        }
      } catch { /* keep original URL on failure */ }
    }
    return out;
  }

  // ── Reset to default ──

  async function resetToDefault() {
    if (!window.confirm("Reset all data to defaults? This will discard all your edits.")) return;
    setSaving(true);
    try {
      // Clear server-side override
      let deleteOk = false;
      let deleteDetail = "";
      try {
        const res = await fetch("/api/spreadsheet", { method: "DELETE" });
        deleteOk = res.ok;
        if (!deleteOk) {
          try { const body = await res.json(); deleteDetail = body.details || body.error || ""; } catch { /* ignore */ }
        }
      } catch { deleteDetail = "Network error — is the server running?"; }
      if (!deleteOk) {
        showToast(`Reset failed: ${deleteDetail || "unknown error"}`, "error");
        return;
      }
      // Server reset succeeded — clear local cache
      clearSpreadsheetRows();
      clearPlots();
      // Fetch the re-seeded initial data from server
      try {
        const res = await fetch("/api/spreadsheet");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            saveSpreadsheetRows(data);
            savePlots(spreadsheetRowsToPlots(data));
            reloadPlotsFromStorage();
            setRows(normalizeJv(data));
            setIsDirty(false);
            showToast("Data reset to defaults.", "success");
            return;
          }
        }
      } catch { /* fetch error */ }
      // Safety fallback
      reloadPlotsFromStorage();
      setRows(JSON.parse(JSON.stringify(ORIGINAL_SPREADSHEET_ROWS)));
      setIsDirty(false);
      showToast("Data reset to defaults.", "success");
    } finally {
      setSaving(false);
    }
  }

  // ── Cell renderer ──

  const inputCls =
    "w-full px-2 py-1.5 rounded-lg border border-mint-light/60 bg-white text-sm text-deep-forest focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none transition-colors";

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center animate-fade-in">
        <p className="text-sm text-muted">Loading backend data&hellip;</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">
            Backend Admin
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Manage land data. Changes are published to all devices on save.
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
                          <option value="Joint-venture Only">Joint-venture Only</option>
                          <option value="Sale Only">Sale Only</option>
                          <option value="Sale + Joint-venture">Sale + Joint-venture</option>
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
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-forest/30 text-forest rounded-xl text-sm font-medium hover:bg-mint-bg/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
              disabled={saving}
              className="px-5 py-2 bg-white border border-mint-light text-deep-forest rounded-xl font-medium text-sm hover:bg-mint-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset to Default
            </button>
            <button
              onClick={applyChanges}
              disabled={!isDirty || saving}
              className="px-6 py-2.5 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-deep-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving\u2026" : "Apply Changes"}
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
    const timer = setTimeout(onClose, type === "error" ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [onClose, type]);

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
