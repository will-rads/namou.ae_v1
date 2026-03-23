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

// ── Session + backend helpers ────────────────────────────────────────────────

function loadPlotFromSession(): { plot: Plot | null; plotInfo: PlotInfo | null; inputs: Partial<Inputs> } {
  if (typeof window === "undefined") return { plot: null, plotInfo: null, inputs: {} };
  try {
    const stored = sessionStorage.getItem("selected_plot");
    if (!stored) return { plot: null, plotInfo: null, inputs: {} };
    const plot: Plot = JSON.parse(stored);

    // Look up JV field from backend spreadsheet data
    const rows = loadSpreadsheetRows() ?? ORIGINAL_SPREADSHEET_ROWS;
    const matchRow = rows.find(r => r.plotName?.trim() === plot.name);
    const dealType = matchRow?.jv || "—";

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

    const inputs: Partial<Inputs> = {
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
    <div className="flex items-center justify-between py-2 lg:py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted w-8 text-right">{unit === "x" ? "×" : unit}</span>
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
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-semibold text-deep-forest">{value}</span>
    </div>
  );
}

function KPI({ label, value, sub, primary }: { label: string; value: string; sub?: string; primary?: boolean }) {
  return (
    <div className={`rounded-xl p-3 md:p-2 flex flex-col ${primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"}`}>
      <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-lg md:text-base font-bold mt-0.5 ${primary ? "text-forest" : "text-deep-forest"}`}>{value}</span>
      {sub && <span className="text-[10px] text-muted mt-0.5">{sub}</span>}
    </div>
  );
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <ContentCard>
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full text-left md:pointer-events-none">
        <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold">{title}</h2>
        <svg className={`w-3.5 h-3.5 text-muted transition-transform md:hidden ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className={`mt-1.5 ${!open ? "max-md:hidden" : ""}`}>{children}</div>
    </ContentCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BuildSellPage() {
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
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">Joint-Venture Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Sell</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Sell Model</h1>
        <p className="text-sm text-muted mt-0.5">
          Develop the land and sell completed units — profit is split between landowner and investor.
        </p>
      </div>

      {/* Main: Inputs then Outputs */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {/* Left: Inputs */}
        <ContentCard className="flex flex-col">
          {/* Pre-filled land info from selected plot */}
          {plotInfo && (
            <div className="mb-2 pb-2 border-b border-mint-light/40">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-3.5 h-3.5 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <span className="text-sm font-bold text-forest">{plotInfo.name}</span>
              </div>
              <div className="bg-mint-bg/50 rounded-lg px-3 py-1.5 border border-mint-light/30">
                <InfoRow label="Plot Size" value={`${formatNumber(plotInfo.plotSize)} sqft`} />
                <InfoRow label="Land Value" value={fmtAED(plotInfo.landValue)} />
                <InfoRow label="Location" value={plotInfo.location} />
                <InfoRow label="Zoning" value={plotInfo.zoning} />
                <InfoRow label="Deal Type" value={plotInfo.dealType} />
              </div>
              <p className="text-[10px] text-muted mt-1">Pre-filled from selected plot. Simulation inputs below are editable.</p>
            </div>
          )}

          {/* Mobile key results snapshot */}
          <div className="md:hidden mb-2 pb-2 border-b border-mint-light/40">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1.5">Key Results</p>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
                <p className="text-[10px] text-muted uppercase tracking-wider">Total Cost</p>
                <p className="text-sm font-bold text-deep-forest">{fmtAED(r.totalCost)}</p>
              </div>
              <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
                <p className="text-[10px] text-muted uppercase tracking-wider">GDV</p>
                <p className="text-sm font-bold text-deep-forest">{fmtAED(r.gdv)}</p>
              </div>
              <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
                <p className="text-[10px] text-muted uppercase tracking-wider">Net Profit</p>
                <p className="text-sm font-bold text-forest">{fmtAED(r.netProfit)}</p>
              </div>
            </div>
          </div>

          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1">
            {plotInfo ? "Simulation Inputs" : "Assumptions"}
          </h2>

          {/* Inner 2-col on lg for compact desktop */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-4">
            {/* Column 1: Land + Construction */}
            <div className="divide-y divide-mint-light/40">
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
            </div>
            {/* Column 2: Sales + JV Split */}
            <div className="divide-y divide-mint-light/40 border-t border-mint-light/40 lg:border-t-0">
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Sales</p>
              <InputRow label="Selling Price / NSA sqft" value={inputs.sellingPricePerNSA} unit="AED" onChange={v => update("sellingPricePerNSA", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Joint-Venture Split</p>
              <InputRow label="Landowner Profit Share" value={inputs.landOwnerSplit} unit="%" onChange={v => update("landOwnerSplit", v)} />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted">Investor Profit Share</span>
                <span className="text-sm font-semibold text-deep-forest">{100 - inputs.landOwnerSplit}%</span>
              </div>
            </div>
            </div>
          </div>
        </ContentCard>

        {/* Outputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 items-start">
          {/* Project Summary */}
          <Section title="Project Summary">
            <div className="grid grid-cols-2 gap-1.5">
              <KPI label="GFA" value={`${formatNumber(Math.round(r.gfa))} sqft`} />
              <KPI label="NSA" value={`${formatNumber(Math.round(r.nsa))} sqft`} />
              <KPI label="Total Cost" value={fmtAED(r.totalCost)} sub={`Land ${fmtAED(r.landOwnerContribution)} + Constr. ${fmtAED(r.constructionCost)}`} />
              <KPI label="Total Sales (GDV)" value={fmtAED(r.gdv)} sub={`${formatNumber(Math.round(r.nsa))} sqft × AED ${formatNumber(inputs.sellingPricePerNSA)}`} />
              <KPI label="Net Profit" value={fmtAED(r.netProfit)} primary sub={`Margin ${r.gdv > 0 ? ((r.netProfit / r.gdv) * 100).toFixed(1) : 0}%`} />
            </div>
          </Section>

          {/* Profit Split */}
          <Section title="Profit Split">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl p-3 md:p-2 bg-forest/5 border border-forest/15">
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Landowner ({inputs.landOwnerSplit}%)</span>
                <p className="text-lg md:text-base font-bold text-forest mt-0.5">{fmtAED(r.landOwnerProfit)}</p>
                <p className="text-[10px] text-muted mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                <p className="text-[10px] text-muted">ROI: {r.landOwnerROI.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl p-3 md:p-2 bg-forest/5 border border-forest/15">
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Investor ({100 - inputs.landOwnerSplit}%)</span>
                <p className="text-lg md:text-base font-bold text-forest mt-0.5">{fmtAED(r.investorProfit)}</p>
                <p className="text-[10px] text-muted mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                <p className="text-[10px] text-muted">ROI: {r.investorROI.toFixed(1)}%</p>
              </div>
            </div>
          </Section>

          {/* Comparison */}
          <Section title="Sell Land Today vs Joint-Venture">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-xl p-3 md:p-2 bg-mint-white/80 border border-mint-light/40">
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Sell Today</span>
                <p className="text-lg md:text-base font-bold text-deep-forest mt-0.5">{fmtAED(r.sellTodayProceeds)}</p>
                <p className="text-[10px] text-muted mt-0.5">Immediate cash</p>
              </div>
              <div className="rounded-xl p-3 md:p-2 bg-forest/5 border border-forest/15">
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Joint-Venture</span>
                <p className="text-lg md:text-base font-bold text-forest mt-0.5">{fmtAED(r.jvLandOwnerProceeds)}</p>
                <p className="text-[10px] text-muted mt-0.5">Land + profit share</p>
              </div>
              <div className={`rounded-xl p-3 md:p-2 border ${r.jvUplift >= 0 ? "bg-forest/5 border-forest/15" : "bg-red-50 border-red-200"}`}>
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Uplift</span>
                <p className={`text-lg md:text-base font-bold mt-0.5 ${r.jvUplift >= 0 ? "text-forest" : "text-red-600"}`}>
                  {r.jvUplift >= 0 ? "+" : ""}{fmtAED(r.jvUplift)}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {r.jvUpliftPct >= 0 ? "+" : ""}{r.jvUpliftPct.toFixed(1)}% vs sell
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
