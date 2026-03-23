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
  rentalPerNSA: number;
  occupancy: number;
  operatingCostPct: number;
  maintenancePct: number;
  propertyMgmtFeePct: number;
  holdYears: number;
  capRate: number;
  landOwnerSplit: number;
}

const DEFAULTS: Inputs = {
  plotSize: 50_000,
  landValue: 25_000_000,
  farRatio: 3.0,
  efficiency: 80,
  constructionPerGFA: 900,
  softCostPct: 20,
  rentalPerNSA: 120,
  occupancy: 85,
  operatingCostPct: 10,
  maintenancePct: 5,
  propertyMgmtFeePct: 8,
  holdYears: 5,
  capRate: 7,
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
        {unit === "yrs" && <span className="text-xs text-muted">yrs</span>}
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

export default function BuildLeasePage() {
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
          <span className="text-deep-forest font-medium">Build &amp; Lease</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-forest font-heading">Build &amp; Lease Model</h1>
        <p className="text-sm text-muted mt-0.5">
          Build and lease to tenants — recurring rental income split between landowner and investor.
        </p>
      </div>

      {/* Main */}
      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        {/* Left: Inputs */}
        <ContentCard className="flex flex-col md:w-3/5 lg:w-2/3 min-h-0 md:overflow-y-auto">
          {/* Pre-filled land info */}
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
              <div className="rounded-lg p-2 bg-forest/5 border border-forest/15">
                <p className="text-[10px] text-muted uppercase tracking-wider">NOI</p>
                <p className="text-sm font-bold text-forest">{fmtAED(r.noi)}</p>
              </div>
              <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
                <p className="text-[10px] text-muted uppercase tracking-wider">Yield</p>
                <p className="text-sm font-bold text-deep-forest">{r.yieldPct.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg p-2 bg-mint-white/80 border border-mint-light/40">
                <p className="text-[10px] text-muted uppercase tracking-wider">ROI ({inputs.holdYears}yr)</p>
                <p className="text-sm font-bold text-deep-forest">{r.totalROI.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-1">
            {plotInfo ? "Simulation Inputs" : "Assumptions"}
          </h2>

          {/* Inner 2-col on lg for compact desktop */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-4">
            {/* Column 1: Land & Construction + Rental */}
            <div className="divide-y divide-mint-light/40">
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Land &amp; Construction</p>
              <InputRow label="Plot Size" value={inputs.plotSize} unit="sqft" onChange={v => update("plotSize", v)} />
              <InputRow label="Land Value" value={inputs.landValue} unit="AED" onChange={v => update("landValue", v)} />
              <InputRow label="FAR" value={inputs.farRatio} unit="x" onChange={v => update("farRatio", v)} />
              <InputRow label="Efficiency" value={inputs.efficiency} unit="%" onChange={v => update("efficiency", v)} />
              <InputRow label="Cost / GFA sqft" value={inputs.constructionPerGFA} unit="AED" onChange={v => update("constructionPerGFA", v)} />
              <InputRow label="Soft Cost" value={inputs.softCostPct} unit="%" onChange={v => update("softCostPct", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Rental</p>
              <InputRow label="Rent / NSA sqft / yr" value={inputs.rentalPerNSA} unit="AED" onChange={v => update("rentalPerNSA", v)} />
              <InputRow label="Occupancy" value={inputs.occupancy} unit="%" onChange={v => update("occupancy", v)} />
            </div>
            </div>
            {/* Column 2: Expenses + Hold & Exit + JV Split */}
            <div className="divide-y divide-mint-light/40 border-t border-mint-light/40 lg:border-t-0">
              <div>
                <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Expenses (% of Gross Rent)</p>
              <InputRow label="Operating Costs" value={inputs.operatingCostPct} unit="%" onChange={v => update("operatingCostPct", v)} />
              <InputRow label="Maintenance" value={inputs.maintenancePct} unit="%" onChange={v => update("maintenancePct", v)} />
              <InputRow label="Property Mgmt Fee" value={inputs.propertyMgmtFeePct} unit="%" onChange={v => update("propertyMgmtFeePct", v)} />
            </div>
            <div>
              <p className="text-xs font-semibold text-deep-forest pt-2 pb-1">Hold &amp; Exit</p>
              <InputRow label="Hold Period" value={inputs.holdYears} unit="yrs" onChange={v => update("holdYears", v)} />
              <InputRow label="Exit Cap Rate" value={inputs.capRate} unit="%" onChange={v => update("capRate", v)} />
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

        {/* Right: Outputs */}
        <div className="flex flex-col gap-1.5 md:w-2/5 lg:w-1/3 min-h-0 md:overflow-y-auto">
          {/* Annual Income */}
          <Section title="Annual Income">
            <div className="grid grid-cols-2 gap-1.5">
              <KPI label="Gross Rental Income" value={fmtAED(r.grossRentalIncome)} sub={`${formatNumber(Math.round(r.nsa))} NSA × AED ${inputs.rentalPerNSA} × ${inputs.occupancy}%`} />
              <KPI label="Total Expenses" value={fmtAED(r.totalExpenses)} sub={`Ops ${fmtAED(r.operatingCosts)} + Maint ${fmtAED(r.maintenance)} + Mgmt ${fmtAED(r.propertyMgmtFee)}`} />
              <KPI label="NOI (Net Operating Income)" value={fmtAED(r.noi)} primary sub="Gross Rent − Expenses" />
              <KPI label={`Cash Flow (${inputs.holdYears} yrs)`} value={fmtAED(r.totalNOI)} primary sub={`NOI × ${inputs.holdYears} years`} />
            </div>
          </Section>

          {/* Returns */}
          <Section title="Returns">
            <div className="grid grid-cols-3 gap-1.5">
              <KPI label="Yield" value={`${r.yieldPct.toFixed(1)}%`} sub="NOI ÷ Dev. Cost" primary />
              <KPI label={`ROI (${inputs.holdYears} yrs)`} value={`${r.totalROI.toFixed(1)}%`} sub="Total NOI ÷ Dev. Cost" />
              <KPI label="Payback Period" value={r.paybackYears === Infinity ? "N/A" : `${r.paybackYears.toFixed(1)} yrs`} sub="Dev. Cost ÷ NOI" />
            </div>
          </Section>

          {/* Profit Split */}
          <Section title={`Profit Split (${inputs.holdYears}-Year Income)`}>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-xl p-3 md:p-2 bg-forest/5 border border-forest/15">
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Landowner ({inputs.landOwnerSplit}%)</span>
                <p className="text-lg md:text-base font-bold text-forest mt-0.5">{fmtAED(r.landOwnerIncome)}</p>
                <p className="text-[10px] text-muted mt-0.5">Contributes: {fmtAED(r.landOwnerContribution)} (land)</p>
                <p className="text-[10px] text-muted">ROI: {r.landOwnerROI.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl p-3 md:p-2 bg-forest/5 border border-forest/15">
                <span className="text-[11px] md:text-[10px] text-muted uppercase tracking-wider">Investor ({100 - inputs.landOwnerSplit}%)</span>
                <p className="text-lg md:text-base font-bold text-forest mt-0.5">{fmtAED(r.investorIncome)}</p>
                <p className="text-[10px] text-muted mt-0.5">Contributes: {fmtAED(r.investorContribution)} (cash)</p>
                <p className="text-[10px] text-muted">ROI: {r.investorROI.toFixed(1)}%</p>
              </div>
            </div>
          </Section>

          {/* Optional Exit */}
          <Section title="Exit Valuation (Optional)">
            <div className="grid grid-cols-2 gap-1.5">
              <KPI label="Asset Value at Exit" value={fmtAED(r.exitValuation)} sub={`NOI ÷ ${inputs.capRate}% cap rate`} primary />
              <KPI label="Exit Profit" value={fmtAED(r.exitProfit)} sub="Exit Value − Dev. Cost" primary={r.exitProfit >= 0} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
