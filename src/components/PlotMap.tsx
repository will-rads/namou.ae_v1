"use client";

import { useState, useEffect, useRef } from "react";
import type { Plot } from "@/data/mock";

interface Props {
  plots: Plot[];
  selectedPlot: Plot | null;
  comparePlots: Plot[];
  compareMode: boolean;
  onSelectPlot: (plot: Plot) => void;
}

// RAK overview: center between Al Marjan (lng ~55.74) and Al Maireed (lng ~55.97).
// Zoom 12 ≈ 70 km field-of-view at 25°N — all 17 plots fit with meaningful
// context (coastline, road network, and nearby developments visible) without
// zooming so far out that the first screen loses its premium, curated feel.
const MAP_CENTER          = { lat: 25.747, lng: 55.856 };
const OVERVIEW_ZOOM       = 12;
const INSPECTION_MAX_ZOOM = 20; // Google has native zoom 20+ for UAE coastal areas

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

// Optional: set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in .env.local to unlock:
//   • WebGL vector renderer — smooth continuous camera tilt, 3D buildings,
//     fluid zoom transitions (closest in-browser equivalent of Google Earth)
//   • AdvancedMarkerElement — GPU-composited HTML markers, crisp on HiDPI
//
// How to create a Map ID (takes ~30 s):
//   Google Cloud Console → APIs & Services → Google Maps Platform →
//   Map Management → Create Map ID → type: JavaScript → renderer: Vector
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";

// ── Script loading singleton ───────────────────────────────────────────────
//
// Loads the Google Maps JS API exactly once per page session, even under
// React StrictMode's double-mount. Using:
//   v=weekly        — latest stable release channel; ensures newest marker/tilt API
//   libraries=marker — loads AdvancedMarkerElement alongside the core API
let gmapsLoadPromise: Promise<void> | null = null;

function ensureGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) {
    return Promise.resolve();
  }
  if (gmapsLoadPromise) return gmapsLoadPromise;

  gmapsLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load",  () => resolve());
    script.addEventListener("error", () => {
      gmapsLoadPromise = null; // allow retry on next mount
      reject(new Error("Google Maps failed to load"));
    });
    document.head.appendChild(script);
  });

  return gmapsLoadPromise;
}

