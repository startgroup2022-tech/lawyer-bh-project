// PostHog client config for the mobile app.
//
// PostHogProvider auto-captures:
//   • Screen views (via expo-router integration)
//   • App lifecycle events (foreground/background)
//   • Device + OS metadata (via expo-device, expo-application, expo-localization)
//
// Manual capture via `usePostHog()` hook:
//   posthog.capture('case_created', { case_type: 'arrest', fee_bhd: 150 })
//
// Privacy: PostHog key is public (project write key, not a secret).
// Personal data (CPR, OTP, phone numbers) should NEVER be captured —
// use scrubbed identifiers (user UUID) instead.

import type { PostHogProviderProps } from "posthog-react-native";

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export const isPostHogConfigured = (): boolean => Boolean(POSTHOG_KEY);

export const postHogConfig: Omit<PostHogProviderProps, "children"> = {
  apiKey: POSTHOG_KEY,
  options: {
    host: POSTHOG_HOST,
    // Flush 20 events at a time or every 10s, whichever comes first.
    flushAt: 20,
    flushInterval: 10_000,
    // Session recording stays OFF by default — opt-in per-screen if
    // we want it (we DO NOT want it on the consultation call).
    enableSessionReplay: false,
  },
  autocapture: {
    captureScreens: true,
    captureTouches: false, // privacy-respecting default
  },
};

/** Common event names — keep these centralized so analytics dashboards
 *  can be built off a known taxonomy. */
export const Events = {
  AppOpen: "app_open",
  CountrySelected: "country_selected",
  RoleSelected: "role_selected",
  SosPressed: "sos_pressed",
  CaseCreated: "case_created",
  CaseCancelled: "case_cancelled",
  OtpRequested: "otp_requested",
  OtpVerified: "otp_verified",
  KycCompleted: "kyc_completed",
  ConsentSigned: "consent_signed",
  ConsultationJoined: "consultation_joined",
  ConsultationEnded: "consultation_ended",
  CaseRated: "case_rated",
  LawyerAcceptedDispatch: "lawyer_accepted_dispatch",
} as const;
