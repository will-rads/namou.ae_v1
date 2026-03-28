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
  rentalPerNSA: number;
  occupancy: number;
  operatingCostPct: number;
  maintenancePct: number;
  propertyMgmtFeePct: number;
  holdYears: number;
  capRate: number;
  landOwnerSplit: number;
}

type DisplayInputs = {
  plotSize: number;
  landValue: number;
  farRatio: number;
  efficiency: number | "";
  constructionPerGFA: number | "";
  softCostPct: number | "";
  rentalPerNSA: number | "";
  occupancy: number | "";
  operatingCostPct: number | "";
  maintenancePct: number | "";
  propertyMgmtFeePct: number | "";
  holdYears: number | "";
  capRate: number | "";
  landOwnerSplit: number | "";
};

const DEFAULTS: DisplayInputs = {
  plotSize: 50_000,
  landValue: 25_000_000,
  farRatio: 3.0,
  efficiency: "",
  constructionPerGFA: "",
  softCostPct: "",
  rentalPerNSA: "",
  occupancy: "",
  operatingCostPct: "",
  maintenancePct: "",
  propertyMgmtFeePct: "",
  holdYears: "",
  capRate: "",
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

    return { plotInfo, inputs };
  } catch {
    return { plotInfo: null, inputs: {} };
  }
}

// ── Calculations ─────────────────────────────────────────────────────────────

