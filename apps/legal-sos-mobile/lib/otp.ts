// OTP + session functions for the mobile app.
//
// Talks to the admin's REST endpoints (the tRPC-style /api/trpc isn't
// used for the bootstrap auth flow — see admin's _app.ts comment).
// Stores the issued access JWT + refresh token in SecureStore so all
// subsequent requests (tRPC or otherwise) can pick them up.

import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiFetch, ApiError } from "./api";
import {
  setSessionToken,
  setRefreshToken,
  setSessionRole,
  clearSessionToken,
  clearRefreshToken,
  clearSessionRole,
  getSessionToken,
  getRefreshToken,
  type SessionRole,
} from "./secureStore";

// ── Types matching the server responses ─────────────────────────────

export interface SignedInUser {
  id: string;
  phone: string;
  role: SessionRole;
  fullName: string | null;
  locale: "en" | "ar";
  countryCode: "BH" | "AE" | "SA" | "KW" | "QA" | "OM";
}

interface RequestOtpOk {
  ok: true;
  expiresAt: string; // ISO timestamp
}

interface VerifyOtpOk {
  ok: true;
  accessJwt: string;
  refreshToken: string;
  user: SignedInUser;
}

interface RefreshOk {
  ok: true;
  accessJwt: string;
  refreshToken: string;
  userId: string;
  role: SessionRole;
}

// ── Public API ──────────────────────────────────────────────────────

export interface RequestOtpArgs {
  /** Strict E.164: `+97333224471` */
  phone: string;
  role: SessionRole;
  locale?: "en" | "ar";
}

export async function requestOtp(args: RequestOtpArgs): Promise<Date> {
  const data = await apiFetch<RequestOtpOk>("/api/mobile/auth/request-otp", {
    method: "POST",
    json: { ...args, locale: args.locale ?? "en" },
    anonymous: true,
  });
  return new Date(data.expiresAt);
}

export interface VerifyOtpArgs {
  phone: string;
  code: string;
  role: SessionRole;
  fullName?: string;
  idNumber?: string;
  countryCode?: "BH" | "AE" | "SA" | "KW" | "QA" | "OM";
  locale?: "en" | "ar";
}

export async function verifyOtp(args: VerifyOtpArgs): Promise<SignedInUser> {
  const device = {
    model: Platform.OS === "ios" ? "iPhone" : "Android",
    os: `${Platform.OS} ${Platform.Version}`,
    appVersion: (Constants.expoConfig?.version as string | undefined) ?? "dev",
  };

  const data = await apiFetch<VerifyOtpOk>("/api/mobile/auth/verify-otp", {
    method: "POST",
    json: {
      ...args,
      locale: args.locale ?? "en",
      countryCode: args.countryCode ?? "BH",
      device,
    },
    anonymous: true,
  });

  await Promise.all([
    setSessionToken(data.accessJwt),
    setRefreshToken(data.refreshToken),
    setSessionRole(data.user.role),
  ]);

  return data.user;
}

/**
 * Refresh the access JWT using the stored refresh token. Returns true
 * on success, false if the refresh token is invalid/expired (caller
 * should redirect to sign-in).
 */
export async function refreshSession(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  try {
    const data = await apiFetch<RefreshOk>("/api/mobile/auth/refresh", {
      method: "POST",
      json: { refreshToken: refresh },
      anonymous: true,
    });
    await Promise.all([
      setSessionToken(data.accessJwt),
      setRefreshToken(data.refreshToken),
    ]);
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await Promise.all([
        clearSessionToken(),
        clearRefreshToken(),
        clearSessionRole(),
      ]);
    }
    return false;
  }
}

/** Server-revoke + local-clear. Safe to call when already signed out. */
export async function signOutMobile(): Promise<void> {
  const refresh = await getRefreshToken();
  const access = await getSessionToken();
  if (access) {
    try {
      await apiFetch("/api/mobile/auth/signout", {
        method: "POST",
        json: refresh ? { refreshToken: refresh } : {},
      });
    } catch {
      // best-effort — proceed to clear local state regardless
    }
  }
  await Promise.all([
    clearSessionToken(),
    clearRefreshToken(),
    clearSessionRole(),
  ]);
}
