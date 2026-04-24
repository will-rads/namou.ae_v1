"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import type { Plot } from "@/data/mock";

interface Props {
  plots: Plot[];
  selectedPlot: Plot | null;
  comparePlots: Plot[];
  compareMode: boolean;
  onSelectPlot: (plot: Plot) => void;
  onSelectUnavailable?: (plot: Plot) => void;
  unavailablePlot?: Plot | null;
}

const MAP_CENTER: [number, number] = [25.745, 55.855];
const OVERVIEW_ZOOM = 11;
const DETAIL_ZOOM = 18;

// Google Material-style icon paths by land category (case-insensitive lookup)
const PIN_ICONS: Record<string, string> = {
  residential: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  commercial: "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z",
  hospitality: "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z",
  industrial: "M22 10V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2v-4l-4 2V10l4 2zm-9 1H6V9h7v2zm2-4H6V5h9v2z",
  "mixed-use": "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
  "mixed use": "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
};
// Fallback: map pin icon
const DEFAULT_ICON = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

function getIconPath(category: string): string {
  return PIN_ICONS[category.toLowerCase()] ?? DEFAULT_ICON;
}

import { getCategoryColors } from "@/data/categoryColors";

function buildIcon(category: string, active: boolean, available: boolean = true): L.DivIcon {
  const colors = getCategoryColors(category);
  const shadow = active
    ? `drop-shadow(0 3px 8px ${colors.activeStroke}80)`
    : "drop-shadow(0 2px 5px rgba(0,0,0,0.4))";
  const size = active ? 38 : 30;
  const iconPath = getIconPath(category);

  // Available: colored pin bg, white circle, colored icon
  // Unavailable (inverted): white pin bg, colored circle, white icon
  const pinBg = available ? (active ? colors.activeBg : colors.bg) : "#ffffff";
  const pinStroke = active ? colors.activeStroke : colors.stroke;
  const circleFill = available ? "#ffffff" : (active ? colors.activeBg : colors.bg);
  const iconFill = available ? colors.icon : "#ffffff";

  return L.divIcon({
    html: `<svg width="${size}" height="${size + 12}" viewBox="0 0 30 42" fill="none" style="filter:${shadow};">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="${pinBg}" stroke="${pinStroke}" stroke-width="1.5"/>
      <circle cx="15" cy="14" r="9" fill="${circleFill}"/>
      <svg x="6" y="5" width="18" height="18" viewBox="0 0 24 24">
        <path d="${iconPath}" fill="${iconFill}"/>
      </svg>
    </svg>`,
    className: "",
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
  });
}

export default function PlotMap({
  plots,
  selectedPlot,
  comparePlots,
  compareMode,
  onSelectPlot,
  onSelectUnavailable,
  unavailablePlot,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const onSelectRef = useRef(onSelectPlot);
  useEffect(() => { onSelectRef.current = onSelectPlot; }, [onSelectPlot]);
  const onSelectUnavailableRef = useRef(onSelectUnavailable);
  useEffect(() => { onSelectUnavailableRef.current = onSelectUnavailable; }, [onSelectUnavailable]);

  // ── Map initialisation (once on mount) ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_CENTER,
      zoom: OVERVIEW_ZOOM,
      maxZoom: 22,
      zoomSnap: 0.5,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // ── Esri World Imagery — satellite tile layer ────────────────────────────
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        maxNativeZoom: 19,
        maxZoom: 22,
      }
    ).addTo(map);

    mapRef.current = map;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing state after Leaflet map init (external system)
    setMapReady(true);

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    ro.observe(containerRef.current);
    const markers = markersRef.current;

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  // ── Rebuild markers whenever plots or selection state changes ────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    plots.forEach((plot) => {
      if (plot.lat == null || plot.lng == null) return;

      const isActive =
        selectedPlot?.id === plot.id ||
        comparePlots.some((p) => p.id === plot.id);

      const available = plot.available !== false;

      const marker = L.marker([plot.lat, plot.lng], {
        icon: buildIcon(plot.category, isActive, available),
        riseOnHover: true,
      });

      marker.on("click", () => {
        if (available) {
          onSelectRef.current(plot);
        } else {
          // Unavailable: notify parent — the unavailablePlot effect handles zoom
          onSelectUnavailableRef.current?.(plot);
        }
      });
      marker.addTo(map);
      markersRef.current.set(plot.id, marker);
    });
  }, [mapReady, plots, selectedPlot, comparePlots, compareMode]);

  // ── Pan/zoom to selected plot (or return to overview) ───────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const focusPlot = selectedPlot ?? unavailablePlot ?? null;

    if (!compareMode && focusPlot?.lat != null && focusPlot?.lng != null) {
      const lat = focusPlot.lat!;
      const lng = focusPlot.lng!;
      const id = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize();
        mapRef.current.flyTo([lat, lng], DETAIL_ZOOM, {
          animate: true,
          duration: 1.2,
        });
      });
      return () => cancelAnimationFrame(id);
    } else if (!compareMode && !focusPlot) {
      const id = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize();
        mapRef.current.flyTo(MAP_CENTER, OVERVIEW_ZOOM, {
          animate: true,
          duration: 1.0,
        });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [mapReady, selectedPlot, unavailablePlot, compareMode]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
