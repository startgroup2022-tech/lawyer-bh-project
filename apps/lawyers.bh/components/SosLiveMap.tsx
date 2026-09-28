"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

interface Props {
  /** Where the emergency request was placed. Always rendered as a red pin. */
  requestLocation: { lat: number; lng: number };
  /** Advocate's most recent GPS — null while no update has come in yet. */
  advocateLocation: { lat: number; lng: number } | null;
  /** Bilingual label hint so the markers' tooltips read naturally. */
  isAr: boolean;
}

/** Embedded live map for the SOS confirmation page. Loads Leaflet
 *  dynamically — the entire library is browser-only — and wires two
 *  markers (client + advocate) plus a dotted line and an auto-fit
 *  bounds box. Re-runs whenever the advocate's coordinates change so
 *  the marker glides as the polling layer above ticks. */
export default function SosLiveMap({
  requestLocation,
  advocateLocation,
  isAr,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const requestMarkerRef = useRef<Marker | null>(null);
  const advocateMarkerRef = useRef<Marker | null>(null);
  const lineRef = useRef<Polyline | null>(null);

  // Boot the map once. We dynamic-import leaflet so SSR doesn't see
  // the `window` references inside it.
  useEffect(() => {
    if (!containerRef.current) return;
    let cleanedUp = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      // Inject Leaflet's CSS once so the panes render correctly.
      if (typeof document !== "undefined" && !document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity =
          "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
      if (cleanedUp || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([requestLocation.lat, requestLocation.lng], 14);
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(map);

      const requestIcon = L.divIcon({
        className: "",
        html: dotHtml("#D32F2F"),
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      requestMarkerRef.current = L.marker(
        [requestLocation.lat, requestLocation.lng],
        { icon: requestIcon, title: isAr ? "موقعك" : "Your location" },
      ).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cleanedUp = true;
      mapRef.current?.remove();
      mapRef.current = null;
      requestMarkerRef.current = null;
      advocateMarkerRef.current = null;
      lineRef.current = null;
    };
    // We intentionally only re-run map setup if the request location
    // itself changes (which it doesn't during the lifetime of a case).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLocation.lat, requestLocation.lng]);

  // Update the advocate marker + connecting line whenever new GPS
  // arrives from the polling layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cleanedUp = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cleanedUp || !mapRef.current) return;

      if (!advocateLocation) {
        if (advocateMarkerRef.current) {
          advocateMarkerRef.current.remove();
          advocateMarkerRef.current = null;
        }
        if (lineRef.current) {
          lineRef.current.remove();
          lineRef.current = null;
        }
        return;
      }

      const ll = [advocateLocation.lat, advocateLocation.lng] as [
        number,
        number,
      ];
      if (advocateMarkerRef.current) {
        advocateMarkerRef.current.setLatLng(ll);
      } else {
        const advocateIcon = L.divIcon({
          className: "",
          html: dotHtml("#1A237E", true),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        advocateMarkerRef.current = L.marker(ll, {
          icon: advocateIcon,
          title: isAr ? "المحامي" : "Advocate",
        }).addTo(map);
      }

      const corridor = [
        [requestLocation.lat, requestLocation.lng],
        ll,
      ] as [number, number][];
      if (lineRef.current) {
        lineRef.current.setLatLngs(corridor);
      } else {
        lineRef.current = L.polyline(corridor, {
          color: "#1A237E",
          weight: 3,
          opacity: 0.6,
          dashArray: "6 6",
        }).addTo(map);
      }

      map.fitBounds(corridor, { padding: [40, 40], maxZoom: 16 });
    })();
    return () => {
      cleanedUp = true;
    };
  }, [
    advocateLocation?.lat,
    advocateLocation?.lng,
    requestLocation.lat,
    requestLocation.lng,
    isAr,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm"
    />
  );
}

function dotHtml(color: string, pulse = false): string {
  const ring = pulse
    ? `<span style="position:absolute;inset:-8px;border-radius:9999px;background:${color};opacity:0.3;animation:lbhPulse 1.6s ease-out infinite"></span>`
    : "";
  return `
    <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center">
      ${ring}
      <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></span>
    </div>
    <style>
      @keyframes lbhPulse {
        0% { transform: scale(0.6); opacity: 0.55 }
        100% { transform: scale(1.6); opacity: 0 }
      }
    </style>
  `;
}
