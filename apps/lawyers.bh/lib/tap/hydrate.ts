import "server-only";

import { getTapConfigOverride, setTapConfigOverride, tapSiteUrl } from "./config";
import { loadActiveTapConfig } from "./settings";

/*
 * Bridges the async, database-backed Tap credentials into the synchronous Tap
 * config accessors. `ensureTapConfig` runs once per process (called from
 * instrumentation and defensively from the Tap routes); `refreshTapConfig`
 * re-reads after an admin saves so the change applies without a redeploy.
 */
let inflight: Promise<void> | null = null;

async function load(): Promise<void> {
  try {
    const siteUrl = tapSiteUrl() || (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const config = await loadActiveTapConfig(siteUrl);
    setTapConfigOverride(config);
  } catch {
    // Database unreachable at boot (or migration not yet applied): fall back to
    // the environment variables, which is the pre-existing behaviour.
  }
}

export async function ensureTapConfig(): Promise<void> {
  if (getTapConfigOverride()) return;
  if (inflight) return inflight;
  inflight = load().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function refreshTapConfig(): Promise<void> {
  setTapConfigOverride(null);
  await ensureTapConfig();
}
