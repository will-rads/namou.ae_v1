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
}

const MAP_CENTER: [number, number] = [25.745, 55.855];
const OVERVIEW_ZOOM = 11;
const DETAIL_ZOOM = 18;

function buildIcon(name: string, active: boolean): L.DivIcon {
  const bg     = active ? "#003D2E"             : "rgba(245,158,11,0.95)";
  const bdr    = active ? "#002A1F"             : "#D97706";
  const color  = active ? "#ffffff"             : "#78350F";
  const shadow = active
    ? "0 3px 12px rgba(0,61,46,0.55)"
    : "0 2px 10px rgba(0,0,0,0.40)";

  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
      <div style="background:${bg};border:2px solid ${bdr};border-radius:7px;padding:4px 11px;font-size:10px;font-weight:700;color:${color};white-space:nowrap;box-shadow:${shadow};font-family:system-ui,-apple-system,sans-serif;line-height:1.4;letter-spacing:0.03em;">${name}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${bdr};"></div>
    </div>`,
    className: "",
    iconSize: [96, 34],
    iconAnchor: [48, 34],
  });
}

export default function PlotMap({
  plots,
  selectedPlot,
  comparePlots,
  compareMode,
  onSelectPlot,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());
  const labelsRef    = useRef<L.TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hybrid, setHybrid]     = useState(false);

  const onSelectRef = useRef(onSelectPlot);
  useEffect(() => { onSelectRef.current = onSelectPlot; }, [onSelectPlot]);

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

    // ── Esri Reference Overlay — road/place labels for hybrid mode ──────────
    labelsRef.current = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxNativeZoom: 19, maxZoom: 22, pane: "overlayPane" }
    );

    mapRef.current = map;
    setMapReady(true);

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // ── Toggle labels overlay for hybrid mode ─────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !labelsRef.current) return;
    if (hybrid) {
      labelsRef.current.addTo(mapRef.current);
    } else {
      labelsRef.current.remove();
    }
  }, [mapReady, hybrid]);

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

      const marker = L.marker([plot.lat, plot.lng], {
        icon: buildIcon(plot.name, isActive),
        riseOnHover: true,
      });

      marker.on("click", () => onSelectRef.current(plot));
      marker.addTo(map);
      markersRef.current.set(plot.id, marker);
    });
  }, [mapReady, plots, selectedPlot, comparePlots, compareMode]);

  // ── Pan/zoom to selected plot (or return to overview) ───────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (!compareMode && selectedPlot?.lat != null && selectedPlot?.lng != null) {
      const lat = selectedPlot.lat!;
      const lng = selectedPlot.lng!;
      const id = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize();
        mapRef.current.flyTo([lat, lng], DETAIL_ZOOM, {
          animate: true,
          duration: 1.2,
        });
      });
      return () => cancelAnimationFrame(id);
    } else if (!compareMode && !selectedPlot) {
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
  }, [mapReady, selectedPlot, compareMode]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      <button
        onClick={() => setHybrid((h) => !h)}
        className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-md border border-gray-200 text-gray-700 backdrop-blur-sm transition-colors"
      >
        {hybrid ? "Satellite" : "Hybrid"}
      </button>
    </div>
  );
}
