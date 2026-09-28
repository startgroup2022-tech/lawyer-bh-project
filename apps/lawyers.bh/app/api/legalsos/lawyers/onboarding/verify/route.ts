import {
  createOpaqueToken,
  hashOpaqueToken,
  type LawyerOnboardingPublicState,
} from "@/lib/registration/lawyer-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyDependencies = {
  verify(input: {
    verificationToken: string;
    sessionTokenHash: string;
    sessionExpiresAt: Date;
    now: Date;
  }): Promise<LawyerOnboardingPublicState | null>;
  createToken?: () => string;
  now?: () => Date;
};

export function createVerifyLawyerOnboardingHandler(
  dependencies: VerifyDependencies,
) {
  return async function verifyLawyerOnboarding(request: Request) {
    const body = (await request.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    const verificationToken =
      typeof body?.token === "string" ? body.token.trim() : "";

    if (!/^[A-Za-z0-9_-]{43}$/.test(verificationToken)) {
      return Response.json(
        { ok: false, code: "LINK_INVALID_OR_EXPIRED" },
        { status: 410, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = (dependencies.now ?? (() => new Date()))();
    const sessionToken = (dependencies.createToken ?? createOpaqueToken)();
    const state = await dependencies.verify({
      verificationToken,
      sessionTokenHash: hashOpaqueToken(sessionToken),
      sessionExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000),
      now,
    });

    if (!state) {
      return Response.json(
        { ok: false, code: "LINK_INVALID_OR_EXPIRED" },
        { status: 410, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      { ok: true, onboardingAccessToken: sessionToken, state },
      { headers: { "Cache-Control": "no-store" } },
    );
  };
}

export async function POST(request: Request) {
  const { verifyLawyerOnboarding } = await import(
    "@/lib/registration/lawyer-onboarding-store"
  );
  return createVerifyLawyerOnboardingHandler({
    verify: verifyLawyerOnboarding,
  })(request);
}
