"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const SPECIALISTS = [
  { name: "Dani Chamoun", email: "dany@namou.ae" },
  { name: "Charlie Daher", email: "charlie@namou.ae", image: "/charlie-daher-profile.jpeg" },
  { name: "Nadim Salameh", email: "nadim@namou.ae" },
  { name: "Jad Barghout", email: "jad@namou.ae" },
  { name: "Sarah berri", email: "sarahberrii@namou.ae" },
  { name: "Omar Arida", email: "omar@namou.ae" },
];

export default function LandingPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Landing on /home starts a new session — clear previous session data
  useEffect(() => {
    try { sessionStorage.clear(); } catch {}
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function pick(specialist: { name: string; email: string; image?: string }) {
    setSelected(specialist.name);
    setOpen(false);
    try {
      sessionStorage.setItem("Assignee_email", specialist.email);
      sessionStorage.setItem("Assignee_name", specialist.name);
      if (specialist.image) sessionStorage.setItem("Assignee_image", specialist.image);
      else sessionStorage.removeItem("Assignee_image");
    } catch {}
  }

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Background image */}
      <Image
        src="/thank-you-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        quality={75}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-deep-forest/40" />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-12 py-4 sm:py-6">
        <div />
        <span className="text-xs tracking-[0.35em] uppercase text-white/60 font-heading absolute left-1/2 -translate-x-1/2">
          Real Estate Done Right
        </span>

        {/* Specialist selector */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors ${
              selected
                ? "text-white bg-white/20 border border-white/40"
                : "text-white/60 bg-white/10 border border-white/20 hover:text-white hover:border-white/40"
            }`}
          >
            {selected ?? "Specialist"}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-deep-forest/95 backdrop-blur-md border border-white/20 rounded-xl p-2 shadow-xl z-20">
              {SPECIALISTS.map(s => (
                <button
                  key={s.email}
                  onClick={() => pick(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selected === s.name
                      ? "bg-white/20 text-white font-medium"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content — logo top, body middle, CTA bottom */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-8 pb-6 sm:pb-10">

        {/* Logo — upper zone */}
        <div className="flex flex-col items-center mt-1 sm:mt-2">
          <Image
            src="/logo.png"
            alt="Namou Properties"
            width={600}
            height={180}
            className="object-contain w-auto h-[14vh] sm:h-[22vh] lg:h-[26vh] mx-auto"
            priority
          />
        </div>

        {/* Body text — centered in middle */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl px-5 sm:px-8 py-3 sm:py-4 max-w-lg">
            <p className="text-sm sm:text-base md:text-lg text-white/75 leading-relaxed">
              Review land opportunities, compare pricing scenarios, and model ROI or Joint-venture outcomes in real time to guide each conversation toward the right deal.
            </p>
          </div>
        </div>

        {/* CTA — bottom zone */}
        <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4">
          <Link
            href="/master-plan"
            className="px-10 sm:px-14 py-3.5 sm:py-4 bg-forest text-white rounded-xl text-base sm:text-lg font-semibold hover:bg-deep-forest transition-colors text-center shadow-lg"
          >
            Begin the Land Search
          </Link>
          <span className="text-xs text-white/40 tracking-wide">
            Guided land review and deal structuring
          </span>
        </div>

      </main>
    </div>
  );
}
