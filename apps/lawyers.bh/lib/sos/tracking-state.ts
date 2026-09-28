import { LIVE_LOCATION_MAX_AGE_MS, isLiveLocationFresh } from "./live-dispatch";

export type TrackingState = "live" | "waiting" | "stale" | "inactive";

export function resolveTrackingState(
  serviceStatus: string,
  reportedAtValue: unknown,
  now = new Date(),
): { state: TrackingState; reportedAt: string | null; freshUntil: string | null } {
  if (serviceStatus !== "mobilizing") {
    return { state: "inactive", reportedAt: null, freshUntil: null };
  }
  if (typeof reportedAtValue !== "string" && !(reportedAtValue instanceof Date)) {
    return { state: "waiting", reportedAt: null, freshUntil: null };
  }
  const reportedAt = new Date(reportedAtValue);
  if (!Number.isFinite(reportedAt.getTime())) {
    return { state: "waiting", reportedAt: null, freshUntil: null };
  }
  const normalized = reportedAt.toISOString();
  const freshUntil = new Date(reportedAt.getTime() + LIVE_LOCATION_MAX_AGE_MS).toISOString();
  return {
    state: isLiveLocationFresh(reportedAt, now) ? "live" : "stale",
    reportedAt: normalized,
    freshUntil,
  };
}
