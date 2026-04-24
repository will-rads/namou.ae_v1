"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ContentCard from "@/components/ContentCard";
import { plots, formatNumber, type Plot } from "@/data/mock";

interface ROIData {
  inputs: {
    plotSize: number;
    pricingMethod: string;
    pricePerPlotSqft: number;
    pricePerGFA: number;
    gfaRatio: number;
    efficiency: number;
    constructionCostPerGFA: number;
    softCostPct: number;
    sellingPricePerNSA: number;
  };
  results: {
    gfa: number;
    nsa: number;
    landCost: number;
    constructionCost: number;
    totalCost: number;
    revenue: number;
    profit: number;
    profitMargin: number;
    returnOnCost: number;
    rlv: number;
  };
  activeScenario: string;
}

function fmtAED(n: number): string {
  return `AED ${Math.round(n).toLocaleString("en-US")}`;
}

/* ── Agreement-style helpers (match /agreement page) ── */

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-deep-forest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] text-red-500">Required</span>}
    </label>
  );
}

function inputCls(error?: boolean) {
  return `w-full px-3 py-2 rounded-lg border text-sm text-deep-forest placeholder:text-muted/50 outline-none transition-colors ${
    error
      ? "border-red-400 bg-red-50/30 focus:border-red-500"
      : "border-mint-light/60 bg-white focus:border-forest/40 focus:ring-1 focus:ring-forest/10"
  }`;
}

/* ── Payment Plan helpers ── */

interface PaymentStage { label: string; pct: number; amount: number; sub?: string }

function parsePaymentStages(text: string, price: number): PaymentStage[] {
  const stages: PaymentStage[] = [];
  const segments = text.split(/\s*\/\s*/);
  let totalPct = 0;
  for (const seg of segments) {
    const parts = seg.split(/\s*—\s*/);
    const m = parts[0].match(/(\d+)%\s*(.*)/);
    if (!m) continue;
    const pct = parseInt(m[1]);
    let label = m[2].trim();
    const yearMatch = label.match(/end of each year\s+([\d,\s&]+)\s*(.*)/i);
    if (yearMatch) {
      const years = yearMatch[1].match(/\d+/g) || [];
      const suffix = yearMatch[2].trim();
      for (const y of years) {
        stages.push({ label: `End of year ${y}${suffix ? ` ${suffix}` : ""}`, pct, amount: Math.round(price * pct / 100) });
        totalPct += pct;
      }
    } else {
      if (label) label = label.charAt(0).toUpperCase() + label.slice(1);
      else label = "Payment";
      stages.push({ label, pct, amount: Math.round(price * pct / 100) });
      totalPct += pct;
    }
    if (parts.length > 1) {
      const tail = parts[1].trim();
      const instMatch = tail.match(/(\d+)\s*instalment/i);
      const remainPct = 100 - totalPct;
      if (instMatch && remainPct > 0) {
        const n = parseInt(instMatch[1]);
        const total = Math.round(price * remainPct / 100);
        stages.push({ label: `Balance (${n} quarterly instalments)`, pct: remainPct, amount: total, sub: `AED ${formatNumber(Math.round(total / n))} per instalment` });
        totalPct += remainPct;
      } else if (/remaining|close/i.test(tail) && 100 - totalPct > 0) {
        const rp = 100 - totalPct;
        stages.push({ label: /within 30 days/i.test(tail) ? "Balance (within 30 days)" : "Balance", pct: rp, amount: Math.round(price * rp / 100) });
        totalPct += rp;
      }
    }
  }
  return stages;
}

/* ── Next Steps Modal ── */

