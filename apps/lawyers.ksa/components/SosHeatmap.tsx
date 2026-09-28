"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface Point {
  lat: number;
  lng: number;
  weight: number;
}

interface Props {
  points: Point[];
  /** Initial centre when no points are present. Defaults to Manama. */
  fallbackCenter?: { lat: number; lng: number };
}

/** Lightweight "case heatmap" using Leaflet circle markers with low
 *  opacity. Overlapping circles naturally bloom into hotter zones —
 *  good enough for a dispatch overview without a heatmap plugin's
 *  bundle weight. Each circle's radius scales with `weight` so a
 *  bucket holding many cases reads bigger.
 */
export default function SosHeatmap({
  points,
  fallbackCenter = { lat: 26.2235, lng: 50.5876 },
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cleanedUp = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      // Load Leaflet's CSS once.
      if (
        typeof document !== "undefined" &&
        !document.getElementById("leaflet-css")
      ) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
      if (cleanedUp || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(
        [fallbackCenter.lat, fallbackCenter.lng],
        points.length > 0 ? 11 : 10,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Render heat-blobs.
      if (points.length > 0) {
        const layer = L.featureGroup();
        const maxWeight = Math.max(...points.map((p) => p.weight));
        for (const p of points) {
          const weightRatio = p.weight / maxWeight;
          // Radius scales from 280m (single case) to ~1500m (busiest
          // bucket). Tuned for Bahrain-scale geography; would need
          // reconsidering at country scale.
          const radius = 280 + 1200 * weightRatio;
          L.circle([p.lat, p.lng], {
            radius,
            color: "#D32F2F",
            weight: 1,
            fillColor: "#D32F2F",
            fillOpacity: 0.15 + 0.4 * weightRatio,
          }).addTo(layer);
        }
        layer.addTo(map);
        try {
          map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 13 });
        } catch {
          /* getBounds throws when the layer is empty; safe to ignore. */
        }
      }

      mapRef.current = map;
    })();

    return () => {
      cleanedUp = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100"
    />
  );
}
