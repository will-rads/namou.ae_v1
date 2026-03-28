"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ContentCard from "@/components/ContentCard";
import type { Plot } from "@/data/mock";



// ── Types ────────────────────────────────────────────────────────────────────

interface PlotInfo {
  name: string;
  plotSize: number;
  landValue: number;
  location: string;
  zoning: string;
  dealType: string;
  far: number;
}

interface Inputs {
  plotSize: number;
  landValue: number;
  farRatio: number;
  efficiency: number;
  constructionPerGFA: number;
  softCostPct: number;
  sellingPricePerNSA: number;
  landOwnerSplit: number;
  investorCashTopUp: number;
}

type DisplayInputs = {
  plotSize: number;
  landValue: number;
  farRatio: number;
  efficiency: number | "";
  constructionPerGFA: number | "";
  softCostPct: number | "";
  sellingPricePerNSA: number | "";
  landOwnerSplit: number | "";
  investorCashTopUp: number | "";
};

const DEFAULTS: DisplayInputs = {
  plotSize: 50_000,
  landValue: 25_000_000,
  farRatio: 3.0,
  efficiency: "",
  constructionPerGFA: "",
  softCostPct: "",
  sellingPricePerNSA: "",
  landOwnerSplit: "",
  investorCashTopUp: "",
};

// ── Session + backend helpers ────────────────────────────────────────────────

function loadPlotFromSession(): { plot: Plot | null; plotInfo: PlotInfo | null; inputs: Partial<DisplayInputs> } {
  if (typeof window === "undefined") return { plot: null, plotInfo: null, inputs: {} };
  try {
    const stored = sessionStorage.getItem("selected_plot");
    if (!stored) return { plot: null, plotInfo: null, inputs: {} };
    const plot: Plot = JSON.parse(stored);

    const dealType = plot.jv || "—";

    const far = plot.far ?? (plot.gfa && plot.plotArea ? plot.gfa / plot.plotArea : DEFAULTS.farRatio);

    const plotInfo: PlotInfo = {
      name: plot.name,
      plotSize: plot.plotArea,
      landValue: plot.askingPrice,
      location: plot.location || plot.area || "Ras Al Khaimah",
      zoning: plot.zoning || "—",
      dealType,
      far,
    };

    const inputs: Partial<DisplayInputs> = {
      plotSize: plot.plotArea,
      landValue: plot.askingPrice,
      farRatio: parseFloat(far.toFixed(2)),
    };

    return { plot, plotInfo, inputs };
  } catch {
    return { plot: null, plotInfo: null, inputs: {} };
  }
}

// ── Calculations ─────────────────────────────────────────────────────────────

function compute(inp: Inputs) {
  const gfa = inp.plotSize * inp.farRatio;
  const nsa = gfa * (inp.efficiency / 100);
  const constructionCost = gfa * inp.constructionPerGFA * (1 + inp.softCostPct / 100);
  const totalCost = inp.landValue + constructionCost + inp.investorCashTopUp;
  const gdv = nsa * inp.sellingPricePerNSA;
  const netProfit = gdv - totalCost;

  const landOwnerContribution = inp.landValue;
  const investorContribution = constructionCost + inp.investorCashTopUp;

  const landOwnerProfit = netProfit * (inp.landOwnerSplit / 100);
  const investorProfit = netProfit * ((100 - inp.landOwnerSplit) / 100);

  const landOwnerTotal = landOwnerContribution + landOwnerProfit;
  const investorTotal = investorContribution + investorProfit;

  const landOwnerROI = landOwnerContribution > 0 ? (landOwnerProfit / landOwnerContribution) * 100 : 0;
  const investorROI = investorContribution > 0 ? (investorProfit / investorContribution) * 100 : 0;

  const sellTodayProceeds = inp.landValue;
  const jvLandOwnerProceeds = landOwnerContribution + landOwnerProfit;
  const jvUplift = jvLandOwnerProceeds - sellTodayProceeds;
  const jvUpliftPct = sellTodayProceeds > 0 ? (jvUplift / sellTodayProceeds) * 100 : 0;

  return {
    gfa, nsa, constructionCost, totalCost, gdv, netProfit,
    landOwnerContribution, investorContribution,
    landOwnerProfit, investorProfit,
    landOwnerTotal, investorTotal,
    landOwnerROI, investorROI,
    sellTodayProceeds, jvLandOwnerProceeds, jvUplift, jvUpliftPct,
  };
}

