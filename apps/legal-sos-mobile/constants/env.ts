// Runtime configuration. The default points at the live lawyers.bh
// backend, which is the production engine for both the web /sos
// surface and the Legal SOS mobile app. Override at dev time by
// setting EXPO_PUBLIC_API_URL in .env, or by editing app.json's
// `extra.apiUrl`.

import Constants from "expo-constants";

function readExtra(key: string): string | undefined {
  // Newer Expo (SDK 49+) exposes via expoConfig; older builds via manifest.
  const fromConfig =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[key];
  if (typeof fromConfig === "string") return fromConfig;
  const fromManifest =
    (Constants.manifest as { extra?: Record<string, unknown> } | undefined)
      ?.extra?.[key];
  if (typeof fromManifest === "string") return fromManifest;
  return undefined;
}

// No fallback — Legal SOS has its OWN backend separate from lawyers.bh.
// Configure via EXPO_PUBLIC_API_URL or app.json extra.apiUrl.

export const env = {
  apiUrl:
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
    readExtra("apiUrl")?.replace(/\/$/, "") ??
    "",
} as const;