// ── Classic Marker icon builder (fallback when MAP_ID is not set) ──────────
//
// Inline-SVG data-URL pill matching the amber/forest Namou design.
// Adaptive width; anchor at bottom-centre so the pin tip touches the coordinate.
// Only callable after the Google Maps script has loaded (google.maps.Size/Point).
function buildMarkerIcon(name: string, active: boolean): google.maps.Icon {
  const bg     = active ? "#003D2E"              : "rgba(245,158,11,0.95)";
  const bdr    = active ? "#002A1F"              : "#D97706";
  const color  = active ? "#ffffff"              : "#78350F";
  const shadow = active
    ? "drop-shadow(0 3px 8px rgba(0,61,46,0.60))"
    : "drop-shadow(0 2px 6px rgba(0,0,0,0.42))";

  const w   = Math.max(80, name.length * 6 + 18);
  const h   = 34;
  const mid = w / 2;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="filter:${shadow}">` +
    `<rect x="1" y="1" width="${w - 2}" height="24" rx="6" ry="6" fill="${bg}" stroke="${bdr}" stroke-width="2"/>` +
    `<text x="${mid}" y="13" font-family="system-ui,-apple-system,sans-serif" font-size="9.5"` +
    ` font-weight="700" fill="${color}" text-anchor="middle" dominant-baseline="middle">${name}</text>` +
    `<polygon points="${mid - 5},25 ${mid + 5},25 ${mid},33" fill="${bdr}"/>` +
    `</svg>`;

  return {
    url:        "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor:     new google.maps.Point(mid, h),
  };
}

// ── AdvancedMarkerElement content builder (used when MAP_ID is set) ────────
//
// Returns a live HTMLElement tree together with named references to its pill
// and arrow children so the icon-update effect can mutate their inline styles
// in-place — no DOM removal or re-creation per selection change.
//
// The AdvancedMarkerElement positions its content so that the centre-bottom
// of the root element aligns with the marker's coordinate.  Adding a 5 px
// downward arrow at the bottom of root means the arrow tip touches the point.
function buildAdvancedMarkerContent(
  name: string,
  active: boolean,
): { root: HTMLElement; pill: HTMLElement; arrow: HTMLElement } {
  const bg     = active ? "#003D2E"              : "rgba(245,158,11,0.95)";
  const border = active ? "#002A1F"              : "#D97706";
  const color  = active ? "#ffffff"              : "#78350F";
  const shadow = active
    ? "0 3px 8px rgba(0,61,46,0.60)"
    : "0 2px 6px rgba(0,0,0,0.42)";

  const root = document.createElement("div");
  root.style.cssText = "position:relative;display:inline-block;cursor:pointer;user-select:none";

  const pill = document.createElement("div");
  pill.style.cssText = [
    `background:${bg}`,
    `border:1.5px solid ${border}`,
    `color:${color}`,
    "font-family:system-ui,-apple-system,sans-serif",
    "font-size:9.5px",
    "font-weight:700",
    "padding:4px 8px",
    "border-radius:6px",
    "white-space:nowrap",
    `box-shadow:${shadow}`,
    "letter-spacing:0.02em",
    "transition:background 0.15s,color 0.15s,box-shadow 0.15s",
  ].join(";");
  pill.textContent = name;

  const arrow = document.createElement("div");
  arrow.style.cssText = [
    "position:absolute",
    "left:50%",
    "transform:translateX(-50%)",
    "bottom:-5px",
    "width:0",
    "height:0",
    "border-left:4px solid transparent",
    "border-right:4px solid transparent",
    `border-top:5px solid ${border}`,
  ].join(";");

  root.appendChild(pill);
  root.appendChild(arrow);
  return { root, pill, arrow };
}

// ── Marker type union + type guard ─────────────────────────────────────────
//
// AdvancedMarkerElement (MAP_ID path) uses property setters (.map, .zIndex,
// .content) while classic Marker (fallback) uses methods (.setMap(),
// .setZIndex(), .setIcon()).  The type guard keeps each update/cleanup path
// type-safe without unsafe casts throughout.
type AnyMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

function isAdvancedMarker(m: AnyMarker): m is google.maps.marker.AdvancedMarkerElement {
  // Classic Marker exposes setMap() as a method.
  // AdvancedMarkerElement exposes map as a property (getter/setter), not setMap().
  return typeof (m as google.maps.Marker).setMap !== "function";
}

export default function PlotMap({
  plots,
  selectedPlot,
  comparePlots,
  compareMode,
  onSelectPlot,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<google.maps.Map | null>(null);
  const markersRef    = useRef<Map<string, AnyMarker>>(new Map());
  // Keeps references to the pill + arrow DOM nodes for each AdvancedMarkerElement
  // so the icon-update effect can patch their styles without replacing content.
  const contentElsRef = useRef<Map<string, { pill: HTMLElement; arrow: HTMLElement }>>(new Map());
  const circleRef     = useRef<google.maps.Circle | null>(null);
  const roRef         = useRef<ResizeObserver | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Stable refs — prevent stale closures in marker click handlers and effects
  const onSelectRef     = useRef(onSelectPlot);
  const selectedRef     = useRef(selectedPlot);
  const comparePlotsRef = useRef(comparePlots);
  useEffect(() => { onSelectRef.current     = onSelectPlot; }, [onSelectPlot]);
  useEffect(() => { selectedRef.current     = selectedPlot; }, [selectedPlot]);
  useEffect(() => { comparePlotsRef.current = comparePlots; }, [comparePlots]);

  // ── Map initialisation (once on mount) ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !GOOGLE_KEY) return;

    // Capture at effect-body time so the cleanup function always operates on
    // the same Map instances (avoids stale-ref in teardown).
    const markersMap = markersRef.current;
    const contentEls = contentElsRef.current;
    let cancelled = false;

    ensureGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center:    MAP_CENTER,
          zoom:      OVERVIEW_ZOOM,

          // HYBRID: satellite imagery with road/place-name labels baked in.
          // Labels are essential for real-estate decisions — investors need to
          // read street names, access routes, and development names.  Pure
          // SATELLITE gives the same pixel quality but removes this context.
          mapTypeId: google.maps.MapTypeId.HYBRID,

          // mapId: switches Google Maps to the WebGL vector renderer when set.
          // Enables smooth continuous tilt (full 3D buildings and terrain),
          // fluid zoom transitions, and AdvancedMarkerElement support —
          // the closest in-browser equivalent of Google Earth.
          // Without mapId the raster renderer is used, which is still excellent
          // and activates 45° aerial photography at appropriate zoom levels.
          ...(MAP_ID ? { mapId: MAP_ID } : {}),

          // tilt: 45 — the single most Google-Earth-like option available.
          //   Raster renderer (no MAP_ID): activates 45° aerial photography
          //     at zoom ≥ 13 where Google has oblique imagery.  UAE coastal
          //     cities (including parts of RAK) have this coverage.
          //   Vector renderer (MAP_ID set): enables smooth, continuous 3D
          //     camera tilt with 3D building models at zoom ≥ 12.
          //   At the initial overview zoom (12) with the raster renderer the
          //   option has no visible effect — tilt engages automatically as the
          //   user zooms in, providing a progressive reveal of the 3D context.
          tilt:    45,

          maxZoom: INSPECTION_MAX_ZOOM,

          // Controls — positioned to avoid Namou's overlay panels:
          //   Available Plots panel lives at top-3 left-3 (CSS absolute)
          //   Area Summary panel lives at top-3 right-3 (CSS absolute)
          zoomControl:          true,
          zoomControlOptions:   { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          // rotateControl: compass widget for freely rotating the tilted view,
          // mirroring the Google Earth UX.  LEFT_BOTTOM avoids the Plots panel.
          rotateControl:        true,
          rotateControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
          mapTypeControl:       false, // fixed to HYBRID; keep UI clean
          streetViewControl:    false,
          fullscreenControl:    false, // omitted — would overlap Area Summary overlay
          gestureHandling:      "greedy", // scroll always zooms, no two-finger gate
        });

        mapRef.current = map;

        // ResizeObserver — triggers Google Maps resize event when the CSS
        // container width changes (detail panel opens → map shrinks to md:w-1/2).
        const ro = new ResizeObserver(() => {
          if (mapRef.current) {
            google.maps.event.trigger(mapRef.current, "resize");
          }
        });
        ro.observe(containerRef.current!);
        roRef.current = ro;

        setMapReady(true);
      })
      .catch((err) => console.error("[PlotMap] Google Maps load error:", err));

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;

      if (mapRef.current) {
        markersMap.forEach((marker) => {
          if (isAdvancedMarker(marker)) {
            marker.map = null; // AdvancedMarkerElement: remove via property setter
          } else {
            google.maps.event.clearInstanceListeners(marker);
            marker.setMap(null);
          }
        });
        markersMap.clear();
        contentEls.clear();

        if (circleRef.current) {
          circleRef.current.setMap(null);
          circleRef.current = null;
        }

        google.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current = null;
      }
    };
  }, []);

  // ── Build markers when the plots array changes ───────────────────────────
  //
  // Uses AdvancedMarkerElement when MAP_ID is set — GPU-composited HTML pins,
  // crisp rendering on HiDPI/Retina, correct layering in 3D tilt mode.
  // Falls back to classic Marker when MAP_ID is absent — same pill design via
  // inline SVG, works on all raster-mode map instances.
  //
  // Initial icon state is read from refs so this effect stays scoped to
  // [mapReady, plots].  Selection-driven colour changes are handled without a
  // full rebuild by the next effect.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map        = mapRef.current;
    const contentEls = contentElsRef.current;

    // Tear down existing markers before rebuilding
    markersRef.current.forEach((marker) => {
      if (isAdvancedMarker(marker)) {
        marker.map = null;
      } else {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      }
    });
    markersRef.current.clear();
    contentEls.clear();

    plots.forEach((plot) => {
      if (plot.lat == null || plot.lng == null) return;

      const isActive =
        selectedRef.current?.id === plot.id ||
        comparePlotsRef.current.some((p) => p.id === plot.id);

      let marker: AnyMarker;

      if (MAP_ID && google.maps.marker?.AdvancedMarkerElement) {
        // ── AdvancedMarkerElement path ──────────────────────────────────────
        // Requires a Map instance that has a mapId.  Renders as a real HTML
        // element composited by WebGL — stays crisp at any device pixel ratio,
        // sorts correctly with 3D buildings in tilt mode, and supports CSS
        // transitions on the pill text.
        const { root, pill, arrow } = buildAdvancedMarkerContent(plot.name, isActive);

        marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: plot.lat, lng: plot.lng },
          map,
          content:  root,
          title:    plot.name,
          zIndex:   isActive ? 1000 : 1,
        });

        contentEls.set(plot.id, { pill, arrow });
        marker.addListener("click", () => onSelectRef.current(plot));

      } else {
        // ── Classic Marker fallback path ────────────────────────────────────
        // Works without mapId.  Inline-SVG pill icon matches Namou design.
        marker = new google.maps.Marker({
          position:  { lat: plot.lat, lng: plot.lng },
          map,
          icon:      buildMarkerIcon(plot.name, isActive),
          title:     plot.name,
          optimized: false, // keep each marker as a real DOM element
          zIndex:    isActive ? 1000 : 1,
        });
        marker.addListener("click", () => onSelectRef.current(plot));
      }

      markersRef.current.set(plot.id, marker);
    });
  // selectedPlot / comparePlots intentionally excluded — handled by next effect
  }, [mapReady, plots]);

  // ── Update marker appearance on selection change (no full rebuild) ────────
  //
  // AdvancedMarkerElement path: mutates the pill/arrow inline styles stored in
  // contentElsRef — no DOM removal or re-creation; CSS transition on the pill.
  // Classic Marker path: calls marker.setIcon() / setZIndex().
  useEffect(() => {
    if (!mapReady) return;
    const plotLookup = new Map(plots.map((p) => [p.id, p]));

    markersRef.current.forEach((marker, id) => {
      const plot = plotLookup.get(id);
      if (!plot) return;

      const isActive =
        selectedPlot?.id === id ||
        comparePlots.some((p) => p.id === id);

      if (isAdvancedMarker(marker)) {
        const els = contentElsRef.current.get(id);
        if (els) {
          const bg     = isActive ? "#003D2E"              : "rgba(245,158,11,0.95)";
          const border = isActive ? "#002A1F"              : "#D97706";
          const color  = isActive ? "#ffffff"              : "#78350F";
          const shadow = isActive
            ? "0 3px 8px rgba(0,61,46,0.60)"
            : "0 2px 6px rgba(0,0,0,0.42)";
          els.pill.style.background      = bg;
          els.pill.style.borderColor     = border;
          els.pill.style.color           = color;
          els.pill.style.boxShadow       = shadow;
          els.arrow.style.borderTopColor = border;
        }
        marker.zIndex = isActive ? 1000 : 1;
      } else {
        marker.setIcon(buildMarkerIcon(plot.name, isActive));
        marker.setZIndex(isActive ? 1000 : 1);
      }
    });
  }, [mapReady, plots, selectedPlot, comparePlots, compareMode]);

  // ── Approximate plot-area circle ─────────────────────────────────────────
  //
  // Amber ring derived from plotArea (sqft → m²) as an equivalent-area circle.
  // APPROXIMATE — the dataset has point coordinates only; no real polygon
  // geometry exists.  The circle gives an honest visual size cue and is used
  // by the fitBounds effect below to compute the inspection zoom level.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    if (
      !compareMode &&
      selectedPlot?.lat != null &&
      selectedPlot?.lng != null &&
      selectedPlot.plotArea
    ) {
      const areaM2  = selectedPlot.plotArea * 0.0929; // sqft → m²
      const radiusM = Math.sqrt(areaM2 / Math.PI);    // equivalent-area circle radius

      circleRef.current = new google.maps.Circle({
        center:        { lat: selectedPlot.lat, lng: selectedPlot.lng },
        radius:        radiusM,
        map:           mapRef.current,
        strokeColor:   "#D97706",  // amber — high contrast on satellite imagery
        strokeOpacity: 0.95,
        strokeWeight:  3,
        fillColor:     "#F59E0B",
        fillOpacity:   0.18,
        clickable:     false,
        zIndex:        500,
      });
    }
  }, [mapReady, selectedPlot, compareMode]);

  // ── Pan/zoom to selected plot (or return to overview) ────────────────────
  //
  // Uses fitBounds(paddedCircleBounds): extends the circle bounding box by
  // 100% on each side (= 3× original diameter, matching Leaflet pad(1.0)).
  // At zoom 19–20 with Google HYBRID, UAE imagery is ~0.15–0.3 m/px —
  // individual buildings, road widths, and bare-land parcel detail are clear.
  //
  // requestAnimationFrame defers until React DOM layout has settled (detail
  // panel opened, container resized, resize event fired by ResizeObserver)
  // so fitBounds sees the final viewport dimensions.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (!compareMode && selectedPlot?.lat != null && selectedPlot?.lng != null) {
      const lat = selectedPlot.lat!;
      const lng = selectedPlot.lng!;
      const id = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        google.maps.event.trigger(mapRef.current, "resize");

        if (circleRef.current) {
          const bounds = circleRef.current.getBounds();
          if (bounds) {
            // Extend by 100% on each side → 3× span (generous context around plot)
            const ne      = bounds.getNorthEast();
            const sw      = bounds.getSouthWest();
            const latSpan = ne.lat() - sw.lat();
            const lngSpan = ne.lng() - sw.lng();
            const padded  = new google.maps.LatLngBounds(
              { lat: sw.lat() - latSpan, lng: sw.lng() - lngSpan },
              { lat: ne.lat() + latSpan, lng: ne.lng() + lngSpan },
            );
            mapRef.current.fitBounds(padded);
          }
        } else {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(INSPECTION_MAX_ZOOM);
        }
      });
      return () => cancelAnimationFrame(id);
    } else if (!compareMode && !selectedPlot) {
      const id = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        google.maps.event.trigger(mapRef.current, "resize");
        mapRef.current.setCenter(MAP_CENTER);
        mapRef.current.setZoom(OVERVIEW_ZOOM);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [mapReady, selectedPlot, compareMode]);

  // ── No API key — show setup placeholder ─────────────────────────────────
  if (!GOOGLE_KEY) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-mint-white text-center px-6">
        <svg
          className="w-10 h-10 text-muted mb-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <p className="text-sm font-semibold text-deep-forest">Google Maps key required</p>
        <p className="text-xs text-muted mt-2 max-w-xs leading-relaxed">
          Add{" "}
          <code className="bg-mint-bg border border-mint-light/60 px-1 py-0.5 rounded text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_KEY
          </code>{" "}
          to{" "}
          <code className="bg-mint-bg border border-mint-light/60 px-1 py-0.5 rounded text-[10px]">
            .env.local
          </code>{" "}
          to activate satellite imagery. Optionally also add{" "}
          <code className="bg-mint-bg border border-mint-light/60 px-1 py-0.5 rounded text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
          </code>{" "}
          (create a Map ID in Google Cloud Console → Map Management) to unlock
          WebGL vector rendering with 3D buildings and advanced markers.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Loading overlay — visible while the Google Maps script initialises */}
      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-mint-white pointer-events-none">
          <div className="w-7 h-7 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
          <p className="text-xs text-muted mt-3 tracking-wide">Loading satellite imagery…</p>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0" />
    </>
  );
}
