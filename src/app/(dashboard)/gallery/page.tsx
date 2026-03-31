"use client";

import { useState, useEffect } from "react";
import ContentCard from "@/components/ContentCard";
import { plots, type Plot } from "@/data/mock";

/* ── Fallback view definitions ── */

interface GallerySlot {
  label: string;
  /** URL to an image or null → render an iframe fallback */
  src: string | null;
  /** iframe src for coordinate-based fallback (only used when src is null) */
  fallbackSrc: string | null;
}

function driveToDirectUrl(url: string): string {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  return url;
}

const FALLBACK_LABELS = ["Satellite Close", "Satellite Wide", "Satellite Detail", "Area Context"];

function buildSlots(plot: Plot | null): GallerySlot[] {
  const imgs = [
    plot?.galleryImage1,
    plot?.galleryImage2,
    plot?.galleryImage3,
    plot?.galleryImage4,
  ];

  const lat = plot?.lat;
  const lng = plot?.lng;
  const hasCoords = lat != null && lng != null;

  const fallbackSrcs = hasCoords
    ? [
        `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=18&output=embed`,
        `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=14&output=embed`,
        `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=16&output=embed`,
        `https://maps.google.com/maps?q=${lat},${lng}&t=h&z=13&output=embed`,
      ]
    : [null, null, null, null];

  return imgs.map((raw, i) => {
    const img = raw?.trim();
    if (img) {
      return { label: `Image ${i + 1}`, src: driveToDirectUrl(img), fallbackSrc: null };
    }
    return { label: FALLBACK_LABELS[i], src: null, fallbackSrc: fallbackSrcs[i] };
  });
}

export default function GalleryPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [plot, setPlot] = useState<Plot | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("selected_plot");
      if (stored) {
        const p: Plot = JSON.parse(stored);
        // Refresh from live data to pick up gallery fields
        const live = plots.find(lp => lp.id === p.id) ?? p;
        setPlot(live);
      }
    } catch { /* ignore */ }
  }, []);

  const slots = buildSlots(plot);
  const current = slots[selectedIndex] ?? slots[0];

  return (
    <div className="flex flex-col flex-1 gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-y-auto md:overflow-y-hidden">
      <div className="shrink-0">
        <h1 className="text-xl lg:text-3xl font-bold text-forest font-heading">Land Gallery</h1>
        <p className="text-sm text-muted mt-1">
          {plot ? `${plot.name} — ${plot.location}` : "Select a plot from the Master Plan to view its gallery."}
        </p>
      </div>

      <ContentCard className="flex flex-col flex-1 min-h-0">
        {/* Counter */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className="text-xs font-semibold text-deep-forest uppercase tracking-wider">
            {current?.label ?? "Gallery"}
          </p>
          <span className="text-xs text-muted">
            {selectedIndex + 1} / {slots.length}
          </span>
        </div>

        {/* Hero display — fills available space */}
        <div className="relative w-full flex-1 min-h-[180px] rounded-xl bg-gradient-to-br from-mint-light/30 to-mint/20 mb-2 overflow-hidden border border-mint-light/40 flex items-center justify-center">
          {current?.src ? (
            /* Backend-provided image */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.src}
              alt={current.label}
              className="w-full h-full object-cover"
            />
          ) : current?.fallbackSrc ? (
            /* Coordinate-based fallback (iframe) */
            <iframe
              src={current.fallbackSrc}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={current.label}
            />
          ) : (
            /* No data at all */
            <div className="text-center text-deep-forest/40">
              <svg className="w-20 h-20 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-base font-medium">No plot selected</p>
              <p className="text-xs text-deep-forest/30 mt-1">Navigate to Master Plan and select a plot</p>
            </div>
          )}

          {/* Navigation arrows */}
          <button
            onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedIndex(Math.min(slots.length - 1, selectedIndex + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Label overlay */}
          {(current?.src || current?.fallbackSrc) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/30 to-transparent px-5 py-4">
              <p className="text-sm font-medium text-white">{current.label}</p>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`flex-shrink-0 w-24 h-16 rounded-lg border transition-all overflow-hidden flex items-center justify-center ${
                i === selectedIndex
                  ? "border-forest ring-2 ring-forest/20"
                  : "border-mint-light/40 hover:border-forest/30"
              } ${slot.src ? "" : "bg-gradient-to-br from-mint-light/30 to-mint/10"}`}
            >
              {slot.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.src} alt={slot.label} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-deep-forest/40 font-medium text-center leading-tight px-1">
                  {slot.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </ContentCard>
    </div>
  );
}