function NextStepsModal({ onClose, plotName, selectedPlots, enableOfferWebhook = false }: { onClose: () => void; plotName: string; selectedPlots: Plot[]; enableOfferWebhook?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"Investor" | "Broker">(() => {
    try { const raw = sessionStorage.getItem("namou_session"); if (raw) { const ct = JSON.parse(raw).clientType; if (ct === "Broker") return "Broker"; } } catch { /* ignore */ }
    return "Investor";
  });

  const isBroker = mode === "Broker";

  // Property Introduction form state (Developer / Investor / default)
  const [piForm, setPiForm] = useState({ fullName: "", mobile: "", email: "", passportId: "", city: "", country: "" });
  // A2A form state (Broker)
  const [a2aForm, setA2aForm] = useState({ companyName: "", address: "", tradeLicense: "", contactPerson: "", phone: "", email: "" });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setPi(field: string, value: string) {
    setPiForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
  }
  function setA2a(field: string, value: string) {
    setA2aForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    const errs: Record<string, boolean> = {};
    // Investor fields — always required
    if (!piForm.fullName.trim()) errs.fullName = true;
    if (!piForm.mobile.trim()) errs.mobile = true;
    if (!piForm.email.trim() || !emailRe.test(piForm.email)) errs.email = true;
    if (!piForm.city.trim()) errs.city = true;
    if (!piForm.country.trim()) errs.country = true;
    // Broker A2A fields — required only in Broker mode
    if (isBroker) {
      if (!a2aForm.companyName.trim()) errs.companyName = true;
      if (!a2aForm.address.trim()) errs.address = true;
      if (!a2aForm.tradeLicense.trim()) errs.tradeLicense = true;
      if (!a2aForm.contactPerson.trim()) errs.contactPerson = true;
      if (!a2aForm.phone.trim()) errs.phone = true;
      if (!a2aForm.email.trim() || !emailRe.test(a2aForm.email)) errs.brokerEmail = true;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (submitting) return; // prevent duplicate submissions

    if (enableOfferWebhook) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        let specName = "";
        let specEmail = "";
        try { specName = sessionStorage.getItem("Assignee_name") ?? ""; } catch {}
        try { specEmail = sessionStorage.getItem("Assignee_email") ?? ""; } catch {}

        const properties = selectedPlots.length > 0
          ? selectedPlots.map(p => ({
              id: p.id,
              Location: p.area,
              Price: p.askingPrice,
              Type: p.landUse,
              Area_sqft: p.plotArea,
              Ownership: "Free hold",
            }))
          : [{ id: "-", Location: "-", Price: 0, Type: "-", Area_sqft: 0, Ownership: "Free hold" }];

        const payload = isBroker
          ? {
              sourcePage: "/offer",
              sourceAction: "offer-popup-submit",
              agreement_type: "a2a",
              assignee_name: specName || "undefined",
              assignee_email: specEmail || "undefined",
              phone_number: piForm.mobile || a2aForm.phone || "-",
              src: "webpage",
              commission: "2%",
              properties: properties,
              data: {
                full_name: piForm.fullName || "-",
                mobile_number: piForm.mobile || "-",
                email: piForm.email || "-",
                id_number: piForm.passportId || "-",
                city: piForm.city || "-",
                country: piForm.country || "-",
                broker_company_name: a2aForm.companyName || "-",
                broker_trade_license_no: a2aForm.tradeLicense || "-",
                broker_contact_person: a2aForm.contactPerson || "-",
                broker_phone: a2aForm.phone || "-",
                broker_address: a2aForm.address || "-",
                broker_email: a2aForm.email || "-",
              },
            }
          : {
              sourcePage: "/offer",
              sourceAction: "offer-popup-submit",
              agreement_type: "b2a",
              phone_number: piForm.mobile || "-",
              src: "webpage",
              assignee_name: specName || "undefined",
              assignee_email: specEmail || "undefined",
              data: {
                investor_name: piForm.fullName || "-",
                investor_number: piForm.mobile || "null",
                email: piForm.email || "-",
                id_number: piForm.passportId || "-",
                city: piForm.city || "null",
                country: piForm.country || "-",
                properties: properties,
              },
              commission: "2%",
            };

        const res = await fetch("/api/offer/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : "Submission failed");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    // Store client details for /cta pre-fill
    try {
      sessionStorage.setItem("client_name", isBroker ? (a2aForm.contactPerson || piForm.fullName) : piForm.fullName);
      sessionStorage.setItem("client_email", isBroker ? (a2aForm.email || piForm.email) : piForm.email);
      sessionStorage.setItem("client_phone", isBroker ? (a2aForm.phone || piForm.mobile) : piForm.mobile);
    } catch {}

    setSubmitted(true);
    router.push("/cta");
  }

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* modal card — matches agreement card style */}
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-mint-light/30 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* close button */}
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-mint-bg hover:bg-mint-light/60 flex items-center justify-center transition-colors z-10">
          <svg className="w-3.5 h-3.5 text-deep-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {submitted ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 className="text-lg font-bold text-forest mb-1">Submitted</h3>
            <p className="text-xs text-muted max-w-xs">
              {isBroker
                ? "Your Agent to Agent Agreement has been submitted. A representative will review and countersign shortly."
                : "Your Property Introduction Form has been submitted. A specialist will be in touch shortly."}
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-deep-forest transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col p-5 gap-3">
            {/* Header */}
            <div className="bg-forest rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white">{isBroker ? "Agent to Agent Agreement" : "Property Introduction Form"}</p>
              <p className="text-sm font-bold text-white/80" dir="rtl">{isBroker ? "اتفاقية وسيط إلى وسيط" : "نموذج تعريف العقار"}</p>
            </div>

            {/* Investor / Broker toggle */}
            <div className="flex rounded-lg border border-mint-light overflow-hidden text-sm">
              {(["Investor", "Broker"] as const).map((m, i) => (
                <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); }}
                  className={`flex-1 px-3 py-2 transition-colors ${i > 0 ? "border-l border-mint-light" : ""} ${mode === m ? "bg-forest text-white" : "text-muted bg-white hover:bg-mint-bg"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Property / context summary */}
            <div className="bg-mint-bg/50 border border-mint-light/60 rounded-xl px-4 py-2">
              <div className={`grid gap-2 ${isBroker ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
                <div><p className="text-[11px] text-muted">Plot</p><p className="text-xs font-semibold text-deep-forest">{plotName}</p></div>
                {isBroker && <div><p className="text-[11px] text-muted">Company</p><p className="text-xs font-semibold text-deep-forest">Namou Properties LLC</p></div>}
                {isBroker && <div><p className="text-[11px] text-muted">Trade License</p><p className="text-xs font-semibold text-deep-forest">61781</p></div>}
                <div><p className="text-[11px] text-muted">{isBroker ? "Contact" : "Commission"}</p><p className="text-xs font-semibold text-deep-forest">{isBroker ? "reachus@namou.ae" : "2%"}</p></div>
              </div>
            </div>

            {/* Investor fields — always shown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full Name" required error={errors.fullName}>
                <input type="text" value={piForm.fullName} onChange={(e) => setPi("fullName", e.target.value)} maxLength={100} className={inputCls(errors.fullName)} placeholder="John Doe" />
              </Field>
              <Field label="Mobile Number" required error={errors.mobile}>
                <input type="tel" value={piForm.mobile} onChange={(e) => setPi("mobile", e.target.value)} maxLength={20} className={inputCls(errors.mobile)} placeholder="+971 50 000 0000" />
              </Field>
              <Field label="Email" required error={errors.email}>
                <input type="email" value={piForm.email} onChange={(e) => setPi("email", e.target.value)} maxLength={254} className={inputCls(errors.email)} placeholder="investor@email.com" />
              </Field>
              <Field label="Passport No / ID">
                <input type="text" value={piForm.passportId} onChange={(e) => setPi("passportId", e.target.value)} maxLength={30} className={inputCls(false)} placeholder="A12345678" />
              </Field>
              <Field label="City" required error={errors.city}>
                <input type="text" value={piForm.city} onChange={(e) => setPi("city", e.target.value)} maxLength={80} className={inputCls(errors.city)} placeholder="Dubai" />
              </Field>
              <Field label="Country" required error={errors.country}>
                <input type="text" value={piForm.country} onChange={(e) => setPi("country", e.target.value)} maxLength={80} className={inputCls(errors.country)} placeholder="UAE" />
              </Field>
            </div>

            {/* A2A Broker fields — visible always, disabled/greyed when Investor */}
            <div className={!isBroker ? "opacity-40 pointer-events-none" : ""}>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1.5">Broker Details (Agent to Agent)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Field label="Company Name" required={isBroker} error={isBroker ? errors.companyName : false}>
                    <input type="text" value={a2aForm.companyName} onChange={(e) => setA2a("companyName", e.target.value)} disabled={!isBroker} maxLength={100} className={inputCls(isBroker ? errors.companyName : false)} placeholder="ABC Real Estate" />
                  </Field>
                  <Field label="Trade License No." required={isBroker} error={isBroker ? errors.tradeLicense : false}>
                    <input type="text" value={a2aForm.tradeLicense} onChange={(e) => setA2a("tradeLicense", e.target.value)} disabled={!isBroker} maxLength={30} className={inputCls(isBroker ? errors.tradeLicense : false)} placeholder="DXB-0000-0000" />
                  </Field>
                  <Field label="Contact Person" required={isBroker} error={isBroker ? errors.contactPerson : false}>
                    <input type="text" value={a2aForm.contactPerson} onChange={(e) => setA2a("contactPerson", e.target.value)} disabled={!isBroker} maxLength={100} className={inputCls(isBroker ? errors.contactPerson : false)} placeholder="Jane Smith" />
                  </Field>
                  <Field label="Phone" required={isBroker} error={isBroker ? errors.phone : false}>
                    <input type="tel" value={a2aForm.phone} onChange={(e) => setA2a("phone", e.target.value)} disabled={!isBroker} maxLength={20} className={inputCls(isBroker ? errors.phone : false)} placeholder="+971 50 000 0000" />
                  </Field>
                  <Field label="Address" required={isBroker} error={isBroker ? errors.address : false}>
                    <input type="text" value={a2aForm.address} onChange={(e) => setA2a("address", e.target.value)} disabled={!isBroker} maxLength={200} className={inputCls(isBroker ? errors.address : false)} placeholder="Business Bay, Dubai, UAE" />
                  </Field>
                  <Field label="Broker Email" required={isBroker} error={isBroker ? errors.brokerEmail : false}>
                    <input type="email" value={a2aForm.email} onChange={(e) => setA2a("email", e.target.value)} disabled={!isBroker} maxLength={254} className={inputCls(isBroker ? errors.brokerEmail : false)} placeholder="agent@company.com" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Error message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                {submitError}
              </div>
            )}

            {/* Date + Submit */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] text-muted mb-1">Date</p>
                <p className="text-xs font-medium text-deep-forest bg-mint-bg/40 border border-mint-light/40 rounded-lg px-3 py-1.5">{dateStr}</p>
              </div>
              <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-deep-forest transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Submit Offer Form Modal ── */

function SubmitOfferModal({ plot, onClose, onSubmitted }: { plot: Plot; onClose: () => void; onSubmitted: (priceOffer: string, paymentPlan: string) => void }) {
  const [form, setForm] = useState({
    fullName: "", mobile: "", email: "", passportId: "", city: "", country: "",
    priceOffer: plot.askingPrice ? formatNumber(plot.askingPrice) : "",
    paymentInstallments: plot.paymentPlan ?? "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setF(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, boolean> = {};
    if (!form.fullName.trim()) errs.fullName = true;
    if (!form.mobile.trim()) errs.mobile = true;
    if (!form.email.trim() || !emailRe.test(form.email)) errs.email = true;
    if (!form.city.trim()) errs.city = true;
    if (!form.country.trim()) errs.country = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    let specName = ""; let specEmail = "";
    try { specName = sessionStorage.getItem("Assignee_name") ?? ""; } catch {}
    try { specEmail = sessionStorage.getItem("Assignee_email") ?? ""; } catch {}

    // Store client details for /cta pre-fill
    try {
      sessionStorage.setItem("client_name", form.fullName);
      sessionStorage.setItem("client_email", form.email);
      sessionStorage.setItem("client_phone", form.mobile);
    } catch {}

    const payload = {
      sourcePage: "/offer",
      sourceAction: "offer-popup-submit",
      agreement_type: "b2a",
      phone_number: form.mobile || "-",
      src: "webpage",
      assignee_name: specName || "undefined",
      assignee_email: specEmail || "undefined",
      data: {
        investor_name: form.fullName || "-",
        investor_number: form.mobile || "null",
        email: form.email || "-",
        id_number: form.passportId || "-",
        city: form.city || "null",
        country: form.country || "-",
        price_offer: form.priceOffer || String(plot.askingPrice),
        payment_installments: form.paymentInstallments || plot.paymentPlan || "-",
        properties: [{ id: plot.id, Location: plot.area, Price: plot.askingPrice, Type: plot.landUse, Area_sqft: plot.plotArea, Ownership: "Free hold" }],
      },
      commission: "2%",
    };

    try {
      const res = await fetch("/api/offer/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSubmitted(form.priceOffer || formatNumber(plot.askingPrice), form.paymentInstallments || plot.paymentPlan || "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-mint-light/30 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-mint-bg hover:bg-mint-light/60 flex items-center justify-center transition-colors z-10">
          <svg className="w-3.5 h-3.5 text-deep-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <form onSubmit={handleSubmit} className="flex flex-col p-5 gap-3">
          <div className="bg-forest rounded-xl px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Submit Your Offer Form</p>
            <p className="text-sm font-bold text-white/80" dir="rtl">نموذج تقديم العرض</p>
          </div>

          <div className="bg-mint-bg/50 border border-mint-light/60 rounded-xl px-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-[11px] text-muted">Plot</p><p className="text-xs font-semibold text-deep-forest">{plot.name}</p></div>
              <div><p className="text-[11px] text-muted">Asking Price</p><p className="text-xs font-semibold text-deep-forest">AED {formatNumber(plot.askingPrice)}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full Name" required error={errors.fullName}>
              <input type="text" value={form.fullName} onChange={e => setF("fullName", e.target.value)} maxLength={100} className={inputCls(errors.fullName)} placeholder="John Doe" />
            </Field>
            <Field label="Mobile Number" required error={errors.mobile}>
              <input type="tel" value={form.mobile} onChange={e => setF("mobile", e.target.value)} maxLength={20} className={inputCls(errors.mobile)} placeholder="+971 50 000 0000" />
            </Field>
            <Field label="Email" required error={errors.email}>
              <input type="email" value={form.email} onChange={e => setF("email", e.target.value)} maxLength={254} className={inputCls(errors.email)} placeholder="investor@email.com" />
            </Field>
            <Field label="Passport No / ID">
              <input type="text" value={form.passportId} onChange={e => setF("passportId", e.target.value)} maxLength={30} className={inputCls(false)} placeholder="A12345678" />
            </Field>
            <Field label="City" required error={errors.city}>
              <input type="text" value={form.city} onChange={e => setF("city", e.target.value)} maxLength={80} className={inputCls(errors.city)} placeholder="Dubai" />
            </Field>
            <Field label="Country" required error={errors.country}>
              <input type="text" value={form.country} onChange={e => setF("country", e.target.value)} maxLength={80} className={inputCls(errors.country)} placeholder="UAE" />
            </Field>
          </div>

          <div className="border-t border-mint-light/40 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Price Offer (AED)">
              <input type="text" value={form.priceOffer} onChange={e => setF("priceOffer", e.target.value)} className={inputCls()} placeholder={`AED ${formatNumber(plot.askingPrice)}`} />
            </Field>
            <Field label="Payment Installments">
              <input type="text" value={form.paymentInstallments} onChange={e => setF("paymentInstallments", e.target.value)} className={inputCls()} placeholder={plot.paymentPlan || "e.g. 10% Booking / 90% SPA"} />
            </Field>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{submitError}</div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted mb-1">Date</p>
              <p className="text-xs font-medium text-deep-forest bg-mint-bg/40 border border-mint-light/40 rounded-lg px-3 py-1.5">
                {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-deep-forest transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinalOfferPage() {
  const [roiData, setRoiData] = useState<ROIData | null>(null);
  const [sourcePlot, setSourcePlot] = useState<Plot | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id ?? "");
  const [comparePlots, setComparePlots] = useState<Plot[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [dealRef, setDealRef] = useState<string | null>(null);
  const [submittedPrice, setSubmittedPrice] = useState<string | null>(null);
  const [showNextSteps, setShowNextSteps] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { const s = sessionStorage.getItem("roi_results"); if (s) setRoiData(JSON.parse(s)); } catch {}
    try { const s = sessionStorage.getItem("selected_plot"); if (s) { const p: Plot = JSON.parse(s); setSourcePlot(p); setSelectedPlotId(p.id); } } catch {}
    try { const s = sessionStorage.getItem("compare_plots"); if (s) { const cp: Plot[] = JSON.parse(s); if (cp.length === 2) setComparePlots(cp); } } catch {}
    setHydrated(true);
  }, []);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId) || plots[0];
  const selectedPlots = comparePlots.length === 2 ? comparePlots : [selectedPlot];
  const hasROI = roiData !== null;

  // Use ROI data if available, otherwise fall back to basic calculation
  const offerSummary = useMemo(() => {
    if (hasROI) {
      const r = roiData.results;
      return {
        landCost: r.landCost,
        totalCost: r.totalCost,
        revenue: r.revenue,
        profit: r.profit,
        profitMargin: r.profitMargin,
        returnOnCost: r.returnOnCost,
        gfa: r.gfa,
        nsa: r.nsa,
        rlv: r.rlv,
        scenario: roiData.activeScenario,
      };
    }
    // Fallback
    const gfa = selectedPlot.gfa || selectedPlot.plotArea * (selectedPlot.far || 3);
    const nsa = gfa * 0.8;
    const landCost = selectedPlot.askingPrice;
    const constructionCost = gfa * 900 * 1.1;
    const totalCost = landCost + constructionCost;
    const revenue = nsa * 3200;
    const profit = revenue - totalCost;
    return {
      landCost,
      totalCost,
      revenue,
      profit,
      profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      returnOnCost: totalCost > 0 ? (profit / totalCost) * 100 : 0,
      gfa,
      nsa,
      rlv: revenue * 0.8 - constructionCost,
      scenario: "base",
    };
  }, [hasROI, roiData, selectedPlot]);

  const scenarioLabel = offerSummary.scenario === "conservative" ? "Conservative"
    : offerSummary.scenario === "optimistic" ? "Optimistic" : "Base Case";

  const paymentStages = useMemo(() => {
    if (!selectedPlot.paymentPlan) return [];
    return parsePaymentStages(selectedPlot.paymentPlan, offerSummary.landCost);
  }, [selectedPlot, offerSummary.landCost]);

  if (!hydrated) return null;

  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      <div className="shrink-0">
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">Payment Plan</h1>
        <p className="text-sm text-muted mt-1">
          {hasROI
            ? "Review the payment schedule based on your selected plot and ROI variables."
            : "Select a plot and review the payment plan below."}
        </p>
      </div>

      {/* Source info bar */}
      {hasROI && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-mint-bg/50 rounded-xl px-4 py-2 border border-mint-light/40 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {sourcePlot && (
              <span className="text-sm font-medium text-forest bg-forest/10 border border-forest/20 px-3 py-1 rounded-full">
                {sourcePlot.name}
              </span>
            )}
            <span className="text-sm text-muted">Scenario:</span>
            <span className="text-sm font-bold text-forest">{scenarioLabel}</span>
          </div>
          <Link href="/roi" className="text-sm text-forest font-medium hover:underline">Edit in ROI Simulator</Link>
        </div>
      )}

      {/* Plot selector — only if no ROI data */}
      {!hasROI && (
        <ContentCard>
          <h2 className="text-sm font-semibold text-deep-forest mb-3">Select Plot</h2>
          <div className="flex gap-2 flex-wrap">
            {plots.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPlotId(p.id); setSubmitted(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  selectedPlotId === p.id
                    ? "bg-forest text-white border-forest"
                    : "bg-mint-white text-deep-forest border-mint-light hover:border-forest/30"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </ContentCard>
      )}

      {/* Payment plan summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <ContentCard className="bg-mint-bg border-mint-light text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Land Price</p>
          <p className="text-2xl font-bold font-heading text-deep-forest">{fmtAED(offerSummary.landCost)}</p>
          <p className="text-xs text-muted font-heading mt-1">{formatNumber(selectedPlot.plotArea)} sqft</p>
        </ContentCard>
        <ContentCard className="bg-mint-bg border-mint-light text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Dev. Cost</p>
          <p className="text-2xl font-bold font-heading text-deep-forest">{fmtAED(offerSummary.totalCost)}</p>
          <p className="text-xs text-muted mt-1">Land + Construction</p>
        </ContentCard>
        <ContentCard className="bg-forest/10 border-forest/20 text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Payment Stages</p>
          <p className="text-2xl font-bold font-heading text-deep-forest">{paymentStages.length}</p>
          <p className="text-xs text-muted mt-1">{selectedPlot.paymentPlan ? "Structured plan" : "No plan"}</p>
        </ContentCard>
        <ContentCard className="bg-forest/10 border-forest/20 text-center">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Projected Profit</p>
          <p className={`text-2xl font-bold font-heading ${offerSummary.profit > 0 ? "text-forest" : "text-red-600"}`}>{fmtAED(offerSummary.profit)}</p>
          <p className="text-xs text-muted font-heading mt-1">{offerSummary.profitMargin.toFixed(1)}% margin</p>
        </ContentCard>
      </div>

      {/* Cost breakdown + offer details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
        <ContentCard className="flex flex-col">
          <p className="text-xs uppercase tracking-widest text-muted font-semibold mb-1 text-center shrink-0">Payment Installments</p>
          <div className="flex-1 flex flex-col justify-center">
          {(() => {
            // Build fee rows (excluding annual service charge)
            const feeRows = [
              { label: "Land Registration Fee", pct: selectedPlot.landRegFeePct, amount: selectedPlot.landRegFee },
              { label: "Commission Fee", pct: selectedPlot.commissionFeePct, amount: selectedPlot.commissionFee },
              { label: "Admin Fee", pct: selectedPlot.adminFeePct, amount: selectedPlot.adminFee },
            ].filter(f => f.amount && parseFloat(f.amount.replace(/[^0-9.]/g, "")) > 0);

            // Annual service charge (separate display)
            const asc = selectedPlot.annualServiceCharge;
            const ascNum = asc ? parseFloat(asc.replace(/[^0-9.]/g, "")) : 0;

            // Compute total = land cost + fees + annual charge
            const feeTotal = feeRows.reduce((sum, f) => sum + parseFloat((f.amount ?? "0").replace(/[^0-9.]/g, "")), 0);
            const grandTotal = offerSummary.landCost + feeTotal + ascNum;

            const allRows = paymentStages.length > 0 || feeRows.length > 0;

            return allRows ? (
              <>
                <div className="flex-1 flex flex-col divide-y divide-mint-light/60">
                  {/* Payment stages */}
                  {paymentStages.map((stage, i) => (
                    <div key={i} className="flex-1 grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 min-h-[44px]">
                      <span className="w-7 h-7 rounded-full bg-forest/10 text-forest text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <p className="text-sm font-bold text-deep-forest"><span className="text-base">{stage.pct}%</span> <span className="text-muted font-semibold">– {stage.label}</span></p>
                      <p className="text-sm font-bold text-deep-forest text-right whitespace-nowrap">{fmtAED(stage.amount)}</p>
                    </div>
                  ))}

                  {/* Fee rows */}
                  {feeRows.map((f, i) => (
                    <div key={f.label} className="flex-1 grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 min-h-[44px]">
                      <span className="w-7 h-7 rounded-full bg-forest/10 text-forest text-xs font-bold flex items-center justify-center">{paymentStages.length + i + 1}</span>
                      <p className="text-sm font-bold text-deep-forest"><span className="text-base">{f.pct?.trim() || "—"}</span> <span className="text-muted font-semibold">– {f.label}</span></p>
                      <p className="text-sm font-bold text-deep-forest text-right whitespace-nowrap">AED {f.amount}</p>
                    </div>
                  ))}

                  {/* Annual Service Charge — different style */}
                  {ascNum > 0 && (
                    <div className="flex-1 grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 min-h-[44px] bg-mint-bg/30">
                      <span className="w-7 h-7 rounded-full bg-mint-light/60 text-muted text-xs font-bold flex items-center justify-center">{paymentStages.length + feeRows.length + 1}</span>
                      <p className="text-sm font-semibold text-muted">Annual Service Charge</p>
                      <p className="text-sm font-bold text-deep-forest text-right whitespace-nowrap">AED {asc}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t-2 border-forest/20 flex justify-between text-sm shrink-0">
                  <span className="font-semibold text-deep-forest">Total</span>
                  <span className="font-bold text-forest text-base">{fmtAED(grandTotal)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted italic flex-1 flex items-center">No payment plan available for this plot.</p>
            );
          })()}
          </div>
        </ContentCard>

        {/* Next steps */}
        {!submitted ? (
          <ContentCard className="flex flex-col">
            <p className="text-xs uppercase tracking-widest text-muted mb-2 font-semibold text-center">What Happens Next</p>
            <div className="flex-1 bg-mint-bg/40 rounded-xl border border-mint-light/40 p-5 mb-3 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col justify-around gap-3">
                {[
                  { step: "1", text: "Agreement form delivered for client e-signature" },
                  { step: "2", text: "Deal documentation, ROI calculations, and brochure shared" },
                  { step: "3", text: "Deal reviewed within 5-7 business days" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-4">
                    <span className="w-9 h-9 rounded-full bg-forest/10 text-forest text-base font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </span>
                    <p className="text-base lg:text-lg text-deep-forest leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => setShowNextSteps(true)}
                className="px-6 py-3 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-deep-forest transition-colors"
              >
                Next Steps
              </button>
            </div>
          </ContentCard>
        ) : (
          <ContentCard className="border-mint bg-mint-white flex flex-col">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-forest flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-forest">Offer Submitted</h2>
                <p className="text-sm text-muted mt-1">
                  Your offer of <strong className="text-forest">AED {submittedPrice ?? formatNumber(offerSummary.landCost)}</strong> for
                  plot <strong>{selectedPlot.name}</strong> has been recorded.
                </p>
                <p className="text-sm text-muted mt-2">
                  A secure deal link has been generated. Your specialist will contact you
                  with next steps and signing instructions.
                </p>
                <div className="mt-3 p-2 bg-white rounded-lg border border-mint-light text-xs text-muted font-mono">
                  Deal ref: {dealRef}
                </div>
              </div>
            </div>
          </ContentCard>
        )}
      </div>

      {/* Next Steps modal */}
      {showNextSteps && (
        <NextStepsModal onClose={() => setShowNextSteps(false)} plotName={selectedPlot.name} selectedPlots={selectedPlots} enableOfferWebhook />
      )}

      {/* Submit Offer Form modal */}
      {showOfferForm && (
        <SubmitOfferModal
          plot={selectedPlot}
          onClose={() => setShowOfferForm(false)}
          onSubmitted={(priceOffer) => {
            setShowOfferForm(false);
            setSubmittedPrice(priceOffer);
            setDealRef(`NAMOU-${selectedPlot.name}-${Date.now().toString(36).toUpperCase()}`);
            setSubmitted(true);
          }}
        />
      )}
    </div>
  );
}

