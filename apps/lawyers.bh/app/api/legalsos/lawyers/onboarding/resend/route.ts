import { isEmail } from "@/lib/postmark";
import {
  createOpaqueToken,
  hashOpaqueToken,
  normalizeOnboardingEmail,
  type LawyerOnboardingLocale,
} from "@/lib/registration/lawyer-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendDependencies = {
  checkRateLimit(
    operation: string,
    ipAddress: string,
    email: string,
  ): Promise<void>;
  rotateVerification(input: {
    countryCode: string;
    email: string;
    verificationTokenHash: string;
    verificationExpiresAt: Date;
    now: Date;
  }): Promise<{
    fullName: string;
    email: string;
    locale: LawyerOnboardingLocale;
  } | null>;
  sendVerification(input: {
    to: string;
    fullName: string;
    locale: LawyerOnboardingLocale;
    verificationUrl: string;
  }): Promise<void>;
  createToken?: () => string;
  now?: () => Date;
  websiteOrigin: string;
};

export function createResendLawyerOnboardingHandler(
  dependencies: ResendDependencies,
) {
  return async function resendLawyerOnboarding(request: Request) {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const countryCode =
      typeof body?.countryCode === "string"
        ? body.countryCode.trim().toUpperCase()
        : "";
    const email = normalizeOnboardingEmail(
      typeof body?.email === "string" ? body.email : "",
    );
    const requestedLocale =
      typeof body?.locale === "string" ? body.locale.trim() : "";

    if (
      !/^[A-Z]{2}$/.test(countryCode) ||
      !isEmail(email) ||
      !["ar", "en", "tr"].includes(requestedLocale)
    ) {
      return Response.json(
        { ok: false, code: "INVALID_INPUT" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    try {
      await dependencies.checkRateLimit("resend", ipAddress, email);
      const now = (dependencies.now ?? (() => new Date()))();
      const rawToken = (dependencies.createToken ?? createOpaqueToken)();
      const record = await dependencies.rotateVerification({
        countryCode,
        email,
        verificationTokenHash: hashOpaqueToken(rawToken),
        verificationExpiresAt: new Date(now.getTime() + 30 * 60_000),
        now,
      });

      if (record) {
        const verificationUrl = new URL(
          `/${record.locale}/lawyer/register`,
          dependencies.websiteOrigin,
        );
        verificationUrl.searchParams.set("token", rawToken);
        await dependencies.sendVerification({
          to: record.email,
          fullName: record.fullName,
          locale: record.locale,
          verificationUrl: verificationUrl.toString(),
        });
      }

      return Response.json(
        { ok: true },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const limited =
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "RATE_LIMITED";
      return Response.json(
        { ok: false, code: limited ? "RATE_LIMITED" : "ONBOARDING_UNAVAILABLE" },
        {
          status: limited ? 429 : 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}

export async function POST(request: Request) {
  const [store, rateLimit, email] = await Promise.all([
    import("@/lib/registration/lawyer-onboarding-store"),
    import("@/lib/registration/lawyer-onboarding-rate-limit"),
    import("@/lib/registration/lawyer-onboarding-email"),
  ]);
  const limiter = rateLimit.createLawyerOnboardingRateLimiter({
    increment: store.incrementLawyerOnboardingRateLimit,
    prune: store.pruneLawyerOnboardingRateLimits,
  });
  const configured = process.env.LEGAL_SOS_WEBSITE_URL?.trim();
  if (!configured) {
    return Response.json(
      { ok: false, code: "ONBOARDING_UNAVAILABLE" },
      { status: 503 },
    );
  }

  return createResendLawyerOnboardingHandler({
    checkRateLimit: (operation, ipAddress, address) =>
      limiter.check(operation, ipAddress, address),
    rotateVerification: store.rotateLawyerOnboardingVerification,
    sendVerification: async (input) => {
      await email.sendLawyerOnboardingVerificationEmail(input);
    },
    websiteOrigin: new URL(configured).origin,
  })(request);
}
