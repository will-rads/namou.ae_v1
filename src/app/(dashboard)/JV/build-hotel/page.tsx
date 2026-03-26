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
  // Development
  plotSize: number;
  landValue: number;
  constructionCostTotal: number;
  ffePlusPreOpening: number;

  // Hotel operations
  numberOfKeys: number;
  adr: number;
  occupancy: number;
  fbRevenueAnnual: number;

  // Operator fees
  baseFeeRevenuePct: number;
  incentiveFeeProfitPct: number;

  // Operating costs
  operatingCostPct: number;

  // JV structure
  landOwnerSplit: number;
}

type DisplayInputs = {
  plotSize: number;
  landValue: number;
  constructionCostTotal: number | "";
  ffePlusPreOpening: number | "";
  numberOfKeys: number | "";
  adr: number | "";
  occupancy: number | "";
  fbRevenueAnnual: number | "";
  baseFeeRevenuePct: number | "";
  incentiveFeeProfitPct: number | "";
  operatingCostPct: number | "";
  landOwnerSplit: number | "";
};

const DEFAULTS: DisplayInputs = {
  plotSize: 80_000,
  landValue: 40_000_000,
  constructionCostTotal: "",
  ffePlusPreOpening: "",
  numberOfKeys: "",
  adr: "",
  occupancy: "",
  fbRevenueAnnual: "",
  baseFeeRevenuePct: "",
  incentiveFeeProfitPct: "",
  operatingCostPct: "",
  landOwnerSplit: "",
};

// ── Session + backend helpers ────────────────────────────────────────────────

function loadPlotFromSession(): { plotInfo: PlotInfo | null; inputs: Partial<DisplayInputs> } {
  if (typeof window === "undefined") return { plotInfo: null, inputs: {} };
  try {
    const stored = sessionStorage.getItem("selected_plot");
    if (!stored) return { plotInfo: null, inputs: {} };
    const plot: Plot = JSON.parse(stored);

    const dealType = plot.jv || "—";

    const far = plot.far ?? (plot.gfa && plot.plotArea ? plot.gfa / plot.plotArea : 0);

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
    };

    return { plotInfo, inputs };
  } catch {
    return { plotInfo: null, inputs: {} };
  }
}

// ── Calculations ─────────────────────────────────────────────────────────────

function compute(inp: Inputs) {
  const totalDevelopmentCost = inp.landValue + inp.constructionCostTotal + inp.ffePlusPreOpening;

  const roomNightsPerYear = inp.numberOfKeys * 365;
  const occupiedNights = roomNightsPerYear * (inp.occupancy / 100);
  const roomRevenue = occupiedNights * inp.adr;
  const totalRevenue = roomRevenue + inp.fbRevenueAnnual;

  const operatingCosts = totalRevenue * (inp.operatingCostPct / 100);

  // GOP — before operator fees
  const gop = totalRevenue - operatingCosts;

  // Operator fees — deducted BEFORE profit split
  const baseFee = totalRevenue * (inp.baseFeeRevenuePct / 100);
  const incentiveFee = gop > 0 ? gop * (inp.incentiveFeeProfitPct / 100) : 0;
  const totalOperatorFees = baseFee + incentiveFee;

  // Net Income After Operator
  const netIncomeAfterOperator = gop - totalOperatorFees;

  // JV Profit Split (on net income after operator)
  const landOwnerIncome = netIncomeAfterOperator * (inp.landOwnerSplit / 100);
  const investorIncome = netIncomeAfterOperator * ((100 - inp.landOwnerSplit) / 100);

  const landOwnerContribution = inp.landValue;
  const investorContribution = inp.constructionCostTotal + inp.ffePlusPreOpening;

  const landOwnerROI = landOwnerContribution > 0 ? (landOwnerIncome / landOwnerContribution) * 100 : 0;
  const investorROI = investorContribution > 0 ? (investorIncome / investorContribution) * 100 : 0;

  const yieldPct = totalDevelopmentCost > 0 ? (netIncomeAfterOperator / totalDevelopmentCost) * 100 : 0;

  const revpar = inp.numberOfKeys > 0 ? roomRevenue / roomNightsPerYear : 0;

  return {
    totalDevelopmentCost,
    roomNightsPerYear, occupiedNights, roomRevenue, totalRevenue,
    operatingCosts, gop,
    baseFee, incentiveFee, totalOperatorFees,
    netIncomeAfterOperator,
    landOwnerContribution, investorContribution,
    landOwnerIncome, investorIncome,
    landOwnerROI, investorROI,
    yieldPct, revpar,
  };
}