function resolveInputs(d: DisplayInputs): Inputs {
  return {
    plotSize: d.plotSize,
    landValue: d.landValue,
    farRatio: d.farRatio,
    efficiency: typeof d.efficiency === "number" ? d.efficiency : 0,
    constructionPerGFA: typeof d.constructionPerGFA === "number" ? d.constructionPerGFA : 0,
    softCostPct: typeof d.softCostPct === "number" ? d.softCostPct : 0,
    sellingPricePerNSA: typeof d.sellingPricePerNSA === "number" ? d.sellingPricePerNSA : 0,
    landOwnerSplit: typeof d.landOwnerSplit === "number" ? d.landOwnerSplit : 0,
    investorCashTopUp: typeof d.investorCashTopUp === "number" ? d.investorCashTopUp : 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtAED(n: number) { return `AED ${fmt(n)}`; }

function formatNumber(n: number) { return n.toLocaleString("en-US"); }

function InputRow({ label, value, unit, onChange, placeholder }: { label: string; value: number | ""; unit: string; onChange: (v: number | "") => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const display = value === "" ? "" : focused ? String(value) : value.toLocaleString("en-US");
  return (
    <div className="flex items-center justify-between py-1.5 lg:py-1">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted w-8 text-right">{unit === "x" ? "×" : unit}</span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => {
            const raw = e.target.value.replace(/,/g, "");
            if (raw === "") { onChange(""); return; }
            const v = Number(raw); if (!isNaN(v)) onChange(v);
          }}
          className="w-36 text-right text-sm font-semibold text-deep-forest bg-mint-white/60 border border-mint-light/60 rounded-lg px-2 py-1 focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none"
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-deep-forest">{value}</span>
    </div>
  );
}

function KPI({ label, value, sub, primary, className, ready = true }: { label: string; value: string; sub?: string; primary?: boolean; className?: string; ready?: boolean }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col ${primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"} ${className ?? ""} transition-opacity ${ready ? "opacity-100" : "opacity-50"}`}>
      <span className="text-[11px] text-muted uppercase tracking-wider">{label}</span>
      {ready ? (
        <>
          <span className={`text-lg font-bold mt-0.5 ${primary ? "text-forest" : "text-deep-forest"}`}>{value}</span>
          {sub && <span className="text-[11px] text-muted font-heading mt-0.5">{sub}</span>}
        </>
      ) : (
        <span className="text-lg font-bold mt-0.5 text-muted/30">—</span>
      )}
    </div>
  );
}

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <ContentCard className={className}>
      <h2 className="text-xs uppercase tracking-widest text-muted font-semibold text-center">{title}</h2>
      <div className="mt-2 flex-1">{children}</div>
    </ContentCard>
  );
}

// ── Session & Nav ────────────────────────────────────────────────────────────

