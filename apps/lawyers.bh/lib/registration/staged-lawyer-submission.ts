import type { LawyerOnboardingLocale } from "./lawyer-onboarding";

export type LockedOnboardingIdentity = {
  onboardingId: string;
  countryCode: string;
  locale: LawyerOnboardingLocale;
  fullName: string;
  email: string;
  professionalIdentifier: string;
};

type SubmissionDependencies = {
  request: Request;
  identity: LockedOnboardingIdentity;
  findExistingPending?(
    identity: LockedOnboardingIdentity,
  ): Promise<{ id: string; countryCode: string } | null>;
  submitPending(request: Request): Promise<Response>;
  markSubmitted(input: {
    onboardingId: string;
    lawyerId: string;
  }): Promise<void>;
};

export async function submitStagedLawyerApplication(
  dependencies: SubmissionDependencies,
) {
  const { identity } = dependencies;
  const existing = await dependencies.findExistingPending?.(identity);

  if (existing) {
    await dependencies.markSubmitted({
      onboardingId: identity.onboardingId,
      lawyerId: existing.id,
    });
    return Response.json(
      {
        ok: true,
        id: existing.id,
        reference: existing.id,
        countryCode: existing.countryCode,
        status: "pending",
        profileCompleted: true,
        isActive: false,
        nextStep: "pending_approval",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const form = await dependencies.request.formData();

  form.set("countryCode", identity.countryCode);
  form.set("email", identity.email);
  form.set("licenseNumber", identity.professionalIdentifier);
  form.set("subscriptionType", "lawyer");
  form.set("lang", identity.locale === "ar" ? "ar" : "en");

  if (identity.locale === "ar") {
    form.set("fullNameAr", identity.fullName);
  } else {
    form.set("fullNameEn", identity.fullName);
  }

  const headers = new Headers(dependencies.request.headers);
  headers.delete("content-type");
  headers.delete("authorization");

  const pendingResponse = await dependencies.submitPending(
    new Request(dependencies.request.url, {
      method: "POST",
      headers,
      body: form,
    }),
  );

  if (!pendingResponse.ok) return pendingResponse;

  const payload = (await pendingResponse.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const lawyerId = typeof payload?.id === "string" ? payload.id : "";
  if (!lawyerId) {
    return Response.json(
      { ok: false, code: "INVALID_REGISTRATION_RESPONSE" },
      { status: 502 },
    );
  }

  await dependencies.markSubmitted({
    onboardingId: identity.onboardingId,
    lawyerId,
  });

  return Response.json(
    {
      ...payload,
      status: "pending",
      profileCompleted: true,
      isActive: false,
      nextStep: "pending_approval",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