function resolveInputs(d: DisplayInputs): Inputs {
  return {
    plotSize: d.plotSize,
    landValue: d.landValue,
    constructionCostTotal: typeof d.constructionCostTotal === "number" ? d.constructionCostTotal : 0,
    ffePlusPreOpening: typeof d.ffePlusPreOpening === "number" ? d.ffePlusPreOpening : 0,
    numberOfKeys: typeof d.numberOfKeys === "number" ? d.numberOfKeys : 0,
    adr: typeof d.adr === "number" ? d.adr : 0,
    occupancy: typeof d.occupancy === "number" ? d.occupancy : 0,
    fbRevenueAnnual: typeof d.fbRevenueAnnual === "number" ? d.fbRevenueAnnual : 0,
    baseFeeRevenuePct: typeof d.baseFeeRevenuePct === "number" ? d.baseFeeRevenuePct : 0,
    incentiveFeeProfitPct: typeof d.incentiveFeeProfitPct === "number" ? d.incentiveFeeProfitPct : 0,
    operatingCostPct: typeof d.operatingCostPct === "number" ? d.operatingCostPct : 0,
    landOwnerSplit: typeof d.landOwnerSplit === "number" ? d.landOwnerSplit : 0,
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
        <span className="text-xs text-muted w-8 text-right">{unit}</span>
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
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-deep-forest">{value}</span>
    </div>
  );
}