function compute(inp: Inputs) {
  const gfa = inp.plotSize * inp.farRatio;
  const nsa = gfa * (inp.efficiency / 100);
  const constructionCost = gfa * inp.constructionPerGFA * (1 + inp.softCostPct / 100);
  const totalDevelopmentCost = inp.landValue + constructionCost;

  const grossRentalIncome = nsa * inp.rentalPerNSA * (inp.occupancy / 100);
  const operatingCosts = grossRentalIncome * (inp.operatingCostPct / 100);
  const maintenance = grossRentalIncome * (inp.maintenancePct / 100);
  const propertyMgmtFee = grossRentalIncome * (inp.propertyMgmtFeePct / 100);
  const totalExpenses = operatingCosts + maintenance + propertyMgmtFee;
  const noi = grossRentalIncome - totalExpenses;

  const totalNOI = noi * inp.holdYears;

  const yieldPct = totalDevelopmentCost > 0 ? (noi / totalDevelopmentCost) * 100 : 0;
  const totalROI = totalDevelopmentCost > 0 ? (totalNOI / totalDevelopmentCost) * 100 : 0;
  const paybackYears = noi > 0 ? totalDevelopmentCost / noi : Infinity;

  const exitValuation = inp.capRate > 0 ? noi / (inp.capRate / 100) : 0;
  const exitProfit = exitValuation - totalDevelopmentCost;

  const landOwnerIncome = totalNOI * (inp.landOwnerSplit / 100);
  const investorIncome = totalNOI * ((100 - inp.landOwnerSplit) / 100);

  const landOwnerContribution = inp.landValue;
  const investorContribution = constructionCost;

  const landOwnerROI = landOwnerContribution > 0 ? (landOwnerIncome / landOwnerContribution) * 100 : 0;
  const investorROI = investorContribution > 0 ? (investorIncome / investorContribution) * 100 : 0;

  return {
    gfa, nsa, constructionCost, totalDevelopmentCost,
    grossRentalIncome, operatingCosts, maintenance, propertyMgmtFee, totalExpenses,
    noi, totalNOI, yieldPct, totalROI, paybackYears,
    exitValuation, exitProfit,
    landOwnerContribution, investorContribution,
    landOwnerIncome, investorIncome,
    landOwnerROI, investorROI,
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
    rentalPerNSA: typeof d.rentalPerNSA === "number" ? d.rentalPerNSA : 0,
    occupancy: typeof d.occupancy === "number" ? d.occupancy : 0,
    operatingCostPct: typeof d.operatingCostPct === "number" ? d.operatingCostPct : 0,
    maintenancePct: typeof d.maintenancePct === "number" ? d.maintenancePct : 0,
    propertyMgmtFeePct: typeof d.propertyMgmtFeePct === "number" ? d.propertyMgmtFeePct : 0,
    holdYears: typeof d.holdYears === "number" ? d.holdYears : 0,
    capRate: typeof d.capRate === "number" ? d.capRate : 0,
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

function KPI({ label, value, sub, primary, ready = true }: { label: string; value: string; sub?: string; primary?: boolean; ready?: boolean }) {
  return (
    <div className={`rounded-xl p-2 flex flex-col ${primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"} transition-opacity ${ready ? "opacity-100" : "opacity-50"}`}>
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
      <div className="mt-1 flex-1">{children}</div>
    </ContentCard>
  );
}

// ── Session & Nav ────────────────────────────────────────────────────────────

const SESSION_KEY = "jv_build_lease_state";
const SHARED_SESSION_KEY = "jv_shared_inputs";
const SHARED_KEYS = ["efficiency", "constructionPerGFA", "softCostPct", "occupancy", "operatingCostPct", "landOwnerSplit"] as const;
const JV_MODELS = [
  { label: "Build & Sell", href: "/JV/build-sell" },
  { label: "Build & Lease", href: "/JV/build-lease" },
  { label: "Build & Hotel", href: "/JV/build-hotel" },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildLeasePage() {
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
    const total = inputs.landValue + constructionCost;
    return total > 0 ? Math.round((inputs.landValue / total) * 100) : null;
  }, [inputs.plotSize, inputs.farRatio, inputs.landValue, inputs.constructionPerGFA, inputs.softCostPct, inputs.efficiency]);

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
  const hasRental = typeof inputs.rentalPerNSA === "number" && inputs.rentalPerNSA > 0
    && typeof inputs.occupancy === "number" && inputs.occupancy > 0;
  const hasExpenses = typeof inputs.operatingCostPct === "number"
    && typeof inputs.maintenancePct === "number"
    && typeof inputs.propertyMgmtFeePct === "number";
  const hasHoldYears = typeof inputs.holdYears === "number" && inputs.holdYears > 0;
  const hasCapRate = typeof inputs.capRate === "number" && inputs.capRate > 0;
  const hasJVSplit = typeof inputs.landOwnerSplit === "number";

  const isIncomeReady = hasConstruction && hasRental && hasExpenses;
  const isReturnsReady = isIncomeReady;
  const isProfitSplitReady = isIncomeReady && hasHoldYears && hasJVSplit;
  const isExitReady = isIncomeReady && hasCapRate;

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">Joint-Venture Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Lease</span>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Lease Model</h1>
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
            <p className="text-[10px] text-muted uppercase tracking-wider">NOI</p>
            <p className="text-sm font-bold text-forest">{isIncomeReady ? fmtAED(r.noi) : "—"}</p>
          </div>
          <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
            <p className="text-[10px] text-muted uppercase tracking-wider">Yield</p>
            <p className="text-sm font-bold text-deep-forest">{isReturnsReady ? `${r.yieldPct.toFixed(1)}%` : "—"}</p>
          </div>
          <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
            <p className="text-[10px] text-muted uppercase tracking-wider">ROI{hasHoldYears ? ` (${resolved.holdYears}yr)` : ""}</p>
            <p className="text-sm font-bold text-deep-forest">{isReturnsReady && hasHoldYears ? `${r.totalROI.toFixed(1)}%` : "—"}</p>
          </div>
        </div>
      </div>

      {/* 2×3 Grid — rows shared across columns for alignment */}
      <div className="flex flex-col md:grid md:grid-cols-2 md:grid-rows-[auto_1.15fr_0.85fr] gap-2 flex-1 min-h-0">
        {/* TOP-LEFT: Plot Info (green card) */}
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
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2 text-center">
            Simulation Inputs
          </h2>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
            {/* Inner left: Construction + Rental */}
            <div className="flex flex-col">
              <div>
                <p className="text-xs font-semibold text-deep-forest pb-1">Construction</p>
                <InputRow label="Efficiency" value={inputs.efficiency} unit="%" onChange={v => update("efficiency", v)} placeholder="e.g. 80" />
                <InputRow label="Cost / GFA sqft" value={inputs.constructionPerGFA} unit="AED" onChange={v => update("constructionPerGFA", v)} placeholder="e.g. 900" />
                <InputRow label="Soft Cost" value={inputs.softCostPct} unit="%" onChange={v => update("softCostPct", v)} placeholder="e.g. 20" />
              </div>
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-1 pb-1">Rental</p>
                <InputRow label="Rent / NSA sqft / yr" value={inputs.rentalPerNSA} unit="AED" onChange={v => update("rentalPerNSA", v)} placeholder="e.g. 120" />
                <InputRow label="Occupancy" value={inputs.occupancy} unit="%" onChange={v => update("occupancy", v)} placeholder="e.g. 85" />
              </div>
            </div>
            {/* Inner right: Expenses + Hold & Exit + JV Split */}
            <div className="flex flex-col justify-between border-t border-mint-light/40 lg:border-t-0">
              <div>
                <p className="text-xs font-semibold text-deep-forest pb-1">Expenses (% of Gross Rent)</p>
                <InputRow label="Operating Costs" value={inputs.operatingCostPct} unit="%" onChange={v => update("operatingCostPct", v)} placeholder="e.g. 10" />
                <InputRow label="Maintenance" value={inputs.maintenancePct} unit="%" onChange={v => update("maintenancePct", v)} placeholder="e.g. 5" />
                <InputRow label="Property Mgmt Fee" value={inputs.propertyMgmtFeePct} unit="%" onChange={v => update("propertyMgmtFeePct", v)} placeholder="e.g. 8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Hold &amp; Exit</p>
                <InputRow label="Hold Period" value={inputs.holdYears} unit="yrs" onChange={v => update("holdYears", v)} placeholder="e.g. 5" />
                <InputRow label="Exit Cap Rate" value={inputs.capRate} unit="%" onChange={v => update("capRate", v)} placeholder="e.g. 7" />
              </div>
            </div>
          </div>
          {/* Joint-Venture Split — horizontal */}
          <div className="border-t border-mint-light/40 pt-2 mt-1">
            <p className="text-xs font-semibold text-deep-forest text-center pb-1">Joint-Venture Split</p>
            <div className="grid grid-cols-2 gap-x-4">
              <InputRow label="Landowner Share" value={inputs.landOwnerSplit} unit="%" onChange={v => { setSplitOverridden(true); update("landOwnerSplit", v); }} placeholder="auto" />
              <div className="flex items-center justify-between py-1.5 lg:py-1">
                <span className="text-sm text-muted">Investor Share</span>
                <span className="text-sm font-semibold text-deep-forest">{typeof inputs.landOwnerSplit === "number" ? `${100 - inputs.landOwnerSplit}%` : "—"}</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* ROW 2 LEFT: Annual Income */}
        <Section title="Annual Income" className="flex flex-col">
          {isIncomeReady ? (
            <div className="grid grid-cols-2 gap-1.5">
              <KPI label="Gross Rental Income" value={fmtAED(r.grossRentalIncome)} sub={`${formatNumber(Math.round(r.nsa))} NSA × AED ${resolved.rentalPerNSA} × ${resolved.occupancy}%`} />
              <KPI label="Total Expenses" value={fmtAED(r.totalExpenses)} sub={`Ops ${fmtAED(r.operatingCosts)} + Maint ${fmtAED(r.maintenance)} + Mgmt ${fmtAED(r.propertyMgmtFee)}`} />
              <KPI label="NOI (Net Operating Income)" value={fmtAED(r.noi)} primary sub="Gross Rent − Expenses" />
              <KPI label={`Cash Flow${hasHoldYears ? ` (${resolved.holdYears} yrs)` : ""}`} value={hasHoldYears ? fmtAED(r.totalNOI) : "—"} primary={hasHoldYears} sub={hasHoldYears ? `NOI × ${resolved.holdYears} years` : "Enter hold period"} ready={hasHoldYears} />
            </div>
          ) : (
            <p className="text-sm text-muted/40 text-center py-4">Enter construction, rental, and expense inputs to see annual income</p>
          )}
        </Section>

        {/* ROW 2 RIGHT: Profit Split */}
        <Section title={`Profit Split${hasHoldYears ? ` (${resolved.holdYears}-Year Income)` : ""}`} className="flex flex-col">
          {isProfitSplitReady ? (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl p-2 bg-forest/5 border border-forest/15">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Landowner ({resolved.landOwnerSplit}%)</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.landOwnerIncome)}</p>
                <p className="text-[11px] text-muted font-heading mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                <p className="text-[11px] text-muted font-heading">Annual ROI: {(r.landOwnerROI / resolved.holdYears).toFixed(1)}%</p>
                <p className="text-[11px] text-muted font-heading">Total ROI: {r.landOwnerROI.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl p-2 bg-forest/5 border border-forest/15">
                <span className="text-xs text-muted uppercase tracking-wider font-medium">Investor ({100 - resolved.landOwnerSplit}%)</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.investorIncome)}</p>
                <p className="text-[11px] text-muted font-heading mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                <p className="text-[11px] text-muted font-heading">Annual ROI: {(r.investorROI / resolved.holdYears).toFixed(1)}%</p>
                <p className="text-[11px] text-muted font-heading">Total ROI: {r.investorROI.toFixed(1)}%</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted/40 text-center py-4">Enter all inputs including hold period and JV split to see profit breakdown</p>
          )}
        </Section>

        {/* ROW 3 LEFT: Returns */}
        <Section title="Returns" className="flex flex-col">
          {isReturnsReady ? (
            <div className="grid grid-cols-3 gap-1.5">
              <KPI label="Yield" value={`${r.yieldPct.toFixed(1)}%`} sub="NOI ÷ Dev. Cost" primary />
              <KPI label={`ROI${hasHoldYears ? ` (${resolved.holdYears} yrs)` : ""}`} value={hasHoldYears ? `${r.totalROI.toFixed(1)}%` : "—"} sub="Total NOI ÷ Dev. Cost" ready={hasHoldYears} />
              <KPI label="Payback Period" value={r.paybackYears === Infinity ? "N/A" : `${r.paybackYears.toFixed(1)} yrs`} sub="Dev. Cost ÷ NOI" />
            </div>
          ) : (
            <p className="text-sm text-muted/40 text-center py-4">Enter construction, rental, and expense inputs to see returns</p>
          )}
        </Section>

        {/* ROW 3 RIGHT: Exit Valuation */}
        <Section title="Exit Valuation" className="flex flex-col">
          {isExitReady ? (
            <div className="grid grid-cols-2 gap-1.5">
              <KPI label="Asset Value at Exit" value={fmtAED(r.exitValuation)} sub={`NOI ÷ ${resolved.capRate}% cap rate`} primary />
              <KPI label="Exit Profit" value={fmtAED(r.exitProfit)} sub="Exit Value − Dev. Cost" primary={r.exitProfit >= 0} />
            </div>
          ) : (
            <p className="text-sm text-muted/40 text-center py-4">Enter income inputs and exit cap rate to see exit valuation</p>
          )}
        </Section>
      </div>
    </div>
  );
}
