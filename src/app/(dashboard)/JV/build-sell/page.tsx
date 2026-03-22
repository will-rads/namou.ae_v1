"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ContentCard from "@/components/ContentCard";

// ── Types & Mock Data ────────────────────────────────────────────────────────

interface Inputs {
  plotSize: number;         // sq ft
  landValue: number;        // AED — landowner contribution
  farRatio: number;
  efficiency: number;       // %
  constructionPerGFA: number; // AED/sqft
  softCostPct: number;      // %
  sellingPricePerNSA: number; // AED/sqft
  landOwnerSplit: number;   // % to landowner
  investorCashTopUp: number; // AED — extra cash from investor beyond construction
}

const DEFAULTS: Inputs = {
  plotSize: 50_000,
  landValue: 25_000_000,
  farRatio: 3.0,
  efficiency: 80,
  constructionPerGFA: 900,
  softCostPct: 20,
  sellingPricePerNSA: 3_200,
  landOwnerSplit: 40,
  investorCashTopUp: 0,
};

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

  // Comparison: selling land today vs JV
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtAED(n: number) { return `AED ${fmt(n)}`; }

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

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
          className="w-28 text-right text-sm font-semibold text-deep-forest bg-mint-white/60 border border-mint-light/60 rounded-lg px-2 py-1 focus:border-forest/40 focus:ring-1 focus:ring-forest/10 outline-none"
        />
        {unit === "%" && <span className="text-xs text-muted">%</span>}
        {unit === "x" && <span className="text-xs text-muted">×</span>}
        {unit === "sqft" && <span className="text-xs text-muted">sqft</span>}
      </div>
    </div>
  );
}

function KPI({ label, value, sub, primary }: { label: string; value: string; sub?: string; primary?: boolean }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col ${primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"}`}>
      <span className="text-[11px] text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-bold mt-0.5 ${primary ? "text-forest" : "text-deep-forest"}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted mt-0.5">{sub}</span>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildSellPage() {
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
          <span className="text-deep-forest font-medium">Build &amp; Sell</span>
        </div>
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">Build &amp; Sell Model</h1>
        <p className="text-sm text-muted mt-1">
          Develop the land and sell completed units — profit is split between landowner and investor.
        </p>
      </div>

      {/* Main: Inputs + Outputs side-by-side */}
      <div className="flex flex-col md:flex-row gap-2 lg:gap-3 flex-1 min-h-0">
        {/* Left: Inputs */}
        <ContentCard className="flex-1 flex flex-col md:max-w-md">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1">Assumptions</h2>

          <div className="divide-y divide-mint-light/40 flex-1 flex flex-col justify-evenly">
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Land</p>
              <InputRow label="Plot Size" value={inputs.plotSize} unit="sqft" onChange={v => update("plotSize", v)} />
              <InputRow label="Land Value" value={inputs.landValue} unit="AED" onChange={v => update("landValue", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Construction</p>
              <InputRow label="FAR" value={inputs.farRatio} unit="x" onChange={v => update("farRatio", v)} />
              <InputRow label="Efficiency (NSA/GFA)" value={inputs.efficiency} unit="%" onChange={v => update("efficiency", v)} />
              <InputRow label="Cost / GFA sqft" value={inputs.constructionPerGFA} unit="AED" onChange={v => update("constructionPerGFA", v)} />
              <InputRow label="Soft Cost" value={inputs.softCostPct} unit="%" onChange={v => update("softCostPct", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Sales</p>
              <InputRow label="Selling Price / NSA sqft" value={inputs.sellingPricePerNSA} unit="AED" onChange={v => update("sellingPricePerNSA", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">JV Split</p>
              <InputRow label="Landowner Profit Share" value={inputs.landOwnerSplit} unit="%" onChange={v => update("landOwnerSplit", v)} />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted">Investor Profit Share</span>
                <span className="text-sm font-semibold text-deep-forest">{100 - inputs.landOwnerSplit}%</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Right: Results */}
        <div className="flex-1 flex flex-col gap-2 lg:gap-3 min-h-0">
          {/* KPI Grid */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">Project Summary</h2>
            <div className="grid grid-cols-2 gap-2">
              <KPI label="GFA" value={`${formatNumber(Math.round(r.gfa))} sqft`} />
              <KPI label="NSA" value={`${formatNumber(Math.round(r.nsa))} sqft`} />
              <KPI label="Total Cost" value={fmtAED(r.totalCost)} sub={`Land ${fmtAED(r.landOwnerContribution)} + Constr. ${fmtAED(r.constructionCost)}`} />
              <KPI label="Total Sales (GDV)" value={fmtAED(r.gdv)} sub={`${formatNumber(Math.round(r.nsa))} sqft × AED ${formatNumber(inputs.sellingPricePerNSA)}`} />
              <KPI label="Net Profit" value={fmtAED(r.netProfit)} primary sub={`Margin ${r.gdv > 0 ? ((r.netProfit / r.gdv) * 100).toFixed(1) : 0}%`} />
            </div>
          </ContentCard>

          {/* Profit Split */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">Profit Split</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                <span className="text-[11px] text-muted uppercase tracking-wider">Landowner ({inputs.landOwnerSplit}%)</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.landOwnerProfit)}</p>
                <p className="text-[11px] text-muted mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                <p className="text-[11px] text-muted">ROI: {r.landOwnerROI.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                <span className="text-[11px] text-muted uppercase tracking-wider">Investor ({100 - inputs.landOwnerSplit}%)</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.investorProfit)}</p>
                <p className="text-[11px] text-muted mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                <p className="text-[11px] text-muted">ROI: {r.investorROI.toFixed(1)}%</p>
              </div>
            </div>
          </ContentCard>

          {/* Comparison: Sell Today vs JV */}
          <ContentCard>
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">Comparison — Sell Land Today vs JV</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 bg-mint-white/80 border border-mint-light/40">
                <span className="text-[11px] text-muted uppercase tracking-wider">Sell Today</span>
                <p className="text-lg font-bold text-deep-forest mt-0.5">{fmtAED(r.sellTodayProceeds)}</p>
                <p className="text-[11px] text-muted mt-0.5">Immediate cash, no risk</p>
              </div>
              <div className="rounded-xl p-3 bg-forest/5 border border-forest/15">
                <span className="text-[11px] text-muted uppercase tracking-wider">JV Proceeds</span>
                <p className="text-lg font-bold text-forest mt-0.5">{fmtAED(r.jvLandOwnerProceeds)}</p>
                <p className="text-[11px] text-muted mt-0.5">Land returned + profit share</p>
              </div>
              <div className={`rounded-xl p-3 border ${r.jvUplift >= 0 ? "bg-forest/5 border-forest/15" : "bg-red-50 border-red-200"}`}>
                <span className="text-[11px] text-muted uppercase tracking-wider">JV Uplift</span>
                <p className={`text-lg font-bold mt-0.5 ${r.jvUplift >= 0 ? "text-forest" : "text-red-600"}`}>
                  {r.jvUplift >= 0 ? "+" : ""}{fmtAED(r.jvUplift)}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  {r.jvUpliftPct >= 0 ? "+" : ""}{r.jvUpliftPct.toFixed(1)}% vs selling today
                </p>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