function KPI({ label, value, sub, primary, warn, ready = true }: { label: string; value: string; sub?: string; primary?: boolean; warn?: boolean; ready?: boolean }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col ${warn ? "bg-amber-50 border border-amber-200" : primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"} transition-opacity ${ready ? "opacity-100" : "opacity-50"}`}>
      <span className="text-[11px] text-muted uppercase tracking-wider">{label}</span>
      {ready ? (
        <>
          <span className={`text-lg font-bold mt-0.5 ${warn ? "text-amber-700" : primary ? "text-forest" : "text-deep-forest"}`}>{value}</span>
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

const SESSION_KEY = "jv_build_hotel_state";
const JV_MODELS = [
  { label: "Build & Sell", href: "/JV/build-sell" },
  { label: "Build & Lease", href: "/JV/build-lease" },
  { label: "Build & Hotel", href: "/JV/build-hotel" },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildHotelPage() {
  const pathname = usePathname();
  const [plotInfo, setPlotInfo] = useState<PlotInfo | null>(null);
  const [inputs, setInputs] = useState<DisplayInputs>(DEFAULTS);
  const resolved = useMemo(() => resolveInputs(inputs), [inputs]);
  const r = useMemo(() => compute(resolved), [resolved]);

  const [splitOverridden, setSplitOverridden] = useState(false);
  const contributionSplit = useMemo(() => {
    if (typeof inputs.constructionCostTotal !== "number" || inputs.constructionCostTotal <= 0) return null;
    if (typeof inputs.ffePlusPreOpening !== "number") return null;
    const investorContrib = inputs.constructionCostTotal + inputs.ffePlusPreOpening;
    const total = inputs.landValue + investorContrib;
    return total > 0 ? Math.round((inputs.landValue / total) * 100) : null;
  }, [inputs.landValue, inputs.constructionCostTotal, inputs.ffePlusPreOpening]);

  useEffect(() => {
    // Restore from simulator session
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { inputs: restored, splitOverridden: overridden } = JSON.parse(stored);
        if (restored) setInputs(prev => ({ ...prev, ...restored }));
        if (overridden) setSplitOverridden(true);
      }
    } catch {}
    // Apply current plot data (overwrites plot-derived fields)
    const { plotInfo: info, inputs: plotInputs } = loadPlotFromSession();
    if (info) {
      setPlotInfo(info);
      setInputs(prev => ({ ...prev, ...plotInputs }));
    }
  }, []);

  // Persist inputs to session for cross-simulator navigation
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ inputs, splitOverridden })); } catch {}
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
  const hasOperations = typeof inputs.numberOfKeys === "number" && inputs.numberOfKeys > 0
    && typeof inputs.adr === "number" && inputs.adr > 0
    && typeof inputs.occupancy === "number" && inputs.occupancy > 0
    && typeof inputs.fbRevenueAnnual === "number";
  const hasOpex = typeof inputs.operatingCostPct === "number";
  const hasOperatorFees = typeof inputs.baseFeeRevenuePct === "number"
    && typeof inputs.incentiveFeeProfitPct === "number";
  const hasDevelopment = typeof inputs.constructionCostTotal === "number" && inputs.constructionCostTotal > 0
    && typeof inputs.ffePlusPreOpening === "number";
  const hasJVSplit = typeof inputs.landOwnerSplit === "number";

  const isRevenueReady = hasOperations;
  const isPLReady = hasOperations && hasOpex && hasOperatorFees;
  const isJVSplitReady = isPLReady && hasJVSplit;
  const isKeyMetricsReady = hasDevelopment && isPLReady;

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">Joint-Venture Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Hotel</span>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Hotel Model</h1>
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
          <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
            <p className="text-[10px] text-muted uppercase tracking-wider">Revenue</p>
            <p className="text-sm font-bold text-forest">{isRevenueReady ? fmtAED(r.totalRevenue) : "—"}</p>
          </div>
          <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
            <p className="text-[10px] text-muted uppercase tracking-wider">Net After Op.</p>
            <p className="text-sm font-bold text-forest">{isPLReady ? fmtAED(r.netIncomeAfterOperator) : "—"}</p>
          </div>
          <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
            <p className="text-[10px] text-muted uppercase tracking-wider">Yield</p>
            <p className="text-sm font-bold text-deep-forest">{isKeyMetricsReady ? `${r.yieldPct.toFixed(1)}%` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Two-column layout — each column stacks independently */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-2 flex-1 min-h-0">
        {/* LEFT COLUMN: Green card → Revenue → P&L Waterfall */}
        <div className="flex flex-col gap-2">
          {/* Plot Info (green card) */}
          <div className="bg-forest/[0.04] backdrop-blur-sm rounded-2xl shadow-sm border border-forest/15 px-3 py-1 md:px-4 md:py-1.5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <span className="text-base font-bold text-forest">{plotInfo?.name ?? "—"}</span>
            </div>
            <div className="bg-white/60 rounded-lg px-3 py-1 border border-mint-light/30">
              <InfoRow label="Plot Size" value={`${formatNumber(inputs.plotSize)} sqft`} />
              <InfoRow label="Land Value" value={fmtAED(inputs.landValue)} />
              <InfoRow label="FAR" value={plotInfo?.far?.toFixed(2) ?? "—"} />
              <InfoRow label="Location" value={plotInfo?.location ?? "—"} />
              <InfoRow label="Zoning" value={plotInfo?.zoning ?? "—"} />
              <InfoRow label="Deal Type" value={plotInfo?.dealType ?? "—"} />
            </div>
            <p className="text-[10px] text-muted mt-1">Pre-filled from selected plot. Simulation inputs are editable.</p>
          </div>

          <Section title="Revenue (Annual)" className="flex flex-col">
            {isRevenueReady ? (
              <div className="grid grid-cols-4 gap-1.5">
                <KPI label="Room Revenue" value={fmtAED(r.roomRevenue)} sub={`${formatNumber(Math.round(r.occupiedNights))} nights × AED ${formatNumber(resolved.adr)}`} />
                <KPI label="F&B Revenue" value={fmtAED(resolved.fbRevenueAnnual)} />
                <KPI label="Total Revenue" value={fmtAED(r.totalRevenue)} primary />
                <KPI label="RevPAR" value={`AED ${formatNumber(Math.round(r.revpar))}`} sub={`${resolved.occupancy}% occupancy`} />
              </div>
            ) : (
              <p className="text-sm text-muted/40 text-center py-4">Enter hotel operations inputs to see revenue breakdown</p>
            )}
          </Section>

          <Section title="P&amp;L Waterfall" className="flex-1 flex flex-col">
            {isPLReady ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-mint-white/80">
                  <span className="text-sm text-deep-forest">Total Revenue</span>
                  <span className="text-sm font-bold text-deep-forest">{fmtAED(r.totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg">
                  <span className="text-sm text-muted">− Operating Costs ({resolved.operatingCostPct}%)</span>
                  <span className="text-sm font-semibold text-red-500">−{fmtAED(r.operatingCosts)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-forest/5 border border-forest/10">
                  <span className="text-sm font-semibold text-forest">= Gross Operating Profit (GOP)</span>
                  <span className="text-sm font-bold text-forest">{fmtAED(r.gop)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg">
                  <span className="text-sm text-muted">− Base Fee ({resolved.baseFeeRevenuePct}% of Revenue)</span>
                  <span className="text-sm font-semibold text-amber-600">−{fmtAED(r.baseFee)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg">
                  <span className="text-sm text-muted">− Incentive Fee ({resolved.incentiveFeeProfitPct}% of GOP)</span>
                  <span className="text-sm font-semibold text-amber-600">−{fmtAED(r.incentiveFee)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-sm font-semibold text-amber-700">Total Operator Fees</span>
                  <span className="text-sm font-bold text-amber-700">{fmtAED(r.totalOperatorFees)}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-forest/10 border border-forest/20">
                  <span className="text-sm font-bold text-forest">= Net Income After Operator</span>
                  <span className="text-lg font-bold text-forest">{fmtAED(r.netIncomeAfterOperator)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted/40 text-center py-4">Enter operations, OpEx, and operator fee inputs to see P&amp;L waterfall</p>
            )}
          </Section>
        </div>

        {/* RIGHT COLUMN: Simulation Inputs → JV Profit Split → Key Metrics */}
        <div className="flex flex-col gap-1.5">
          <ContentCard className="flex flex-col">
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2 text-center">
              Simulation Inputs
            </h2>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
              {/* Inner left: Development + Hotel Operations */}
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-deep-forest pb-1">Development</p>
                  <InputRow label="Construction Cost" value={inputs.constructionCostTotal} unit="AED" onChange={v => update("constructionCostTotal", v)} placeholder="e.g. 180,000,000" />
                  <InputRow label="FF&E + Pre-Opening" value={inputs.ffePlusPreOpening} unit="AED" onChange={v => update("ffePlusPreOpening", v)} placeholder="e.g. 25,000,000" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Hotel Operations</p>
                  <InputRow label="Number of Keys" value={inputs.numberOfKeys} unit="keys" onChange={v => update("numberOfKeys", v)} placeholder="e.g. 200" />
                  <InputRow label="ADR" value={inputs.adr} unit="AED" onChange={v => update("adr", v)} placeholder="e.g. 800" />
                  <InputRow label="Occupancy" value={inputs.occupancy} unit="%" onChange={v => update("occupancy", v)} placeholder="e.g. 72" />
                  <InputRow label="F&B Revenue (Annual)" value={inputs.fbRevenueAnnual} unit="AED" onChange={v => update("fbRevenueAnnual", v)} placeholder="e.g. 15,000,000" />
                </div>
              </div>
              {/* Inner right: Operator Fees + Operating Costs + JV Split */}
              <div className="flex flex-col justify-between border-t border-mint-light/40 lg:border-t-0">
                <div>
                  <p className="text-xs font-semibold text-deep-forest pb-1">Operator Fees</p>
                  <InputRow label="Base Fee (% of Revenue)" value={inputs.baseFeeRevenuePct} unit="%" onChange={v => update("baseFeeRevenuePct", v)} placeholder="e.g. 5" />
                  <InputRow label="Incentive Fee (% of GOP)" value={inputs.incentiveFeeProfitPct} unit="%" onChange={v => update("incentiveFeeProfitPct", v)} placeholder="e.g. 10" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Operating Costs</p>
                  <InputRow label="Total OpEx (% of Revenue)" value={inputs.operatingCostPct} unit="%" onChange={v => update("operatingCostPct", v)} placeholder="e.g. 55" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Joint-Venture Split</p>
                  <InputRow label="Landowner Share" value={inputs.landOwnerSplit} unit="%" onChange={v => { setSplitOverridden(true); update("landOwnerSplit", v); }} placeholder="auto" />
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted">Investor Share</span>
                    <span className="text-sm font-semibold text-deep-forest">{typeof inputs.landOwnerSplit === "number" ? `${100 - inputs.landOwnerSplit}%` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </ContentCard>

          <Section title="Joint-Venture Profit Split (Annual)" className="flex flex-col">
            {isJVSplitReady ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                  <span className="text-[11px] text-muted uppercase tracking-wider">Landowner ({resolved.landOwnerSplit}%)</span>
                  <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.landOwnerIncome)}</p>
                  <p className="text-[11px] text-muted font-heading mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                  <p className="text-[11px] text-muted font-heading">Annual ROI: {r.landOwnerROI.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                  <span className="text-[11px] text-muted uppercase tracking-wider">Investor ({100 - resolved.landOwnerSplit}%)</span>
                  <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.investorIncome)}</p>
                  <p className="text-[11px] text-muted font-heading mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                  <p className="text-[11px] text-muted font-heading">Annual ROI: {r.investorROI.toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted/40 text-center py-4">Enter operations, fees, and JV split to see profit breakdown</p>
            )}
          </Section>

          <Section title="Key Metrics" className="flex flex-col">
            {isKeyMetricsReady ? (
              <div className="grid grid-cols-3 gap-1.5">
                <KPI label="Development Cost" value={fmtAED(r.totalDevelopmentCost)} sub={`Land ${fmtAED(resolved.landValue)} + Build ${fmtAED(resolved.constructionCostTotal)} + FF&E ${fmtAED(resolved.ffePlusPreOpening)}`} />
                <KPI label="Yield on Cost" value={`${r.yieldPct.toFixed(1)}%`} sub="Net Income ÷ Dev. Cost" primary />
                <KPI label="Operator Take" value={fmtAED(r.totalOperatorFees)} sub={`${r.totalRevenue > 0 ? ((r.totalOperatorFees / r.totalRevenue) * 100).toFixed(1) : 0}% of revenue`} warn />
              </div>
            ) : (
              <p className="text-sm text-muted/40 text-center py-4">Enter development and operations inputs to see key metrics</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
