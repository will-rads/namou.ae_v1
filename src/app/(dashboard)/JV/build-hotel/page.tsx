"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ContentCard from "@/components/ContentCard";
import type { Plot } from "@/data/mock";
import { ORIGINAL_SPREADSHEET_ROWS, loadSpreadsheetRows } from "@/data/spreadsheetData";

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

const DEFAULTS: Inputs = {
  plotSize: 80_000,
  landValue: 40_000_000,
  constructionCostTotal: 180_000_000,
  ffePlusPreOpening: 25_000_000,

  numberOfKeys: 200,
  adr: 800,
  occupancy: 72,
  fbRevenueAnnual: 15_000_000,

  baseFeeRevenuePct: 5,
  incentiveFeeProfitPct: 10,

  operatingCostPct: 55,

  landOwnerSplit: 40,
};

// ── Session + backend helpers ────────────────────────────────────────────────

function loadPlotFromSession(): { plotInfo: PlotInfo | null; inputs: Partial<Inputs> } {
  if (typeof window === "undefined") return { plotInfo: null, inputs: {} };
  try {
    const stored = sessionStorage.getItem("selected_plot");
    if (!stored) return { plotInfo: null, inputs: {} };
    const plot: Plot = JSON.parse(stored);

    const rows = loadSpreadsheetRows() ?? ORIGINAL_SPREADSHEET_ROWS;
    const matchRow = rows.find(r => r.plotName?.trim() === plot.name);
    const dealType = matchRow?.jv || "—";

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

    const inputs: Partial<Inputs> = {
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtAED(n: number) { return `AED ${fmt(n)}`; }

function formatNumber(n: number) { return n.toLocaleString("en-US"); }

function InputRow({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 lg:py-1">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted w-8 text-right">{unit}</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
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

function KPI({ label, value, sub, primary, warn }: { label: string; value: string; sub?: string; primary?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col ${warn ? "bg-amber-50 border border-amber-200" : primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"}`}>
      <span className="text-[11px] text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-bold mt-0.5 ${warn ? "text-amber-700" : primary ? "text-forest" : "text-deep-forest"}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted mt-0.5">{sub}</span>}
    </div>
  );
}

function Section({ title, defaultOpen = true, className, children }: { title: string; defaultOpen?: boolean; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <ContentCard className={className}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full text-left md:pointer-events-none">
        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">{title}</h2>
        <svg className={`w-3.5 h-3.5 text-muted transition-transform md:hidden ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className={`mt-2 flex-1 ${!open ? "max-md:hidden" : ""}`}>{children}</div>
    </ContentCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildHotelPage() {
  const [plotInfo, setPlotInfo] = useState<PlotInfo | null>(null);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const r = useMemo(() => compute(inputs), [inputs]);

  useEffect(() => {
    const { plotInfo: info, inputs: plotInputs } = loadPlotFromSession();
    if (info) {
      setPlotInfo(info);
      setInputs(prev => ({ ...prev, ...plotInputs }));
    }
  }, []);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">Joint-Venture Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Hotel</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Hotel Model</h1>
      </div>

      {/* Mobile key results snapshot */}
      <div className="md:hidden shrink-0">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
            <p className="text-[10px] text-muted uppercase tracking-wider">Revenue</p>
            <p className="text-sm font-bold text-forest">{fmtAED(r.totalRevenue)}</p>
          </div>
          <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
            <p className="text-[10px] text-muted uppercase tracking-wider">Net After Op.</p>
            <p className="text-sm font-bold text-forest">{fmtAED(r.netIncomeAfterOperator)}</p>
          </div>
          <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
            <p className="text-[10px] text-muted uppercase tracking-wider">Yield</p>
            <p className="text-sm font-bold text-deep-forest">{r.yieldPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* 2×2 Quadrant Grid */}
      <div className="flex flex-col md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] gap-x-2 gap-y-1 flex-1 min-h-0">
        {/* TOP-LEFT: Plot Info (green card) */}
        <div className="bg-forest/[0.04] backdrop-blur-sm rounded-2xl shadow-sm border border-forest/15 px-3 py-1 md:px-4 md:py-1.5 flex flex-col justify-center md:self-start">
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

        {/* TOP-RIGHT: Simulation Inputs */}
        <ContentCard className="flex flex-col">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">
            Simulation Inputs
          </h2>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
            {/* Inner left: Development + Hotel Operations */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-deep-forest pb-1">Development</p>
                <InputRow label="Construction Cost" value={inputs.constructionCostTotal} unit="AED" onChange={v => update("constructionCostTotal", v)} />
                <InputRow label="FF&E + Pre-Opening" value={inputs.ffePlusPreOpening} unit="AED" onChange={v => update("ffePlusPreOpening", v)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Hotel Operations</p>
                <InputRow label="Number of Keys" value={inputs.numberOfKeys} unit="keys" onChange={v => update("numberOfKeys", v)} />
                <InputRow label="ADR" value={inputs.adr} unit="AED" onChange={v => update("adr", v)} />
                <InputRow label="Occupancy" value={inputs.occupancy} unit="%" onChange={v => update("occupancy", v)} />
                <InputRow label="F&B Revenue (Annual)" value={inputs.fbRevenueAnnual} unit="AED" onChange={v => update("fbRevenueAnnual", v)} />
              </div>
            </div>
            {/* Inner right: Operator Fees + Operating Costs + JV Split */}
            <div className="flex flex-col justify-between border-t border-mint-light/40 lg:border-t-0">
              <div>
                <p className="text-xs font-semibold text-deep-forest pb-1">Operator Fees</p>
                <InputRow label="Base Fee (% of Revenue)" value={inputs.baseFeeRevenuePct} unit="%" onChange={v => update("baseFeeRevenuePct", v)} />
                <InputRow label="Incentive Fee (% of GOP)" value={inputs.incentiveFeeProfitPct} unit="%" onChange={v => update("incentiveFeeProfitPct", v)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Operating Costs</p>
                <InputRow label="Total OpEx (% of Revenue)" value={inputs.operatingCostPct} unit="%" onChange={v => update("operatingCostPct", v)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Joint-Venture Split</p>
                <InputRow label="Landowner Share" value={inputs.landOwnerSplit} unit="%" onChange={v => update("landOwnerSplit", v)} />
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted">Investor Share</span>
                  <span className="text-sm font-semibold text-deep-forest">{100 - inputs.landOwnerSplit}%</span>
                </div>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* BOTTOM-LEFT: Revenue + P&L Waterfall */}
        <div className="flex flex-col gap-2">
          <Section title="Revenue (Annual)" className="flex-1 flex flex-col">
            <div className="grid grid-cols-4 gap-1.5">
              <KPI label="Room Revenue" value={fmtAED(r.roomRevenue)} sub={`${formatNumber(Math.round(r.occupiedNights))} nights × AED ${formatNumber(inputs.adr)}`} />
              <KPI label="F&B Revenue" value={fmtAED(inputs.fbRevenueAnnual)} />
              <KPI label="Total Revenue" value={fmtAED(r.totalRevenue)} primary />
              <KPI label="RevPAR" value={`AED ${formatNumber(Math.round(r.revpar))}`} sub={`${inputs.occupancy}% occupancy`} />
            </div>
          </Section>

          <Section title="P&amp;L Waterfall" className="flex-1 flex flex-col">
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-mint-white/80">
                <span className="text-sm text-deep-forest">Total Revenue</span>
                <span className="text-sm font-bold text-deep-forest">{fmtAED(r.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg">
                <span className="text-sm text-muted">− Operating Costs ({inputs.operatingCostPct}%)</span>
                <span className="text-sm font-semibold text-red-500">−{fmtAED(r.operatingCosts)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-forest/5 border border-forest/10">
                <span className="text-sm font-semibold text-forest">= Gross Operating Profit (GOP)</span>
                <span className="text-sm font-bold text-forest">{fmtAED(r.gop)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg">
                <span className="text-sm text-muted">− Base Fee ({inputs.baseFeeRevenuePct}% of Revenue)</span>
                <span className="text-sm font-semibold text-amber-600">−{fmtAED(r.baseFee)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg">
                <span className="text-sm text-muted">− Incentive Fee ({inputs.incentiveFeeProfitPct}% of GOP)</span>
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
          </Section>
        </div>

        {/* BOTTOM-RIGHT: JV Profit Split + Key Metrics */}
        <div className="flex flex-col gap-2">
          <Section title="Joint-Venture Profit Split (Annual)" className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                <span className="text-[11px] text-muted uppercase tracking-wider">Landowner ({inputs.landOwnerSplit}%)</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.landOwnerIncome)}</p>
                <p className="text-[11px] text-muted mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                <p className="text-[11px] text-muted">Annual ROI: {r.landOwnerROI.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                <span className="text-[11px] text-muted uppercase tracking-wider">Investor ({100 - inputs.landOwnerSplit}%)</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.investorIncome)}</p>
                <p className="text-[11px] text-muted mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                <p className="text-[11px] text-muted">Annual ROI: {r.investorROI.toFixed(1)}%</p>
              </div>
            </div>
          </Section>

          <Section title="Key Metrics" className="flex-1 flex flex-col">
            <div className="grid grid-cols-3 gap-1.5">
              <KPI label="Development Cost" value={fmtAED(r.totalDevelopmentCost)} sub={`Land ${fmtAED(inputs.landValue)} + Build ${fmtAED(inputs.constructionCostTotal)} + FF&E ${fmtAED(inputs.ffePlusPreOpening)}`} />
              <KPI label="Yield on Cost" value={`${r.yieldPct.toFixed(1)}%`} sub="Net Income ÷ Dev. Cost" primary />
              <KPI label="Operator Take" value={fmtAED(r.totalOperatorFees)} sub={`${r.totalRevenue > 0 ? ((r.totalOperatorFees / r.totalRevenue) * 100).toFixed(1) : 0}% of revenue`} warn />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
