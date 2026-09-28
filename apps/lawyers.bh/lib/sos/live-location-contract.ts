import { validateCoordinates } from "./live-dispatch";

const MAX_PAST_AGE_MS = 10 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 2 * 60 * 1000;

export interface LiveLocationReport {
  latitude: number;
  longitude: number;
  accuracy: number;
  reportedAt: Date;
}

export function parseLiveLocationReport(
  value: unknown,
  now: Date,
): LiveLocationReport {
  if (!value || typeof value !== "object") throw new Error("invalid_payload");

  const body = value as Record<string, unknown>;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy);
  const reportedAt = new Date(String(body.reportedAt ?? ""));

  validateCoordinates({ latitude, longitude });

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10_000) {
    throw new Error("invalid_accuracy");
  }

  const timestamp = reportedAt.getTime();
  if (
    !Number.isFinite(timestamp) ||
    timestamp < now.getTime() - MAX_PAST_AGE_MS ||
    timestamp > now.getTime() + MAX_FUTURE_SKEW_MS
  ) {
    throw new Error("invalid_reported_at");
  }

  return { latitude, longitude, accuracy, reportedAt };
}
