"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ContentCard from "@/components/ContentCard";
import { plots, areas, landCategories, plotDealAvailability, type Plot, formatNumber } from "@/data/mock";

const PlotMap = dynamic(() => import("@/components/PlotMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-mint-white">
      <div className="w-7 h-7 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
      <p className="text-xs text-muted mt-3 tracking-wide">Loading map…</p>
    </div>
  ),
});

function areaSlug(area: string) {
  return area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const typeToLandUse: Record<string, string[]> = {
  residential: ["Residential"],
  commercial:  ["Commercial", "Hospitality"],
  "mixed-use": ["Mixed", "Residential / Commercial", "Commercial / Residential"],
  industrial:  ["Industrial"],
};

const SIZE_OPTIONS = [
  { label: "All Sizes", value: "" },
  { label: "10–50k sq ft", value: "10000-50000" },
  { label: "50–100k sq ft", value: "50000-100000" },
  { label: "100–200k sq ft", value: "100000-200000" },
  { label: "200k+ sq ft", value: "200000-" },
];

const PRICE_OPTIONS = [
  { label: "All Prices", value: "" },
  { label: "AED 15–25M", value: "15000000-25000000" },
  { label: "AED 25–50M", value: "25000000-50000000" },
  { label: "AED 50–100M", value: "50000000-100000000" },
  { label: "AED 100M+", value: "100000000-" },
];

function matchesRange(value: number, range: string): boolean {
  if (!range) return true;
  const parts = range.split("-");
  const min = parts[0] ? Number(parts[0]) : null;
  const max = parts[1] ? Number(parts[1]) : null;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

function filterLabel(value: string, options: { label: string; value: string }[]): string {
  return options.find(o => o.value === value)?.label ?? "";
}

export default function MasterPlanPage() {
  return (
    <React.Suspense fallback={<div className="flex flex-col flex-1 animate-fade-in" />}>
      <MasterPlanContent />
    </React.Suspense>
  );
}

function MasterPlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCtxType = searchParams.get("type");
  const urlCtxArea = searchParams.get("area");

  // Fall back to sessionStorage context set during onboarding when URL params are absent.
  // Read live (not cached in useState) so clearing via ✕ takes effect on re-render.
  let storedType: string | null = null;
  let storedArea: string | null = null;
  try { storedType = sessionStorage.getItem("ctx_type"); } catch {}
  try { storedArea = sessionStorage.getItem("ctx_area"); } catch {}

  const ctxType = urlCtxType ?? storedType;
  const ctxArea = urlCtxArea ?? storedArea;

  const areaName = ctxArea ? (areas.find(a => areaSlug(a) === ctxArea) ?? null) : null;
  const typeLabel = ctxType ? (landCategories.find(c => c.slug === ctxType)?.label ?? ctxType) : null;

  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlots, setComparePlots] = useState<Plot[]>([]);

  // ── Land filters (persisted in sessionStorage, set from /home or edited here) ──
  const [sizeFilter, setSizeFilter] = useState(() => {
    try { return sessionStorage.getItem("filter_size") ?? ""; } catch { return ""; }
  });
  const [priceFilter, setPriceFilter] = useState(() => {
    try { return sessionStorage.getItem("filter_price") ?? ""; } catch { return ""; }
  });
  const [dealTypeFilter, setDealTypeFilter] = useState("");
  const [editingFilter, setEditingFilter] = useState<"type" | "area" | "size" | "price" | "dealType" | null>(null);
  const filterPopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (sizeFilter) sessionStorage.setItem("filter_size", sizeFilter); else sessionStorage.removeItem("filter_size");
      if (priceFilter) sessionStorage.setItem("filter_price", priceFilter); else sessionStorage.removeItem("filter_price");
    } catch { /* SSR safety */ }
  }, [sizeFilter, priceFilter]);

  // Close filter popover on outside click
  useEffect(() => {
    if (!editingFilter) return;
    function handleClick(e: MouseEvent) {
      if (filterPopRef.current && !filterPopRef.current.contains(e.target as Node)) setEditingFilter(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editingFilter]);

  function handleSelectPlot(plot: Plot) {
    if (compareMode) {
      setComparePlots(prev => {
        const exists = prev.find(p => p.id === plot.id);
        let next: Plot[];
        if (exists) next = prev.filter(p => p.id !== plot.id);
        else if (prev.length >= 2) next = prev;
        else next = [...prev, plot];
        sessionStorage.setItem("compare_plots", JSON.stringify(next));
        return next;
      });
    } else {
      setSelectedPlot(plot);
      sessionStorage.setItem("selected_plot", JSON.stringify(plot));
      window.dispatchEvent(new Event("plot-selected"));
    }
  }

  function toggleCompareMode() {
    if (compareMode) {
      setComparePlots([]);
      setCompareMode(false);
      sessionStorage.removeItem("compare_plots");
    } else {
      setSelectedPlot(null);
      setCompareMode(true);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSelectedPlot(null); setComparePlots([]); }, [ctxType, ctxArea]);

  // Derive deal-type options from backend data
  const dealTypeOptions = React.useMemo(() => {
    const unique = [...new Set(plots.map(p => (p.jv ?? "").trim()).filter(Boolean))].sort();
    return [{ label: "All Deal Types", value: "" }, ...unique.map(v => ({ label: v, value: v }))];
  }, []);

  const filteredPlots = plots.filter((p) => {
    const matchesType = !ctxType || !typeToLandUse[ctxType]?.length
      || typeToLandUse[ctxType].some(f => p.landUse.includes(f));
    const matchesArea = !areaName || p.area === areaName;
    const matchesSize = matchesRange(p.plotArea, sizeFilter);
    const matchesPrice = matchesRange(p.askingPrice, priceFilter);
    const matchesDealType = !dealTypeFilter || (p.jv ?? "").trim() === dealTypeFilter;
    return matchesType && matchesArea && matchesSize && matchesPrice && matchesDealType;
  });

  const showPanel = selectedPlot && !compareMode;
  const showCompare = compareMode && comparePlots.length > 0;

  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 relative z-10">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">Master Plan Overview</h1>
          <p className="text-sm text-muted mt-0.5">
            Zoning, access, and land distribution within Al Marjan.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type dropdown */}
          <div className="relative" ref={editingFilter === "type" ? filterPopRef : undefined}>
            <button
              onClick={() => setEditingFilter(editingFilter === "type" ? null : "type")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                ctxType
                  ? "text-forest bg-forest/10 border border-forest/20 hover:bg-forest/20"
                  : "text-muted bg-white/80 border border-mint-light hover:border-forest/30 hover:text-forest"
              }`}
            >
              {typeLabel ?? "Type"}
              {ctxType && <span className="ml-1" onClick={(e) => { e.stopPropagation(); router.push("/master-plan" + (ctxArea ? `?area=${encodeURIComponent(ctxArea)}` : "")); sessionStorage.removeItem("ctx_type"); setEditingFilter(null); }}>✕</span>}
            </button>
            {editingFilter === "type" && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-mint-light rounded-xl p-3 shadow-lg z-[900]">
                <select
                  value={ctxType ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      sessionStorage.setItem("ctx_type", val);
                      router.push(`/master-plan?type=${encodeURIComponent(val)}${ctxArea ? `&area=${encodeURIComponent(ctxArea)}` : ""}`);
                    } else {
                      sessionStorage.removeItem("ctx_type");
                      router.push("/master-plan" + (ctxArea ? `?area=${encodeURIComponent(ctxArea)}` : ""));
                    }
                    setEditingFilter(null);
                  }}
                  className="w-full border border-mint-light rounded-lg px-3 py-2 text-sm text-deep-forest"
                >
                  <option value="">All Types</option>
                  {landCategories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </div>
            )}
          </div>
          {/* Area dropdown */}
          <div className="relative" ref={editingFilter === "area" ? filterPopRef : undefined}>
            <button
              onClick={() => setEditingFilter(editingFilter === "area" ? null : "area")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                areaName
                  ? "text-forest bg-forest/10 border border-forest/20 hover:bg-forest/20"
                  : "text-muted bg-white/80 border border-mint-light hover:border-forest/30 hover:text-forest"
              }`}
            >
              {areaName ?? "Area"}
              {ctxArea && <span className="ml-1" onClick={(e) => { e.stopPropagation(); router.push("/master-plan" + (ctxType ? `?type=${encodeURIComponent(ctxType)}` : "")); sessionStorage.removeItem("ctx_area"); setEditingFilter(null); }}>✕</span>}
            </button>
            {editingFilter === "area" && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-mint-light rounded-xl p-3 shadow-lg z-[900]">
                <select
                  value={ctxArea ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      sessionStorage.setItem("ctx_area", val);
                      router.push(`/master-plan?${ctxType ? `type=${encodeURIComponent(ctxType)}&` : ""}area=${encodeURIComponent(val)}`);
                    } else {
                      sessionStorage.removeItem("ctx_area");
                      router.push("/master-plan" + (ctxType ? `?type=${encodeURIComponent(ctxType)}` : ""));
                    }
                    setEditingFilter(null);
                  }}
                  className="w-full border border-mint-light rounded-lg px-3 py-2 text-sm text-deep-forest"
                >
                  <option value="">All Areas</option>
                  {(() => {
                    const relevantPlots = ctxType && typeToLandUse[ctxType]?.length
                      ? plots.filter(p => typeToLandUse[ctxType!].some(f => p.landUse.includes(f)))
                      : plots;
                    const uniqueAreas = [...new Set(relevantPlots.map(p => p.area))].sort();
                    return uniqueAreas.map(a => <option key={a} value={areaSlug(a)}>{a}</option>);
                  })()}
                </select>
              </div>
            )}
          </div>
          {/* Size filter button */}
          <div className="relative" ref={editingFilter === "size" ? filterPopRef : undefined}>
            <button
              onClick={() => setEditingFilter(editingFilter === "size" ? null : "size")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                sizeFilter
                  ? "text-forest bg-forest/10 border border-forest/20 hover:bg-forest/20"
                  : "text-muted bg-white/80 border border-mint-light hover:border-forest/30 hover:text-forest"
              }`}
            >
              {sizeFilter ? filterLabel(sizeFilter, SIZE_OPTIONS) : "Size"}
              {sizeFilter && <span className="ml-1" onClick={(e) => { e.stopPropagation(); setSizeFilter(""); setEditingFilter(null); }}>✕</span>}
            </button>
            {editingFilter === "size" && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-mint-light rounded-xl p-3 shadow-lg z-[900]">
                <select
                  value={sizeFilter}
                  onChange={(e) => { setSizeFilter(e.target.value); setEditingFilter(null); }}
                  className="w-full border border-mint-light rounded-lg px-3 py-2 text-sm text-deep-forest"
                >
                  {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
          {/* Budget filter button */}
          <div className="relative" ref={editingFilter === "price" ? filterPopRef : undefined}>
            <button
              onClick={() => setEditingFilter(editingFilter === "price" ? null : "price")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                priceFilter
                  ? "text-forest bg-forest/10 border border-forest/20 hover:bg-forest/20"
                  : "text-muted bg-white/80 border border-mint-light hover:border-forest/30 hover:text-forest"
              }`}
            >
              {priceFilter ? filterLabel(priceFilter, PRICE_OPTIONS) : "Budget"}
              {priceFilter && <span className="ml-1" onClick={(e) => { e.stopPropagation(); setPriceFilter(""); setEditingFilter(null); }}>✕</span>}
            </button>
            {editingFilter === "price" && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-mint-light rounded-xl p-3 shadow-lg z-[900]">
                <select
                  value={priceFilter}
                  onChange={(e) => { setPriceFilter(e.target.value); setEditingFilter(null); }}
                  className="w-full border border-mint-light rounded-lg px-3 py-2 text-sm text-deep-forest"
                >
                  {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
          {/* Deal Type filter button */}
          <div className="relative" ref={editingFilter === "dealType" ? filterPopRef : undefined}>
            <button
              onClick={() => setEditingFilter(editingFilter === "dealType" ? null : "dealType")}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                dealTypeFilter
                  ? "text-forest bg-forest/10 border border-forest/20 hover:bg-forest/20"
                  : "text-muted bg-white/80 border border-mint-light hover:border-forest/30 hover:text-forest"
              }`}
            >
              {dealTypeFilter || "Deal Type"}
              {dealTypeFilter && <span className="ml-1" onClick={(e) => { e.stopPropagation(); setDealTypeFilter(""); setEditingFilter(null); }}>✕</span>}
            </button>
            {editingFilter === "dealType" && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-mint-light rounded-xl p-3 shadow-lg z-[900]">
                <select
                  value={dealTypeFilter}
                  onChange={(e) => { setDealTypeFilter(e.target.value); setEditingFilter(null); }}
                  className="w-full border border-mint-light rounded-lg px-3 py-2 text-sm text-deep-forest"
                >
                  {dealTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {selectedPlot && !compareMode && (
            <>
              <span className="text-sm font-semibold text-forest bg-forest/10 border border-forest/20 px-3 py-1.5 rounded-full">
                {selectedPlot.name}
              </span>
              <button
                onClick={() => {
                  const initial = [selectedPlot];
                  sessionStorage.setItem("compare_plots", JSON.stringify(initial));
                  setComparePlots(initial);
                  setSelectedPlot(null);
                  setCompareMode(true);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-forest/30 text-forest bg-white hover:border-forest hover:bg-mint-bg transition-colors"
              >
                Compare Plots
              </button>
            </>
          )}
          {compareMode && (
            <button
              onClick={toggleCompareMode}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-forest text-white border-forest"
            >
              Exit Compare
            </button>
          )}
        </div>
      </div>

      {/* Compare hint */}
      {compareMode && comparePlots.length === 0 && (
        <div className="shrink-0 text-sm text-muted bg-mint-bg/50 rounded-xl px-4 py-2.5 border border-mint-light/40">
          Click up to 2 plots on the map to compare them side by side.
        </div>
      )}

      {/* Map + detail — horizontal on desktop, stacked on mobile */}
      <div className="flex flex-col md:flex-row flex-1 gap-3 min-h-0">

        {/* Map */}
        <div className={`relative z-0 bg-mint-white rounded-2xl overflow-hidden border border-mint-light/40 shadow-sm min-h-[250px] md:min-h-0 ${showPanel || showCompare ? "md:w-1/2" : "flex-1"}`}>

          {/* Satellite map — fills the container */}
          <PlotMap
            plots={filteredPlots}
            selectedPlot={selectedPlot}
            comparePlots={comparePlots}
            compareMode={compareMode}
            onSelectPlot={handleSelectPlot}
          />

          {/* Available Plots panel — top-left overlay; click to select + zoom */}
          {filteredPlots.length > 0 && (
            <div className="absolute top-3 left-3 z-[800] max-w-[calc(100%-24px)] sm:max-w-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-mint-light/40 shadow-sm overflow-hidden">
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold text-center">
                    {compareMode ? `Select Plots (${comparePlots.length}/2)` : "Available Plots"}
                  </p>
                </div>
                <div className="flex flex-col divide-y divide-mint-light/40 max-h-[160px] sm:max-h-[260px] overflow-y-auto">
                  {filteredPlots.map(plot => {
                    const isSelected = selectedPlot?.id === plot.id;
                    const isCompared = comparePlots.some(p => p.id === plot.id);
                    const active = isSelected || isCompared;
                    return (
                      <button
                        key={plot.id}
                        onClick={() => handleSelectPlot(plot)}
                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                          active ? "bg-forest" : "bg-transparent hover:bg-mint-bg"
                        }`}
                      >
                        <p className={`text-xs font-semibold ${active ? "text-white" : "text-deep-forest"}`}>
                          {plot.name}
                        </p>
                        <p className={`text-[11px] font-heading mt-0.5 ${active ? "text-white/70" : "text-muted"}`}>
                          {formatNumber(plot.plotArea)} sqft
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Area summary stats — bottom-right on mobile, top-right on sm+, always visible, context-aware */}
          {(() => {
            const summaryPlots = filteredPlots;
            return (
              <div className="absolute bottom-3 right-3 sm:bottom-auto sm:top-3 z-[800] bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-xs text-deep-forest shadow-sm min-w-[180px] sm:min-w-[220px]">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 text-center">Area Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted shrink-0">Plots Available</span>
                    <span className="font-bold text-forest whitespace-nowrap">{summaryPlots.length}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted shrink-0">Avg. Price/sqft</span>
                    <span className="font-bold text-deep-forest whitespace-nowrap">AED {formatNumber(Math.round(summaryPlots.reduce((s, p) => s + p.pricePerSqFt, 0) / (summaryPlots.length || 1)))}</span>
                  </div>
                  {summaryPlots.length > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted shrink-0">Price Range</span>
                      <span className="font-bold text-deep-forest whitespace-nowrap">AED {formatNumber(Math.min(...summaryPlots.map(p => p.pricePerSqFt)))}–{formatNumber(Math.max(...summaryPlots.map(p => p.pricePerSqFt)))}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Plot detail panel — horizontal split */}
        {showPanel && (
          <PlotDetailPanel plot={selectedPlot} onClose={() => setSelectedPlot(null)} dealAvailability={plotDealAvailability(selectedPlot)} />
        )}

        {/* Comparison table — right side */}
        {showCompare && (
          <ComparisonTable plots={comparePlots} onRemove={(id) => setComparePlots(prev => {
            const next = prev.filter(p => p.id !== id);
            sessionStorage.setItem("compare_plots", JSON.stringify(next));
            return next;
          })} />
        )}
      </div>
    </div>
  );
}

function ComparisonTable({ plots: cPlots, onRemove }: { plots: Plot[]; onRemove: (id: string) => void }) {
  const router = useRouter();
  const rows: { label: string; getValue: (p: Plot) => string; highlight?: boolean; section?: string }[] = [
    { label: "Land Use", getValue: (p) => p.landUse, section: "Details" },
    { label: "Plot Type", getValue: (p) => p.plotType },
    { label: "Plot Area", getValue: (p) => `${formatNumber(p.plotArea)} sqft` },
    { label: "GFA", getValue: (p) => p.gfa ? `${formatNumber(p.gfa)} sqft` : "—" },
    { label: "FAR", getValue: (p) => p.far ? p.far.toString() : "—" },
    { label: "Zoning", getValue: (p) => p.zoning || "—" },
    { label: "Asking Price", getValue: (p) => `AED ${formatNumber(p.askingPrice)}`, highlight: true, section: "Pricing" },
    { label: "Price / sqft", getValue: (p) => `AED ${formatNumber(p.pricePerSqFt)}` },
    { label: "Max Height", getValue: (p) => p.maxHeight || "—", section: "Location & Access" },
    { label: "Location", getValue: (p) => p.location },
    { label: "Airport ETA", getValue: (p) => p.airportEta },
    { label: "Casino ETA", getValue: (p) => p.casinoEta },
  ];

  const lowestPrice = Math.min(...cPlots.map(p => p.askingPrice));
  const lowestPriceSqft = Math.min(...cPlots.map(p => p.pricePerSqFt));

  function handleCompareROI() {
    sessionStorage.setItem("compare_plots", JSON.stringify(cPlots));
    // Set the first plot as selected for ROI, store both for comparison
    sessionStorage.setItem("selected_plot", JSON.stringify(cPlots[0]));
    router.push("/roi");
  }

  return (
    <div className="md:w-1/2 flex flex-col min-h-0">
    <ContentCard className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-deep-forest font-heading">Plot Comparison</p>
          <span className="text-[11px] font-medium font-heading text-muted bg-mint-bg border border-mint-light/60 px-2 py-0.5 rounded-full">
            {cPlots.length}/2 selected
          </span>
        </div>
      </div>

      {/* Column headers — plot cards */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `110px repeat(${cPlots.length}, 1fr)` }}>
        <div />
        {cPlots.map(p => (
          <div key={p.id} className="bg-mint-bg/50 rounded-xl p-3 border border-mint-light/40">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-forest">{p.name}</p>
                <p className="text-[11px] text-muted mt-0.5">{p.area}</p>
              </div>
              <button onClick={() => onRemove(p.id)} className="text-muted hover:text-red-500 transition-colors p-0.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-lg font-bold text-forest font-heading mt-1">AED {formatNumber(p.askingPrice)}</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {p.askingPrice === lowestPrice && cPlots.length > 1 && (
                <span className="text-[10px] font-semibold text-forest bg-forest/10 px-1.5 py-0.5 rounded">Best Price</span>
              )}
              {p.pricePerSqFt === lowestPriceSqft && cPlots.length > 1 && (
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Best /sqft</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Data rows */}
      <div className="grid gap-0 flex-1" style={{ gridTemplateColumns: `110px repeat(${cPlots.length}, 1fr)` }}>
        {rows.map((row, ri) => (
          <React.Fragment key={row.label}>
            {row.section && (
              <div className={`col-span-full text-[11px] uppercase tracking-widest text-muted font-semibold ${ri > 0 ? "mt-2 pt-2 border-t border-mint-light/40" : ""} pb-1`}>
                {row.section}
              </div>
            )}
            <div className="py-1 text-xs text-muted flex items-center">{row.label}</div>
            {cPlots.map(p => (
              <div key={p.id} className={`py-1 px-3 text-sm font-bold ${row.highlight ? "text-forest" : "text-deep-forest"}`}>
                {row.getValue(p)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* CTA — Compare ROI for both plots */}
      {cPlots.length === 2 && (
        <div className="mt-2 pt-2 border-t border-mint-light/60 shrink-0">
          <button
            onClick={handleCompareROI}
            className="w-full px-4 py-3 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-deep-forest transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            Compare ROI for Both Plots
          </button>
        </div>
      )}
    </ContentCard>
    </div>
  );
}

/** Extract Google Drive file ID from various sharing URL formats */
function extractDriveId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view?...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) return fileMatch[1];
  // https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return openMatch[1];
  // https://drive.google.com/uc?id=FILE_ID&...
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (ucMatch) return ucMatch[1];
  return null;
}

/** Convert Google Drive sharing URLs to direct renderable image URLs */
function driveToDirectUrl(url: string): string {
  const id = extractDriveId(url);
  if (id) return `https://lh3.googleusercontent.com/d/${id}=s1600`;
  return url;
}

const FALLBACK_LABELS = ["Satellite Close", "Satellite Wide", "Satellite Detail", "Area Context"];

const VIDEO_EXTS = /\.(mp4|webm|ogg|mov)(\?|$)/i;
const VIDEO_HOSTS = /youtube\.com|youtu\.be|vimeo\.com/i;

function isVideoUrl(url: string): boolean {
  if (VIDEO_EXTS.test(url)) return true;
  if (VIDEO_HOSTS.test(url)) return true;
  if (url.startsWith("data:video/")) return true;
  return false;
}

/** Convert YouTube/Vimeo URLs to embeddable URLs */
function toEmbedUrl(url: string): string | null {
  // YouTube: youtube.com/watch?v=ID or youtu.be/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo: vimeo.com/ID
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return null;
}

function buildGallerySlots(plot: Plot) {
  const imgs = [plot.galleryImage1, plot.galleryImage2, plot.galleryImage3, plot.galleryImage4];
  const lat = plot.lat;
  const lng = plot.lng;
  const hasCoords = lat != null && lng != null;

  const fallbackSrcs = hasCoords
    ? [
        `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=18&output=embed`,
        `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=14&output=embed`,
        `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=16&output=embed`,
        `https://maps.google.com/maps?q=${lat},${lng}&t=h&z=13&output=embed`,
      ]
    : [null, null, null, null];

  return imgs.map((raw, i) => {
    const src = raw?.trim();
    if (src) {
      if (isVideoUrl(src)) {
        const embed = toEmbedUrl(src);
        if (embed) {
          // YouTube/Vimeo → iframe embed
          return { label: `Video ${i + 1}`, imgSrc: null, videoSrc: null, iframeSrc: embed };
        }
        // Direct video file / data URL
        return { label: `Video ${i + 1}`, imgSrc: null, videoSrc: src, iframeSrc: null };
      }
      return { label: `Image ${i + 1}`, imgSrc: driveToDirectUrl(src), videoSrc: null, iframeSrc: null };
    }
    return { label: FALLBACK_LABELS[i], imgSrc: null, videoSrc: null, iframeSrc: fallbackSrcs[i] };
  });
}

function PlotDetailPanel({ plot, onClose, dealAvailability }: { plot: Plot; onClose: () => void; dealAvailability: { showRoi: boolean; showJv: boolean } }) {
  const [openSection, setOpenSection] = useState<string>("land-info");
  const [lightbox, setLightbox] = useState<number | null>(null);
  function toggle(key: string) {
    setOpenSection(prev => (prev === key ? "" : key));
  }

  const gallerySlots = buildGallerySlots(plot);

  return (
    <div className="md:w-1/2 flex flex-col min-h-0">
      <ContentCard className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col min-h-0">
        {/* Header — plot name */}
        <div className="flex items-start justify-between mb-2 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-forest font-heading">{plot.name}</h2>
            <p className="text-xs text-muted mt-0.5">{plot.area}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-forest transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Land Info — collapsible */}
        <div className="shrink-0">
          <AccordionSection
            title="Land Info"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
            isOpen={openSection === "land-info"}
            onToggle={() => toggle("land-info")}
          >
            <div className="divide-y divide-mint-light/60">
              <PlotRow label="Land Use" value={plot.landUse} />
              <PlotRow label="Plot Type" value={plot.plotType} />
              <PlotRow label="Plot Area" value={`${formatNumber(plot.plotArea)} sq ft`} />
              <PlotRow label="Asking Price" value={`AED ${formatNumber(plot.askingPrice)}`} highlight />
              <PlotRow label="Price / sq ft" value={`AED ${formatNumber(plot.pricePerSqFt)}`} />
              {plot.gfa && <PlotRow label="GFA" value={`${formatNumber(plot.gfa)} sq ft`} />}
              {plot.far && <PlotRow label="FAR" value={plot.far.toString()} />}
              {plot.maxHeight && <PlotRow label="Max Height" value={plot.maxHeight} />}
              {plot.zoning && <PlotRow label="Zoning" value={plot.zoning} />}
              {plot.infrastructure && <PlotRow label="Infrastructure" value={plot.infrastructure} />}
              {plot.dimensions && (
                <PlotRow label="Dimensions" value={`${plot.dimensions.width} × ${plot.dimensions.depth} ft`} />
              )}
            </div>
          </AccordionSection>
        </div>

        {/* Land Gallery — accordion, mutually exclusive with Land Info */}
        <div className="flex-1 flex flex-col min-h-0 mt-1">
          <AccordionSection
            title="Land Gallery"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>}
            isOpen={openSection === "gallery"}
            onToggle={() => toggle("gallery")}
          >
          <div className="grid grid-cols-2 grid-rows-2 gap-1.5">
            {gallerySlots.map((slot, i) => (
              <button
                key={i}
                onClick={() => setLightbox(i)}
                className="aspect-[4/3] rounded-lg overflow-hidden border border-mint-light/40 hover:border-forest/30 transition-colors cursor-pointer relative group"
              >
                {slot.imgSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slot.imgSrc} alt={slot.label} className="w-full h-full object-contain bg-mint-bg" />
                ) : slot.videoSrc ? (
                  <video src={slot.videoSrc} muted playsInline className="w-full h-full object-contain bg-black" />
                ) : slot.iframeSrc ? (
                  <iframe
                    src={slot.iframeSrc}
                    className="w-full h-full border-0 pointer-events-none"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={slot.label}
                  />
                ) : (
                  <div className="w-full h-full bg-mint-bg flex items-center justify-center">
                    <span className="text-[10px] text-muted">{slot.label}</span>
                  </div>
                )}
                {/* Hover overlay with label */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-medium text-white">{slot.label}</p>
                </div>
              </button>
            ))}
          </div>
          </AccordionSection>
        </div>

        {/* CTAs — based on selected plot's Deal Type */}
        <div className={`mt-2 pt-2 border-t border-mint-light/60 shrink-0 flex gap-2 ${dealAvailability.showRoi && dealAvailability.showJv ? "flex-row" : "flex-col"}`}>
          {dealAvailability.showRoi && (
            <Link
              href="/roi"
              className="block w-full text-center px-4 py-2.5 border border-forest text-forest rounded-xl font-semibold text-sm hover:bg-mint-bg transition-colors"
            >
              Analyze ROI
            </Link>
          )}
          {dealAvailability.showJv && (
            <Link
              href="/JV"
              className="block w-full text-center px-4 py-2.5 border border-forest text-forest rounded-xl font-semibold text-sm hover:bg-mint-bg transition-colors"
            >
              Joint-Venture Opportunities
            </Link>
          )}
        </div>
      </ContentCard>

      {/* Lightbox */}
      {lightbox !== null && (() => {
        const slot = gallerySlots[lightbox];
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setLightbox(null)}>
            <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              {slot?.imgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.imgSrc} alt={slot.label} className="w-full h-full max-h-[90vh] object-contain bg-black" />
              ) : slot?.videoSrc ? (
                <video src={slot.videoSrc} controls autoPlay className="w-full max-h-[90vh] object-contain bg-black" />
              ) : slot?.iframeSrc ? (
                <iframe
                  src={slot.iframeSrc}
                  className="w-full border-0 bg-white"
                  style={{ height: "80vh" }}
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title={slot.label}
                />
              ) : null}
              {/* Navigation */}
              {lightbox > 0 && (
                <button onClick={() => setLightbox(lightbox - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
                </button>
              )}
              {lightbox < gallerySlots.length - 1 && (
                <button onClick={() => setLightbox(lightbox + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              )}
              {/* Label */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-5 py-3">
                <p className="text-sm font-medium text-white">{slot?.label} — {plot.name}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AccordionSection({
  title, icon, isOpen, onToggle, children,
}: {
  title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border transition-colors ${isOpen ? "border-forest/20 bg-mint-bg/30" : "border-mint-light/40 bg-white"}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className={`transition-colors ${isOpen ? "text-forest" : "text-muted"}`}>{icon}</span>
          <span className={`text-sm font-semibold transition-colors ${isOpen ? "text-forest" : "text-deep-forest"}`}>{title}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180 text-forest" : "text-muted"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function PlotRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <p className="text-xs text-muted shrink-0">{label}</p>
      <p className={`text-sm font-bold text-right ${highlight ? "text-forest" : "text-deep-forest"}`}>{value}</p>
    </div>
  );
}
