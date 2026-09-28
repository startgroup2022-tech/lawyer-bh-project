// Thin wrapper around expo-secure-store. All Legal SOS persistent
// state (selected country, session tokens, active case ref, push
// tokens) goes through here so we have a single place to add
// encryption, migration, or logging later.

import * as SecureStore from "expo-secure-store";

const KEYS = {
  selectedCountry: "legalsos.selectedCountry",
  sessionToken: "legalsos.sessionToken",
  refreshToken: "legalsos.refreshToken",
  sessionRole: "legalsos.sessionRole",
  activeCaseRef: "legalsos.activeCaseRef",
  pushToken: "legalsos.pushToken",
} as const;

export type StoreKey = keyof typeof KEYS;

async function get(key: StoreKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS[key]);
  } catch {
    return null;
  }
}

async function set(key: StoreKey, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS[key], value);
  } catch {
    // Best-effort. SecureStore can fail on simulators without keychain.
  }
}

async function remove(key: StoreKey): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS[key]);
  } catch {
    // ignore
  }
}

// ── Selected country ────────────────────────────────────────────────

export type CountryCode = "BH" | "AE" | "SA" | "KW" | "QA" | "OM";

export async function getSelectedCountry(): Promise<CountryCode | null> {
  const raw = await get("selectedCountry");
  if (!raw) return null;
  if (["BH", "AE", "SA", "KW", "QA", "OM"].includes(raw)) {
    return raw as CountryCode;
  }
  return null;
}

export async function setSelectedCountry(code: CountryCode): Promise<void> {
  await set("selectedCountry", code);
}

export async function clearSelectedCountry(): Promise<void> {
  await remove("selectedCountry");
}

// ── Session token ───────────────────────────────────────────────────

export async function getSessionToken(): Promise<string | null> {
  return get("sessionToken");
}

export async function setSessionToken(token: string): Promise<void> {
  await set("sessionToken", token);
}

export async function clearSessionToken(): Promise<void> {
  await remove("sessionToken");
}

// ── Session role ────────────────────────────────────────────────────
//
// Matches the `user_role` enum in legal-sos-admin/lib/db/schema.ts.
// UI copy may still say "advocate" for end-users, but internally we
// align on "lawyer" to match the database and the admin app.

export type SessionRole = "client" | "lawyer";

export async function getSessionRole(): Promise<SessionRole | null> {
  const raw = await get("sessionRole");
  if (raw === "client" || raw === "lawyer") return raw;
  return null;
}

export async function setSessionRole(role: SessionRole): Promise<void> {
  await set("sessionRole", role);
}

export async function clearSessionRole(): Promise<void> {
  await remove("sessionRole");
}

// ── Refresh token (Phase A wiring will use this) ────────────────────
//
// The mobile app holds two credentials in SecureStore after sign-in:
//   • sessionToken  → short-lived access JWT (15 min) — sent as Bearer
//   • refreshToken  → long-lived opaque token (90d) — exchanged for new
//                     access JWTs when the access JWT expires
// Until the OTP backend ships, both are unset.

export async function getRefreshToken(): Promise<string | null> {
  return get("refreshToken");
}

export async function setRefreshToken(token: string): Promise<void> {
  await set("refreshToken", token);
}

export async function clearRefreshToken(): Promise<void> {
  await remove("refreshToken");
}

// ── Active case reference ───────────────────────────────────────────

export async function getActiveCaseRef(): Promise<string | null> {
  return get("activeCaseRef");
}

export async function setActiveCaseRef(caseRef: string): Promise<void> {
  await set("activeCaseRef", caseRef);
}

export async function clearActiveCaseRef(): Promise<void> {
  await remove("activeCaseRef");
}

// ── Push token ──────────────────────────────────────────────────────

export async function getPushToken(): Promise<string | null> {
  return get("pushToken");
}

export async function setPushToken(token: string): Promise<void> {
  await set("pushToken", token);
}
