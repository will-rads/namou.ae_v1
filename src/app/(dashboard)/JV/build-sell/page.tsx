"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
    <div className={`rounded-xl p-3 flex flex-col ${primary ? "bg-forest/5 border border-forest/15" : "bg-mint-white/80 border border-mint-light/40"}`}>
      <span className="text-[11px] text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-bold mt-0.5 ${primary ? "text-forest" : "text-deep-forest"}`}>{value}</span>
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
    <div className="flex flex-col flex-1 gap-2 animate-fade-in min-h-0 overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted mb-1">
          <Link href="/JV" className="hover:text-forest transition-colors">Joint-Venture Simulator</Link>
          <span>/</span>
          <span className="text-deep-forest font-medium">Build &amp; Sell</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Sell Model</h1>
      </div>

      {/* Mobile key results snapshot */}
      <div className="md:hidden shrink-0">
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

      {/* Two-column layout — each column stacks independently */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-2 flex-1 min-h-0">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-2">
          {/* Plot Info (green card) */}
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

          {/* Project Summary */}
          <Section title="Project Summary" className="flex flex-col flex-1">
            <div className="grid grid-cols-2 gap-2">
              <KPI label="GFA" value={`${formatNumber(Math.round(r.gfa))} sqft`} />
              <KPI label="NSA" value={`${formatNumber(Math.round(r.nsa))} sqft`} />
              <KPI label="Total Cost" value={fmtAED(r.totalCost)} sub={`Land ${fmtAED(r.landOwnerContribution)} + Constr. ${fmtAED(r.constructionCost)}`} />
              <KPI label="Total Sales (GDV)" value={fmtAED(r.gdv)} sub={`${formatNumber(Math.round(r.nsa))} sqft × AED ${formatNumber(inputs.sellingPricePerNSA)}`} />
              <KPI label="Net Profit" value={fmtAED(r.netProfit)} primary sub={`Margin ${r.gdv > 0 ? ((r.netProfit / r.gdv) * 100).toFixed(1) : 0}%`} />
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-2">
          {/* Simulation Inputs */}
          <ContentCard className="flex flex-col">
            <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-2">
              Simulation Inputs
            </h2>
            <div className="flex flex-col divide-y divide-mint-light/40">
              {/* Row 1: Construction */}
              <div className="pb-3">
                <p className="text-sm font-semibold text-deep-forest pb-1">Construction</p>
                <InputRow label="Efficiency (NSA/GFA)" value={inputs.efficiency} unit="%" onChange={v => update("efficiency", v)} />
                <InputRow label="Cost / GFA sqft" value={inputs.constructionPerGFA} unit="AED" onChange={v => update("constructionPerGFA", v)} />
                <InputRow label="Soft Cost" value={inputs.softCostPct} unit="%" onChange={v => update("softCostPct", v)} />
              </div>
              {/* Row 2: Sales */}
              <div className="py-3">
                <p className="text-sm font-semibold text-deep-forest pb-1">Sales</p>
                <InputRow label="Selling Price / NSA sqft" value={inputs.sellingPricePerNSA} unit="AED" onChange={v => update("sellingPricePerNSA", v)} />
              </div>
              {/* Row 3: Joint-Venture Split */}
              <div className="pt-3">
                <p className="text-sm font-semibold text-deep-forest pb-1">Joint-Venture Split</p>
                <InputRow label="Landowner Profit Share" value={inputs.landOwnerSplit} unit="%" onChange={v => update("landOwnerSplit", v)} />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted">Investor Profit Share</span>
                  <span className="text-sm font-semibold text-deep-forest">{100 - inputs.landOwnerSplit}%</span>
                </div>
              </div>
            </div>
          </ContentCard>

          {/* Profit Split */}
          <Section title="Profit Split">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl p-2.5 bg-forest/5 border border-forest/15">
                <span className="text-[10px] text-muted uppercase tracking-wider">Landowner ({inputs.landOwnerSplit}%)</span>
                <p className="text-base font-bold text-forest mt-0.5">{fmtAED(r.landOwnerProfit)}</p>
                <p className="text-[10px] text-muted mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                <p className="text-[10px] text-muted">ROI: {r.landOwnerROI.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl p-2.5 bg-forest/5 border border-forest/15">
                <span className="text-[10px] text-muted uppercase tracking-wider">Investor ({100 - inputs.landOwnerSplit}%)</span>
                <p className="text-base font-bold text-forest mt-0.5">{fmtAED(r.investorProfit)}</p>
                <p className="text-[10px] text-muted mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                <p className="text-[10px] text-muted">ROI: {r.investorROI.toFixed(1)}%</p>
              </div>
            </div>
          </Section>

          {/* Sell Land Today vs Joint-Venture */}
          <Section title="Sell Land Today vs Joint-Venture">
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
          </Section>
        </div>
      </div>
    </div>
  );
}
