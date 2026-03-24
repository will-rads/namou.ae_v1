"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { landCategories, plots, areas, formatNumber, type LandCategory } from "@/data/mock";

function areaSlug(area: string) {
  return area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const SIZE_OPTIONS = [
  { label: "All Sizes", value: "" },
  { label: "Up to 10,000 sqft", value: "0-10000" },
  { label: "10,000 – 50,000 sqft", value: "10000-50000" },
  { label: "50,000+ sqft", value: "50000-" },
];

const PRICE_OPTIONS = [
  { label: "All Prices", value: "" },
  { label: "Up to AED 5M", value: "0-5000000" },
  { label: "AED 5M – 15M", value: "5000000-15000000" },
  { label: "AED 15M+", value: "15000000-" },
];

function loadFilters(): { size: string; price: string } {
  try {
    return {
      size: sessionStorage.getItem("filter_size") ?? "",
      price: sessionStorage.getItem("filter_price") ?? "",
    };
  } catch { return { size: "", price: "" }; }
}

function saveFilters(size: string, price: string) {
  try {
    if (size) sessionStorage.setItem("filter_size", size); else sessionStorage.removeItem("filter_size");
    if (price) sessionStorage.setItem("filter_price", price); else sessionStorage.removeItem("filter_price");
  } catch { /* SSR safety */ }
}

export default function LandingPage() {
  const [selectedType, setSelectedType] = useState<LandCategory | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sizeFilter, setSizeFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = loadFilters();
    setSizeFilter(f.size);
    setPriceFilter(f.price);
  }, []);

  useEffect(() => { saveFilters(sizeFilter, priceFilter); }, [sizeFilter, priceFilter]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  const availableAreas = selectedType
    ? areas.filter((area) => plots.some((p) => p.category === selectedType && p.area === area))
    : [];

  const hasFilters = sizeFilter || priceFilter;

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Background image — uses next/image for automatic WebP/AVIF + resize */}
      <Image
        src="/rak-hero.jpg"
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
      <header className="relative z-10 flex items-center justify-center px-4 sm:px-12 py-4 sm:py-6">
        <span className="text-xs tracking-[0.35em] uppercase text-white/60 font-heading">
          Real Estate Done Right
        </span>
      </header>

      {/* Center content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-8 pt-4 sm:pt-6 pb-6 sm:pb-10">

        {/* Logo — outside the card, over the background */}
        <div className="flex flex-col items-center text-center mb-4 sm:mb-6">
          <Image
            src="/logo.png"
            alt="Namou Properties"
            width={520}
            height={160}
            className="object-contain w-auto h-[15vh] sm:h-[28vh] lg:h-[34vh]"
            priority
          />
          <p className="text-sm sm:text-base md:text-lg text-white/70 max-w-xl mx-auto leading-relaxed mt-2 sm:mt-3 px-2">
            Strategic land investment opportunities across Ras Al Khaimah.
            Curated plots, transparent ROI, and a clear path to ownership.
          </p>
        </div>

        {/* Card — selector only */}
        <div className="w-full max-w-4xl bg-white/8 backdrop-blur-sm border border-white/15 rounded-3xl px-4 sm:px-10 py-6 sm:py-8 shadow-2xl flex flex-col items-center gap-6">

          {/* Selector */}
          <div className="w-full">
            {selectedType === null ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50 flex-1 text-center pl-8">Browse by land type</p>
                  <div className="relative" ref={filterRef}>
                    <button
                      onClick={() => setFilterOpen(!filterOpen)}
                      className={`p-2 rounded-lg transition-colors ${hasFilters ? "bg-white/30 text-white" : "text-white/50 hover:text-white hover:bg-white/10"}`}
                      aria-label="Filter plots"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                    </button>
                    {filterOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-deep-forest/95 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-xl z-20">
                        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-3">Filter Plots</p>
                        <label className="block mb-3">
                          <span className="text-xs text-white/70 mb-1 block">Plot Size</span>
                          <select
                            value={sizeFilter}
                            onChange={(e) => setSizeFilter(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer"
                          >
                            {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-deep-forest text-white">{o.label}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs text-white/70 mb-1 block">Price</span>
                          <select
                            value={priceFilter}
                            onChange={(e) => setPriceFilter(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer"
                          >
                            {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-deep-forest text-white">{o.label}</option>)}
                          </select>
                        </label>
                        {hasFilters && (
                          <button
                            onClick={() => { setSizeFilter(""); setPriceFilter(""); }}
                            className="mt-3 text-xs text-white/50 hover:text-white transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {landCategories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setSelectedType(cat.slug)}
                      className="py-4 sm:py-6 px-4 sm:px-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-sm sm:text-base font-semibold text-white hover:bg-white/30 hover:border-white/50 transition-all text-center"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Browse by area</p>
                  <button
                    onClick={() => setSelectedType(null)}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    ← Back
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableAreas.map((area) => (
                    <Link
                      key={area}
                      href={`/master-plan?type=${encodeURIComponent(selectedType)}&area=${encodeURIComponent(areaSlug(area))}`}
                      className="py-4 sm:py-6 px-4 sm:px-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-sm sm:text-base font-semibold text-white hover:bg-white/30 hover:border-white/50 transition-all text-center"
                    >
                      {area}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
