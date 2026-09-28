import type { LawyerOnboardingPublicState } from "@/lib/registration/lawyer-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusDependencies = {
  readSession(token: string): Promise<LawyerOnboardingPublicState | null>;
};

export function createReadLawyerOnboardingStatusHandler(
  dependencies: StatusDependencies,
) {
  return async function readLawyerOnboardingStatus(request: Request) {
    const token =
      request.headers
        .get("authorization")
        ?.match(/^Bearer\s+([A-Za-z0-9_-]{43})$/)?.[1] ?? "";
    const state = token ? await dependencies.readSession(token) : null;

    if (!state) {
      return Response.json(
        { ok: false, code: "ONBOARDING_SESSION_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      { ok: true, state },
      { headers: { "Cache-Control": "no-store" } },
    );
  };
}

export async function GET(request: Request) {
  const { readLawyerOnboardingSession } = await import(
    "@/lib/registration/lawyer-onboarding-store"
  );
  return createReadLawyerOnboardingStatusHandler({
    readSession: readLawyerOnboardingSession,
  })(request);
}
