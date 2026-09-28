import { describe, expect, it, vi } from "vitest";

import { computeDrivingRoute } from "./google-routes";

const routeInput = {
  origin: { lat: 26.2235, lng: 50.5876 },
  destination: { lat: 26.21, lng: 50.57 },
};

describe("Google Routes driving metrics", () => {
  it("returns traffic-aware driving minutes and kilometers", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          routes: [{
            duration: "281.4s",
            distanceMeters: 3456,
            polyline: { encodedPolyline: "route-polyline" },
          }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await computeDrivingRoute(routeInput, {
      apiKey: "server-test-key",
      fetchImpl,
    });

    expect(result).toEqual({
      etaMinutes: 5,
      distanceKm: 3.46,
      encodedPolyline: "route-polyline",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
    );
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      "X-Goog-Api-Key": "server-test-key",
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      origin: {
        location: {
          latLng: { latitude: 26.2235, longitude: 50.5876 },
        },
      },
      destination: {
        location: { latLng: { latitude: 26.21, longitude: 50.57 } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      units: "METRIC",
    });
  });

  it.each([
    ["missing key", "", new Response("{}", { status: 200 })],
    ["non-2xx", "key", new Response("{}", { status: 503 })],
    [
      "no route",
      "key",
      new Response(JSON.stringify({ routes: [] }), { status: 200 }),
    ],
    [
      "bad duration",
      "key",
      new Response(JSON.stringify({
        routes: [{ duration: "bad", distanceMeters: 1200 }],
      }), { status: 200 }),
    ],
    [
      "zero distance",
      "key",
      new Response(JSON.stringify({
        routes: [{ duration: "60s", distanceMeters: 0 }],
      }), { status: 200 }),
    ],
    [
      "missing polyline",
      "key",
      new Response(JSON.stringify({
        routes: [{ duration: "60s", distanceMeters: 1200 }],
      }), { status: 200 }),
    ],
  ])("returns null for %s", async (_name, apiKey, response) => {
    const result = await computeDrivingRoute(routeInput, {
      apiKey,
      fetchImpl: async () => response,
    });

    expect(result).toBeNull();
  });

  it("returns null when Google Routes times out", async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const result = await computeDrivingRoute(routeInput, {
      apiKey: "server-test-key",
      fetchImpl,
      timeoutMs: 1,
    });

    expect(result).toBeNull();
  });
});
