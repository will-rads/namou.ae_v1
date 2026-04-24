"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ContentCard from "@/components/ContentCard";
import { plots, type Plot, formatNumber } from "@/data/mock";

const actions = [
  {
    title: "Schedule a Site Visit",
    description: "Visit the plot to assess access, context, and development positioning.",
    href: "/site-visit",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
      </svg>
    ),
    timeline: "Coordinated with your specialist",
    prep: "On-site",
    details: "Review the plot, surroundings, and infrastructure in person.",
    hasCalendar: true,
  },
  {
    title: "Schedule a Follow-up Meeting",
    description: "Continue the conversation on pricing, structure, or remaining questions.",
    href: "#",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    ),
    timeline: "Scheduled on request",
    prep: "Remote call",
    details: "Short session to align on next steps and open items.",
    hasCalendar: true,
  },
];

const TIME_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CTAPage() {
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("selected_plot");
      if (s) setSelectedPlot(JSON.parse(s));
    } catch {}
  }, []);

  const offerPlot = selectedPlot ? (plots.find(p => p.id === selectedPlot.id) ?? selectedPlot) : plots[0];

  const [calendarAction, setCalendarAction] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingName, setBookingName] = useState(() => {
    try { return sessionStorage.getItem("client_name") ?? ""; } catch { return ""; }
  });
  const [bookingEmail, setBookingEmail] = useState(() => {
    try { return sessionStorage.getItem("client_email") ?? ""; } catch { return ""; }
  });
  const [bookingPhone, setBookingPhone] = useState(() => {
    try { return sessionStorage.getItem("client_phone") ?? ""; } catch { return ""; }
  });

  /* Brochure form state */
  const [brochureOpen, setBrochureOpen] = useState(false);
  const [brochureForm, setBrochureForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [brochureErrors, setBrochureErrors] = useState<Record<string, boolean>>({});
  const [brochureSubmitted, setBrochureSubmitted] = useState(false);

  function openBrochure() {
    setBrochureForm({ firstName: "", lastName: "", email: "", phone: "" });
    setBrochureErrors({});
    setBrochureSubmitted(false);
    setBrochureOpen(true);
  }
  function closeBrochure() { setBrochureOpen(false); }
  function setBF(field: string, value: string) {
    setBrochureForm((prev) => ({ ...prev, [field]: value }));
    if (brochureErrors[field]) setBrochureErrors((prev) => ({ ...prev, [field]: false }));
  }
  function submitBrochure(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, boolean> = {};
    if (!brochureForm.firstName.trim()) errs.firstName = true;
    if (!brochureForm.lastName.trim()) errs.lastName = true;
    if (!brochureForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(brochureForm.email)) errs.email = true;
    if (!brochureForm.phone.trim()) errs.phone = true;
    setBrochureErrors(errs);
    if (Object.keys(errs).length === 0) setBrochureSubmitted(true);
  }

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewDate]);

  function openCalendar(actionTitle: string) {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(null);
    setSelectedTime(null);
    setConfirmed(false);
    setSubmitError(null);
    // Re-read session in case user just came from agreement flow
    try { setBookingName(prev => prev || sessionStorage.getItem("client_name") || ""); } catch {}
    try { setBookingEmail(prev => prev || sessionStorage.getItem("client_email") || ""); } catch {}
    try { setBookingPhone(prev => prev || sessionStorage.getItem("client_phone") || ""); } catch {}
    setCalendarAction(actionTitle);
  }

  function closeCalendar() {
    setCalendarAction(null);
  }

  function prevMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
  }

  function nextMonth() {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
  }

  function selectDay(day: number) {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (d < today) return;
    setSelectedDate(d);
    setSelectedTime(null);
    setConfirmed(false);
  }

  function isSelected(day: number) {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === viewDate.getFullYear()
      && selectedDate.getMonth() === viewDate.getMonth()
      && selectedDate.getDate() === day;
  }

  function isToday(day: number) {
    return today.getFullYear() === viewDate.getFullYear()
      && today.getMonth() === viewDate.getMonth()
      && today.getDate() === day;
  }

  function isPast(day: number) {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    return d < today;
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedTime || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    // Convert "01:30 PM" → "13:30"
    const timeParts = selectedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let time24 = selectedTime;
    if (timeParts) {
      let h = parseInt(timeParts[1]);
      const m = timeParts[2];
      const ampm = timeParts[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      time24 = `${String(h).padStart(2, "0")}:${m}`;
    }

    // Format date as YYYY-MM-DD
    const y = selectedDate.getFullYear();
    const mo = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const da = String(selectedDate.getDate()).padStart(2, "0");
    const dayStr = `${y}-${mo}-${da}`;

    // Determine meeting type from calendar action
    const meetingType = calendarAction === "Schedule a Site Visit" ? "Site-Visit" : "Video-Call";

    // Read specialist email from session (selected on /home)
    let assignee = "";
    try { assignee = sessionStorage.getItem("Assignee_email") ?? ""; } catch {}

    const payload = {
      sourcePage: "/cta",
      sourceAction: "booking-confirm",
      phone_number: bookingPhone,
      scheduled_day: dayStr,
      scheduled_time: time24,
      meeting_type: meetingType,
      src: "Webpage",
      email: bookingEmail,
      name: bookingName,
      assignee: assignee,
    };

    try {
      const res = await fetch("/api/booking/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Booking failed");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setConfirmed(true);
  }

  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      <div className="shrink-0">
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">Next Steps</h1>
        <p className="text-sm text-muted mt-1">
          Choose how to move forward with this opportunity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 md:grid-rows-[1fr_1fr]">
        {actions.map((action) => {
          const inner = (
            <ContentCard
              className="w-full flex flex-col py-5 px-5 transition-all group-hover:shadow-md group-hover:border-forest/30"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-forest/10 text-forest">
                  {action.icon}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-deep-forest">{action.title}</h2>
                  <p className="text-sm mt-2 text-muted leading-relaxed">{action.description}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 justify-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-forest bg-forest/8 border border-forest/15 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {action.timeline}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-deep-forest bg-mint-bg border border-mint-light/60 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  {action.prep}
                </span>
              </div>

              <p className="mt-4 text-xs text-muted leading-relaxed text-center">{action.details}</p>

              <div className="mt-auto pt-4 flex items-center justify-center text-xs font-medium text-forest opacity-0 group-hover:opacity-100 transition-opacity">
                Get started
                <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </ContentCard>
          );

          if (action.hasCalendar) {
            return (
              <button
                key={action.title}
                onClick={() => openCalendar(action.title)}
                className="group flex text-left"
              >
                {inner}
              </button>
            );
          }

          if ((action as typeof action & { hasBrochureForm?: boolean }).hasBrochureForm) {
            return (
              <button
                key={action.title}
                onClick={openBrochure}
                className="group flex text-left"
              >
                {inner}
              </button>
            );
          }

          return (
            <Link key={action.title} href={action.href} className="group flex">
              {inner}
            </Link>
          );
        })}

        {/* Submit Your Offer — spans full width of bottom row */}
        <button onClick={() => setShowOfferForm(true)} className="group flex md:col-span-2 text-left">
          <ContentCard className="w-full flex flex-col py-5 px-5 transition-all group-hover:shadow-md group-hover:border-forest/30">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-forest/10 text-forest">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-deep-forest text-center">Submit Your Offer</h2>
                <p className="text-sm mt-2.5 text-muted leading-relaxed text-center">Confirm the deal structure and submit for formal review.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-forest bg-forest/8 border border-forest/15 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Specialist review
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-deep-forest bg-mint-bg border border-mint-light/60 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                Selected plot required
              </span>
            </div>

            <p className="mt-4 text-xs text-muted leading-relaxed text-center">Proceeds to offer submission for the selected plot.</p>

            <div className="mt-auto pt-4 flex items-center justify-center text-xs font-medium text-forest opacity-0 group-hover:opacity-100 transition-opacity">
              Submit offer
              <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </ContentCard>
        </button>
      </div>

      {/* Calendar Modal */}
      {calendarAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-deep-forest/60 backdrop-blur-sm" onClick={closeCalendar} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden w-full h-full md:w-[75vw] md:h-[75vh] flex flex-col">
            {/* Header */}
            <div className="bg-forest px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Image
                  src="/logo.png"
                  alt="Namou"
                  width={120}
                  height={40}
                  className="object-contain h-6 sm:h-8 w-auto brightness-0 invert shrink-0"
                />
                <div className="w-px h-6 sm:h-8 bg-white/20 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-white/90 truncate">{calendarAction}</p>
              </div>
              <button onClick={closeCalendar} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {confirmed ? (
              /* Confirmation */
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h3 className="text-xl font-bold text-forest mb-2">Confirmed</h3>
                <p className="text-sm text-muted">
                  Your <strong className="text-deep-forest">{calendarAction?.toLowerCase()}</strong> is scheduled for{" "}
                  <strong className="text-deep-forest">
                    {selectedDate && `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`}
                  </strong>{" "}
                  at <strong className="text-deep-forest">{selectedTime}</strong>.
                </p>
                <p className="text-xs text-muted mt-3">Your Namou specialist will send a confirmation shortly.</p>
                <button
                  onClick={closeCalendar}
                  className="mt-6 px-8 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-deep-forest transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Calendar + Time picker */
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-y-hidden">
                {/* Calendar */}
                <div className="flex-1 px-4 sm:px-10 py-4 sm:py-8 flex flex-col min-h-0">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-3 sm:mb-5">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-mint-bg transition-colors text-muted hover:text-forest">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <h3 className="text-base sm:text-xl font-bold text-deep-forest">
                      {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </h3>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-mint-bg transition-colors text-muted hover:text-forest">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-3">
                    {DAYS.map(d => (
                      <div key={d} className="text-center text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider py-1 sm:py-2">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-3 flex-1" style={{ gridAutoRows: "1fr" }}>
                    {calendarDays.map((day, i) => {
                      if (day === null) return <div key={`e-${i}`} />;
                      const past = isPast(day);
                      const sel = isSelected(day);
                      const tod = isToday(day);
                      return (
                        <button
                          key={day}
                          onClick={() => selectDay(day)}
                          disabled={past}
                          className={`
                            w-full rounded-lg sm:rounded-xl text-sm sm:text-lg font-medium transition-colors flex items-center justify-center
                            ${sel
                              ? "bg-forest text-white"
                              : tod
                                ? "bg-forest/10 text-forest font-bold ring-2 ring-forest/30"
                                : past
                                  ? "text-muted/30 cursor-not-allowed"
                                  : "text-deep-forest hover:bg-mint-bg"
                            }
                          `}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots — visible when a date is selected */}
                <div className={`w-full md:w-72 border-t md:border-t-0 md:border-l border-mint-light/40 flex flex-col transition-all ${selectedDate ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                  <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-mint-light/40">
                    <p className="text-xs sm:text-sm uppercase tracking-widest text-muted font-semibold">
                      {selectedDate
                        ? `${MONTHS[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}`
                        : "Select a date"}
                    </p>
                    <p className="text-sm sm:text-base text-muted mt-1">Pick a time</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-2 md:gap-0 md:space-y-2.5 md:block">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`w-full px-2 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-base font-medium transition-colors text-center ${
                          selectedTime === time
                            ? "bg-forest text-white"
                            : "border border-mint-light text-deep-forest hover:border-forest/30 hover:bg-mint-bg"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  {/* Contact details + Confirm */}
                  <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-mint-light/40 space-y-2">
                    <input type="text" placeholder="Your name" value={bookingName} onChange={e => setBookingName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-mint-light/60 text-sm text-deep-forest placeholder:text-muted/50 outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/10" />
                    <input type="email" placeholder="Your email" value={bookingEmail} onChange={e => setBookingEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-mint-light/60 text-sm text-deep-forest placeholder:text-muted/50 outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/10" />
                    <input type="tel" placeholder="Phone number" value={bookingPhone} onChange={e => setBookingPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-mint-light/60 text-sm text-deep-forest placeholder:text-muted/50 outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/10" />
                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-2">
                        {submitError}
                      </div>
                    )}
                    <button
                      onClick={handleConfirm}
                      disabled={!selectedDate || !selectedTime || submitting}
                      className={`w-full py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                        selectedDate && selectedTime && !submitting
                          ? "bg-forest text-white hover:bg-deep-forest"
                          : "bg-mint-light/50 text-muted cursor-not-allowed"
                      }`}
                    >
                      {submitting ? "Confirming…" : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brochure Form Modal */}
      {brochureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-deep-forest/60 backdrop-blur-sm" onClick={closeBrochure} />

          <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden w-full max-w-md mx-4 flex flex-col">
            {/* Header */}
            <div className="bg-forest px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="Namou" width={120} height={40} className="object-contain h-7 w-auto brightness-0 invert" />
                <div className="w-px h-7 bg-white/20" />
                <p className="text-sm font-medium text-white/90">Receive Brochures</p>
              </div>
              <button onClick={closeBrochure} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {brochureSubmitted ? (
              <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h3 className="text-xl font-bold text-forest mb-2">Request Received</h3>
                <p className="text-sm text-muted">
                  We&apos;ll send your brochures and ROI calculations to <strong className="text-deep-forest">{brochureForm.email}</strong> shortly.
                </p>
                <button onClick={closeBrochure} className="mt-6 px-8 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-deep-forest transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitBrochure} className="px-6 py-6 flex flex-col gap-4">
                <p className="text-xs text-muted leading-relaxed">Enter your details below and we&apos;ll send you detailed property brochures and personalised ROI calculations.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-deep-forest">First Name<span className="text-red-400 ml-0.5">*</span></span>
                    <input type="text" value={brochureForm.firstName} onChange={(e) => setBF("firstName", e.target.value)} maxLength={80} placeholder="John" className={`w-full px-4 py-2.5 rounded-xl border text-sm text-deep-forest placeholder:text-muted/50 outline-none transition-colors ${brochureErrors.firstName ? "border-red-400 bg-red-50/30" : "border-mint-light/60 bg-white focus:border-forest/40 focus:ring-1 focus:ring-forest/10"}`} />
                    {brochureErrors.firstName && <span className="text-[11px] text-red-500">Required</span>}
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-deep-forest">Last Name<span className="text-red-400 ml-0.5">*</span></span>
                    <input type="text" value={brochureForm.lastName} onChange={(e) => setBF("lastName", e.target.value)} maxLength={80} placeholder="Doe" className={`w-full px-4 py-2.5 rounded-xl border text-sm text-deep-forest placeholder:text-muted/50 outline-none transition-colors ${brochureErrors.lastName ? "border-red-400 bg-red-50/30" : "border-mint-light/60 bg-white focus:border-forest/40 focus:ring-1 focus:ring-forest/10"}`} />
                    {brochureErrors.lastName && <span className="text-[11px] text-red-500">Required</span>}
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-deep-forest">Email<span className="text-red-400 ml-0.5">*</span></span>
                  <input type="email" value={brochureForm.email} onChange={(e) => setBF("email", e.target.value)} maxLength={254} placeholder="john@email.com" className={`w-full px-4 py-2.5 rounded-xl border text-sm text-deep-forest placeholder:text-muted/50 outline-none transition-colors ${brochureErrors.email ? "border-red-400 bg-red-50/30" : "border-mint-light/60 bg-white focus:border-forest/40 focus:ring-1 focus:ring-forest/10"}`} />
                  {brochureErrors.email && <span className="text-[11px] text-red-500">Valid email required</span>}
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-deep-forest">Phone Number<span className="text-red-400 ml-0.5">*</span></span>
                  <input type="tel" value={brochureForm.phone} onChange={(e) => setBF("phone", e.target.value)} maxLength={20} placeholder="+971 50 000 0000" className={`w-full px-4 py-2.5 rounded-xl border text-sm text-deep-forest placeholder:text-muted/50 outline-none transition-colors ${brochureErrors.phone ? "border-red-400 bg-red-50/30" : "border-mint-light/60 bg-white focus:border-forest/40 focus:ring-1 focus:ring-forest/10"}`} />
                  {brochureErrors.phone && <span className="text-[11px] text-red-500">Required</span>}
                </label>

                <button type="submit" className="w-full py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-deep-forest transition-colors mt-2">
                  Send Me the Brochures
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Submit Offer Modal */}
      {showOfferForm && offerPlot && (
        <SubmitOfferModal
          plot={offerPlot}
          onClose={() => setShowOfferForm(false)}
          onSubmitted={() => setShowOfferForm(false)}
        />
      )}
    </div>
  );
}

/* ── Submit Offer Modal (inline) ── */

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</p>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
    </div>
  );
}

function inputCls(error?: boolean) {
  return `w-full px-3 py-2 rounded-lg border text-sm text-deep-forest placeholder:text-muted/50 outline-none transition-colors ${error ? "border-red-400 bg-red-50/30" : "border-mint-light/60 bg-white focus:border-forest/40"}`;
}

function SubmitOfferModal({ plot, onClose, onSubmitted }: { plot: Plot; onClose: () => void; onSubmitted: () => void }) {
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

    try {
      sessionStorage.setItem("client_name", form.fullName);
      sessionStorage.setItem("client_email", form.email);
      sessionStorage.setItem("client_phone", form.mobile);
    } catch {}

    const payload = {
      sourcePage: "/cta",
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
    onSubmitted();
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
