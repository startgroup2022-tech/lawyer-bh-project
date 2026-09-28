import type { LawyerOnboardingPublicState } from "@/lib/registration/lawyer-onboarding";
import type { LockedOnboardingIdentity } from "@/lib/registration/staged-lawyer-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmitDependencies = {
  readSession(token: string): Promise<LawyerOnboardingPublicState | null>;
  submit(input: {
    request: Request;
    identity: LockedOnboardingIdentity;
  }): Promise<Response>;
};

export function createSubmitLawyerOnboardingHandler(
  dependencies: SubmitDependencies,
) {
  return async function submitLawyerOnboarding(request: Request) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return Response.json(
        { ok: false, code: "MULTIPART_REQUIRED" },
        { status: 415, headers: { "Cache-Control": "no-store" } },
      );
    }

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

    return dependencies.submit({
      request,
      identity: {
        onboardingId: state.id,
        countryCode: state.countryCode,
        locale: state.locale,
        fullName: state.fullName,
        email: state.email,
        professionalIdentifier: state.professionalIdentifier,
      },
    });
  };
}

export async function POST(request: Request) {
  const [store, staged, join] = await Promise.all([
    import("@/lib/registration/lawyer-onboarding-store"),
    import("@/lib/registration/staged-lawyer-submission"),
    import("@/app/api/join/route"),
  ]);

  return createSubmitLawyerOnboardingHandler({
    readSession: store.readLawyerOnboardingSession,
    submit: ({ request: stagedRequest, identity }) =>
      staged.submitStagedLawyerApplication({
        request: stagedRequest,
        identity,
        findExistingPending: store.findPendingLawyerForOnboarding,
        submitPending: (pendingRequest) =>
          join.submitJoinApplication(pendingRequest, {
            mode: "web",
            channel: "legalsos-web",
          }),
        markSubmitted: store.markLawyerOnboardingSubmitted,
      }),
  })(request);
}