const SESSION_KEY = "jv_build_sell_state";
const SHARED_SESSION_KEY = "jv_shared_inputs";
const SHARED_KEYS = ["efficiency", "constructionPerGFA", "softCostPct", "occupancy", "operatingCostPct", "landOwnerSplit"] as const;
const JV_MODELS = [
  { label: "Build & Sell", href: "/JV/build-sell" },
  { label: "Build & Lease", href: "/JV/build-lease" },
  { label: "Build & Hotel", href: "/JV/build-hotel" },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildSellPage() {
  const pathname = usePathname();
  const [plotInfo, setPlotInfo] = useState<PlotInfo | null>(null);
  const [inputs, setInputs] = useState<DisplayInputs>(DEFAULTS);
  const resolved = useMemo(() => resolveInputs(inputs), [inputs]);
  const r = useMemo(() => compute(resolved), [resolved]);

  const [splitOverridden, setSplitOverridden] = useState(false);
  const contributionSplit = useMemo(() => {
    if (typeof inputs.constructionPerGFA !== "number" || inputs.constructionPerGFA <= 0) return null;
    if (typeof inputs.efficiency !== "number" || inputs.efficiency <= 0) return null;
    if (typeof inputs.softCostPct !== "number") return null;
    const gfa = inputs.plotSize * inputs.farRatio;
    const constructionCost = gfa * inputs.constructionPerGFA * (1 + inputs.softCostPct / 100);
    const cashTopUp = typeof inputs.investorCashTopUp === "number" ? inputs.investorCashTopUp : 0;
    const investorContrib = constructionCost + cashTopUp;
    const total = inputs.landValue + investorContrib;
    return total > 0 ? Math.round((inputs.landValue / total) * 100) : null;
  }, [inputs.plotSize, inputs.farRatio, inputs.landValue, inputs.constructionPerGFA, inputs.softCostPct, inputs.efficiency, inputs.investorCashTopUp]);

  useEffect(() => {
    let base: DisplayInputs = { ...DEFAULTS };
    let overridden = false;
    // 1. Apply shared fields from other simulators
    try {
      const shared = JSON.parse(sessionStorage.getItem(SHARED_SESSION_KEY) || "{}");
      for (const key of SHARED_KEYS) {
        if (key in base && key in shared && shared[key] !== "" && shared[key] !== undefined) {
          (base as Record<string, unknown>)[key] = shared[key];
        }
      }
    } catch {}
    // 2. Apply own session state (higher priority)
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { inputs: restored, splitOverridden: so } = JSON.parse(stored);
        if (restored) base = { ...base, ...restored };
        if (so) overridden = true;
      }
    } catch {}
    // 3. Apply plot data (highest for plot-derived fields)
    const { plotInfo: info, inputs: plotInputs } = loadPlotFromSession();
    if (info) {
      setPlotInfo(info);
      base = { ...base, ...plotInputs };
    }
    setInputs(base);
    if (overridden) setSplitOverridden(true);
  }, []);

  // Persist inputs to own session + shared fields for cross-simulator carry-over
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ inputs, splitOverridden })); } catch {}
    try {
      const shared = JSON.parse(sessionStorage.getItem(SHARED_SESSION_KEY) || "{}");
      for (const key of SHARED_KEYS) {
        if (key in inputs) {
          shared[key] = (inputs as Record<string, unknown>)[key];
        }
      }
      sessionStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(shared));
    } catch {}
  }, [inputs, splitOverridden]);

  // Auto-fill split from contribution ratio (unless user overrode)
  useEffect(() => {
    if (splitOverridden || contributionSplit === null) return;
    setInputs(prev => prev.landOwnerSplit === contributionSplit ? prev : { ...prev, landOwnerSplit: contributionSplit });
  }, [contributionSplit, splitOverridden]);

  function update<K extends keyof DisplayInputs>(key: K, value: DisplayInputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  // Readiness flags
  const hasConstruction = typeof inputs.efficiency === "number" && inputs.efficiency > 0
    && typeof inputs.constructionPerGFA === "number" && inputs.constructionPerGFA > 0
    && typeof inputs.softCostPct === "number";
  const hasSales = typeof inputs.sellingPricePerNSA === "number" && inputs.sellingPricePerNSA > 0;
  const hasJVSplit = typeof inputs.landOwnerSplit === "number";
  const isGFAReady = typeof inputs.efficiency === "number" && inputs.efficiency > 0;
  const isCostReady = hasConstruction;
  const isGDVReady = hasSales && isGFAReady;
  const isProfitReady = isCostReady && isGDVReady;
  const isSplitReady = isProfitReady && hasJVSplit;

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">Joint-Venture Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Sell</span>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Sell Model</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {JV_MODELS.map(m => (
              <Link key={m.href} href={m.href} className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === m.href ? "bg-forest text-white shadow-sm" : "bg-white border border-mint-light text-muted hover:border-forest/30 hover:text-forest"}`}>
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile key results snapshot */}
      <div className="md:hidden shrink-0">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
            <p className="text-[10px] text-muted uppercase tracking-wider">Total Cost</p>
            <p className="text-sm font-bold text-deep-forest">{isCostReady ? fmtAED(r.totalCost) : "—"}</p>
          </div>
          <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
            <p className="text-[10px] text-muted uppercase tracking-wider">GDV</p>
            <p className="text-sm font-bold text-deep-forest">{isGDVReady ? fmtAED(r.gdv) : "—"}</p>
          </div>
          <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
            <p className="text-[10px] text-muted uppercase tracking-wider">Net Profit</p>
            <p className="text-sm font-bold text-forest">{isProfitReady ? fmtAED(r.netProfit) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Two-column, two-row grid — rows align across columns */}
      <div className="flex flex-col md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] gap-2 flex-1 min-h-0">

        {/* TOP-LEFT: Green card */}
        <div className="bg-forest/[0.04] backdrop-blur-sm rounded-2xl shadow-sm border border-forest/15 p-4 md:p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span className="text-base font-bold text-forest">{plotInfo?.name ?? "—"}</span>
          </div>
          <div className="bg-white/60 rounded-lg px-4 py-3 border border-mint-light/30">
            <InfoRow label="Plot Size" value={`${formatNumber(inputs.plotSize)} sqft`} />
            <InfoRow label="Land Value" value={fmtAED(inputs.landValue)} />
            <InfoRow label="FAR" value={plotInfo?.far?.toFixed(2) ?? "—"} />
            <InfoRow label="Location" value={plotInfo?.location ?? "—"} />
            <InfoRow label="Zoning" value={plotInfo?.zoning ?? "—"} />
            <InfoRow label="Deal Type" value={plotInfo?.dealType ?? "—"} />
          </div>
          <p className="text-[10px] text-muted mt-3">Pre-filled from selected plot. Simulation inputs are editable.</p>
        </div>

        {/* TOP-RIGHT: Simulation Inputs */}
        <ContentCard className="flex flex-col">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1 text-center">
            Simulation Inputs
          </h2>
          <div className="flex flex-col divide-y divide-mint-light/40">
            {/* Row 1: Construction */}
            <div className="pb-2">
              <p className="text-sm font-semibold text-deep-forest pb-1">Construction</p>
              <InputRow label="Efficiency (NSA/GFA)" value={inputs.efficiency} unit="%" onChange={v => update("efficiency", v)} placeholder="e.g. 80" />
              <InputRow label="Cost / GFA sqft" value={inputs.constructionPerGFA} unit="AED" onChange={v => update("constructionPerGFA", v)} placeholder="e.g. 900" />
              <InputRow label="Soft Cost" value={inputs.softCostPct} unit="%" onChange={v => update("softCostPct", v)} placeholder="e.g. 20" />
            </div>
            {/* Row 2: Sales */}
            <div className="py-2">
              <p className="text-sm font-semibold text-deep-forest pb-1">Sales</p>
              <InputRow label="Selling Price / NSA sqft" value={inputs.sellingPricePerNSA} unit="AED" onChange={v => update("sellingPricePerNSA", v)} placeholder="e.g. 3200" />
            </div>
            {/* Row 3: Joint-Venture Split */}
            <div className="pt-2">
              <p className="text-sm font-semibold text-deep-forest pb-1">Joint-Venture Split</p>
              <InputRow label="Landowner Profit Share" value={inputs.landOwnerSplit} unit="%" onChange={v => { setSplitOverridden(true); update("landOwnerSplit", v); }} placeholder="auto" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted">Investor Profit Share</span>
                <span className="text-sm font-semibold text-deep-forest">{typeof inputs.landOwnerSplit === "number" ? `${100 - inputs.landOwnerSplit}%` : "—"}</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* BOTTOM-LEFT: Project Summary */}
        <Section title="Project Summary" className="flex flex-col !pb-2 min-h-0">
          <div className="flex flex-col gap-2 flex-1">
            <div className="grid grid-cols-2 grid-rows-[1fr_1fr] gap-2 flex-1">
              <KPI label="GFA" value={`${formatNumber(Math.round(r.gfa))} sqft`} sub={`${formatNumber(inputs.plotSize)} sqft × ${inputs.farRatio} FAR`} className="items-center text-center justify-center" ready={isGFAReady} />
              <KPI label="NSA" value={`${formatNumber(Math.round(r.nsa))} sqft`} sub={`${formatNumber(Math.round(r.gfa))} GFA × ${resolved.efficiency}%`} className="items-center text-center justify-center" ready={isGFAReady} />
              <KPI label="Total Cost" value={fmtAED(r.totalCost)} sub={`Land ${fmtAED(r.landOwnerContribution)} + Constr. ${fmtAED(r.constructionCost)}`} className="items-center text-center justify-center" ready={isCostReady} />
              <KPI label="Total Sales (GDV)" value={fmtAED(r.gdv)} sub={`${formatNumber(Math.round(r.nsa))} sqft × AED ${formatNumber(resolved.sellingPricePerNSA)}`} className="items-center text-center justify-center" ready={isGDVReady} />
            </div>
            <KPI label="Net Profit" value={fmtAED(r.netProfit)} primary sub={`Margin ${r.gdv > 0 ? ((r.netProfit / r.gdv) * 100).toFixed(1) : 0}%`} className="items-center text-center py-4" ready={isProfitReady} />
          </div>
        </Section>

        {/* BOTTOM-RIGHT: Profit Split + Sell Today vs JV */}
        <div className="flex flex-col gap-1.5 min-h-0">
          {/* Profit Split */}
          <Section title="Profit Split">
            {isSplitReady ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl p-2.5 bg-forest/5 border border-forest/15">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Landowner ({resolved.landOwnerSplit}%)</span>
                  <p className="text-base font-bold text-forest mt-0.5">{fmtAED(r.landOwnerProfit)}</p>
                  <p className="text-[10px] text-muted font-heading mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                  <p className="text-[10px] text-muted font-heading">ROI: {r.landOwnerROI.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl p-2.5 bg-forest/5 border border-forest/15">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Investor ({100 - resolved.landOwnerSplit}%)</span>
                  <p className="text-base font-bold text-forest mt-0.5">{fmtAED(r.investorProfit)}</p>
                  <p className="text-[10px] text-muted font-heading mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                  <p className="text-[10px] text-muted font-heading">ROI: {r.investorROI.toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted/40 text-center py-4">Enter construction, sales, and JV split inputs to see profit breakdown</p>
            )}
          </Section>

          {/* Sell Land Today vs Joint-Venture */}
          <Section title="Sell Land Today vs Joint-Venture" className="flex flex-col flex-1">
            {isSplitReady ? (
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-xl p-2.5 bg-mint-white/80 border border-mint-light/40">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Sell Today</span>
                  <p className="text-base font-bold text-deep-forest mt-0.5">{fmtAED(r.sellTodayProceeds)}</p>
                  <p className="text-[10px] text-muted mt-0.5">Immediate cash</p>
                </div>
                <div className="rounded-xl p-2.5 bg-forest/5 border border-forest/15">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Joint-Venture</span>
                  <p className="text-base font-bold text-forest mt-0.5">{fmtAED(r.jvLandOwnerProceeds)}</p>
                  <p className="text-[10px] text-muted mt-0.5">Land + profit share</p>
                </div>
                <div className={`rounded-xl p-2.5 border ${r.jvUplift >= 0 ? "bg-forest/5 border-forest/15" : "bg-red-50 border-red-200"}`}>
                  <span className="text-[10px] text-muted uppercase tracking-wider">Uplift</span>
                  <p className={`text-base font-bold mt-0.5 ${r.jvUplift >= 0 ? "text-forest" : "text-red-600"}`}>
                    {r.jvUplift >= 0 ? "+" : ""}{fmtAED(r.jvUplift)}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {r.jvUpliftPct >= 0 ? "+" : ""}{r.jvUpliftPct.toFixed(1)}% vs sell
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted/40 text-center py-4">Enter all inputs to compare selling today vs joint-venture</p>
            )}
          </Section>
        </div>

      </div>
    </div>
  );
}
