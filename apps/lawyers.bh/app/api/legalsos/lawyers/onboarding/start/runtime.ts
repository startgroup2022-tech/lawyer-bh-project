import { ensureCountryProvisionedForRegistration } from "@/lib/db/country-tables";
import {
  createLawyerOnboardingRateLimiter,
} from "@/lib/registration/lawyer-onboarding-rate-limit";
import { sendLawyerOnboardingVerificationEmail } from "@/lib/registration/lawyer-onboarding-email";
import {
  beginLawyerOnboarding,
  incrementLawyerOnboardingRateLimit,
  pruneLawyerOnboardingRateLimits,
} from "@/lib/registration/lawyer-onboarding-store";

import { createStartLawyerOnboardingHandler } from "./route";

function legalSosWebsiteOrigin() {
  const configured = process.env.LEGAL_SOS_WEBSITE_URL?.trim();
  if (!configured) throw new Error("LEGAL_SOS_WEBSITE_URL is not configured");

  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new Error("LEGAL_SOS_WEBSITE_URL must use HTTPS");
  }

  return url.origin;
}

const limiter = createLawyerOnboardingRateLimiter({
  increment: incrementLawyerOnboardingRateLimit,
  prune: pruneLawyerOnboardingRateLimits,
});

export const startLawyerOnboarding = createStartLawyerOnboardingHandler({
  ensureCountry: ensureCountryProvisionedForRegistration,
  checkRateLimit: (operation, ipAddress, email) =>
    limiter.check(operation, ipAddress, email),
  begin: async (input) => {
    const country = await ensureCountryProvisionedForRegistration(
      input.countryCode,
    );
    if (!country) return { shouldDeliver: false };
    return beginLawyerOnboarding({ ...input, country });
  },
  sendVerification: async (input) => {
    await sendLawyerOnboardingVerificationEmail(input);
  },
  websiteOrigin: legalSosWebsiteOrigin(),
});
