import "server-only";

export type Coordinates = { lat: number; lng: number };
export type RouteMetrics = {
  etaMinutes: number;
  distanceKm: number;
  encodedPolyline: string;
};

export type RouteFailureReason =
  | "missing_api_key"
  | "request_failed"
  | "invalid_response"
  | "timeout";

type FetchLike = typeof fetch;

export async function computeDrivingRoute(
  input: { origin: Coordinates; destination: Coordinates },
  options: {
    apiKey?: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    onFailure?: (reason: RouteFailureReason) => void;
  } = {},
): Promise<RouteMetrics | null> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_ROUTES_API_KEY ?? "";
  const fail = (reason: RouteFailureReason) => {
    options.onFailure?.(reason);
    return null;
  };
  if (!apiKey.trim()) return fail("missing_api_key");

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 2_500,
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: input.origin.lat,
                longitude: input.origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: input.destination.lat,
                longitude: input.destination.lng,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          units: "METRIC",
        }),
      },
    );
    if (!response.ok) return fail("request_failed");

    const data = await response.json() as {
      routes?: Array<{
        duration?: unknown;
        distanceMeters?: unknown;
        polyline?: { encodedPolyline?: unknown };
      }>;
    };
    const route = data.routes?.[0];
    const seconds = typeof route?.duration === "string"
      ? Number(route.duration.replace(/s$/, ""))
      : Number.NaN;
    const meters = Number(route?.distanceMeters);
    const encodedPolyline = route?.polyline?.encodedPolyline;
    if (
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      !Number.isFinite(meters) ||
      meters <= 0 ||
      typeof encodedPolyline !== "string" ||
      encodedPolyline.length === 0
    ) {
      return fail("invalid_response");
    }

    return {
      etaMinutes: Math.max(1, Math.ceil(seconds / 60)),
      distanceKm: Math.round((meters / 1_000) * 100) / 100,
      encodedPolyline,
    };
  } catch (error) {
    return fail(error instanceof DOMException && error.name === "AbortError"
      ? "timeout"
      : "request_failed");
  } finally {
    clearTimeout(timeout);
  }
}
