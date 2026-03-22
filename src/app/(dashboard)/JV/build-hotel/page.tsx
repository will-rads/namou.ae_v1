"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ContentCard from "@/components/ContentCard";

// ── Types & Mock Data ────────────────────────────────────────────────────────

interface Inputs {
  // Development
  plotSize: number;
  landValue: number;
  constructionCostTotal: number;  // AED total
  ffePlusPreOpening: number;      // AED — FF&E + pre-opening

  // Hotel operations
  numberOfKeys: number;
  adr: number;                    // AED — average daily rate
  occupancy: number;              // %
  fbRevenueAnnual: number;        // AED — food & beverage annual

  // Operator fees
  baseFeeRevenuePct: number;      // % of total revenue
  incentiveFeeProfitPct: number;  // % of gross operating profit

  // Operating costs
  operatingCostPct: number;       // % of total revenue (rooms + F&B)

  // JV structure
  landOwnerSplit: number;         // %
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

// ── Calculations ─────────────────────────────────────────────────────────────

function compute(inp: Inputs) {
  // Development cost
  const totalDevelopmentCost = inp.landValue + inp.constructionCostTotal + inp.ffePlusPreOpening;

  // Revenue
  const roomNightsPerYear = inp.numberOfKeys * 365;
  const occupiedNights = roomNightsPerYear * (inp.occupancy / 100);
  const roomRevenue = occupiedNights * inp.adr;
  const totalRevenue = roomRevenue + inp.fbRevenueAnnual;

  // Operating costs
  const operatingCosts = totalRevenue * (inp.operatingCostPct / 100);

  // Gross Operating Profit (GOP) — before operator fees
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

  // Contributions
  const landOwnerContribution = inp.landValue;
  const investorContribution = inp.constructionCostTotal + inp.ffePlusPreOpening;

  // ROI per stakeholder (annual)
  const landOwnerROI = landOwnerContribution > 0 ? (landOwnerIncome / landOwnerContribution) * 100 : 0;
  const investorROI = investorContribution > 0 ? (investorIncome / investorContribution) * 100 : 0;

  // Yield
  const yieldPct = totalDevelopmentCost > 0 ? (netIncomeAfterOperator / totalDevelopmentCost) * 100 : 0;

  // RevPAR
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
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        {unit === "AED" && <span className="text-xs text-muted">AED</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-32 text-right text-sm font-semibold text-deep-forest bg-mint-white/60 border border-mint-light/60 rounded-lg px-2 py-1 focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none"
        />
        {unit === "%" && <span className="text-xs text-muted">%</span>}
        {unit === "keys" && <span className="text-xs text-muted">keys</span>}
      </div>
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildHotelPage() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const r = useMemo(() => compute(inputs), [inputs]);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">JV Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Hotel</span>
        </div>
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">Build &amp; Hotel Model</h1>
        <p className="text-sm text-muted mt-1">
          Develop a hospitality asset with an operator — operator fees are deducted before the JV profit split.
        </p>
      </div>

      {/* Main */}
      <div className="flex flex-col md:flex-row gap-2 lg:gap-3 flex-1 min-h-0">
        {/* Left: Inputs */}
        <ContentCard className="flex-1 flex flex-col md:max-w-md">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1">Assumptions</h2>

          <div className="divide-y divide-mint-light/40 flex-1 flex flex-col justify-evenly">
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Development</p>
              <InputRow label="Plot Size" value={inputs.plotSize} unit="sqft" onChange={v => update("plotSize", v)} />
              <InputRow label="Land Value" value={inputs.landValue} unit="AED" onChange={v => update("landValue", v)} />
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
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Operator Fees</p>
              <InputRow label="Base Fee (% of Revenue)" value={inputs.baseFeeRevenuePct} unit="%" onChange={v => update("baseFeeRevenuePct", v)} />
              <InputRow label="Incentive Fee (% of GOP)" value={inputs.incentiveFeeProfitPct} unit="%" onChange={v => update("incentiveFeeProfitPct", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Operating Costs</p>
              <InputRow label="Total OpEx (% of Revenue)" value={inputs.operatingCostPct} unit="%" onChange={v => update("operatingCostPct", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">JV Split</p>
              <InputRow label="Landowner Share" value={inputs.landOwnerSplit} unit="%" onChange={v => update("landOwnerSplit", v)} />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted">Investor Share</span>
                <span className="text-sm font-semibold text-deep-forest">{100 - inputs.landOwnerSplit}%</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Right: Outputs */}
        <div className="flex-1 flex flex-col gap-2 lg:gap-3 min-h-0">
          {/* Revenue */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">Revenue (Annual)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <KPI label="Room Revenue" value={fmtAED(r.roomRevenue)} sub={`${formatNumber(Math.round(r.occupiedNights))} nights × AED ${formatNumber(inputs.adr)}`} />
              <KPI label="F&B Revenue" value={fmtAED(inputs.fbRevenueAnnual)} />
              <KPI label="Total Revenue" value={fmtAED(r.totalRevenue)} primary />
              <KPI label="RevPAR" value={`AED ${formatNumber(Math.round(r.revpar))}`} sub={`${inputs.occupancy}% occupancy`} />
            </div>
          </ContentCard>

          {/* Waterfall: Revenue → GOP → After Operator */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">P&amp;L Waterfall</h2>
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
                <span className="text-base font-bold text-forest">{fmtAED(r.netIncomeAfterOperator)}</span>
              </div>
            </div>
          </ContentCard>

          {/* Profit Split */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">JV Profit Split (Annual)</h2>
            <div className="grid grid-cols-2 gap-2">
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
          </ContentCard>

          {/* Summary KPIs */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">Key Metrics</h2>
            <div className="grid grid-cols-3 gap-2">
              <KPI label="Development Cost" value={fmtAED(r.totalDevelopmentCost)} sub={`Land ${fmtAED(inputs.landValue)} + Build ${fmtAED(inputs.constructionCostTotal)} + FF&E ${fmtAED(inputs.ffePlusPreOpening)}`} />
              <KPI label="Yield on Cost" value={`${r.yieldPct.toFixed(1)}%`} sub="Net Income ÷ Dev. Cost" primary />
              <KPI label="Operator Take" value={fmtAED(r.totalOperatorFees)} sub={`${r.totalRevenue > 0 ? ((r.totalOperatorFees / r.totalRevenue) * 100).toFixed(1) : 0}% of revenue`} warn />
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
