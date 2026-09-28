import "server-only";

type OnboardingStage = { stage: string };

export function canRepairTapApproval(status: string, _isActive: boolean, hasOnboarding: boolean): boolean {
  return status === "pending" || (status === "approved" && !hasOnboarding);
}

export async function finalizeTapAdminApproval<TProvider extends { id: string; isActive: boolean }>(deps: {
  tapRequired?: boolean;
  approveProvider(): Promise<TProvider>;
  createCommissions(provider: TProvider): Promise<void>;
  ensureOnboarding(provider: TProvider): Promise<OnboardingStage>;
  scheduleOnboarding(provider: TProvider): void;
}) {
  const provider = await deps.approveProvider();
  await deps.createCommissions(provider);
  if (deps.tapRequired === false) {
    return { provider, tapOnboarding: { stage: "not_applicable" } };
  }
  const tapOnboarding = await deps.ensureOnboarding(provider);
  deps.scheduleOnboarding(provider);
  return { provider, tapOnboarding };
}
