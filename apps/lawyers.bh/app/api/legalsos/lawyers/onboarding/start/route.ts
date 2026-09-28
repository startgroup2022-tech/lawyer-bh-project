import { isEmail } from "@/lib/postmark";
import {
  createOpaqueToken,
  hashOpaqueToken,
  normalizeOnboardingEmail,
  normalizeProfessionalIdentifier,
  type LawyerOnboardingLocale,
} from "@/lib/registration/lawyer-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StartInput = {
  countryCode: string;
  fullName: string;
  email: string;
  professionalIdentifier: string;
  locale: LawyerOnboardingLocale;
};

type StartDependencies = {
  ensureCountry(code: string): Promise<{ code: string } | null>;
  checkRateLimit(
    operation: string,
    ipAddress: string,
    email: string,
  ): Promise<void>;
  begin(
    input: StartInput & {
      verificationTokenHash: string;
      verificationExpiresAt: Date;
      ipAddress: string | null;
      userAgent: string | null;
    },
  ): Promise<{ shouldDeliver: boolean }>;
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

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}

function parseInput(value: unknown): StartInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const countryCode = text(body.countryCode, 2).toUpperCase();
  const fullName = text(body.fullName, 180);
  const email = normalizeOnboardingEmail(text(body.email, 120));
  const professionalIdentifier = normalizeProfessionalIdentifier(
    text(body.professionalIdentifier, 80),
  );
  const locale = text(body.locale, 5);

  if (
    !/^[A-Z]{2}$/.test(countryCode) ||
    fullName.length < 2 ||
    fullName.length > 180 ||
    email.length > 120 ||
    !isEmail(email) ||
    professionalIdentifier.length < 3 ||
    professionalIdentifier.length > 80 ||
    !["ar", "en", "tr"].includes(locale)
  ) {
    return null;
  }

  return {
    countryCode,
    fullName,
    email,
    professionalIdentifier,
    locale: locale as LawyerOnboardingLocale,
  };
}

export function createStartLawyerOnboardingHandler(
  dependencies: StartDependencies,
) {
  return async function startLawyerOnboarding(request: Request) {
    const body = await request.json().catch(() => null);
    const input = parseInput(body);

    if (!input) {
      return Response.json(
        { ok: false, code: "INVALID_INPUT" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const country = await dependencies.ensureCountry(input.countryCode);
    if (!country) {
      return Response.json(
        { ok: false, code: "COUNTRY_UNAVAILABLE" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    try {
      await dependencies.checkRateLimit("start", ipAddress, input.email);

      const rawToken = (dependencies.createToken ?? createOpaqueToken)();
      const now = (dependencies.now ?? (() => new Date()))();
      const result = await dependencies.begin({
        ...input,
        verificationTokenHash: hashOpaqueToken(rawToken),
        verificationExpiresAt: new Date(now.getTime() + 30 * 60_000),
        ipAddress: ipAddress === "unknown" ? null : ipAddress,
        userAgent: request.headers.get("user-agent"),
      });

      if (result.shouldDeliver) {
        const verificationUrl = new URL(
          `/${input.locale}/lawyer/register`,
          dependencies.websiteOrigin,
        );
        verificationUrl.searchParams.set("token", rawToken);
        await dependencies.sendVerification({
          to: input.email,
          fullName: input.fullName,
          locale: input.locale,
          verificationUrl: verificationUrl.toString(),
        });
      }

      return Response.json(
        { ok: true, nextStep: "check_email" },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const limited =
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "RATE_LIMITED";

      return Response.json(
        {
          ok: false,
          code: limited ? "RATE_LIMITED" : "ONBOARDING_UNAVAILABLE",
        },
        {
          status: limited ? 429 : 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}

export async function POST(request: Request) {
  const { startLawyerOnboarding } = await import("./runtime");
  return startLawyerOnboarding(request);
}
