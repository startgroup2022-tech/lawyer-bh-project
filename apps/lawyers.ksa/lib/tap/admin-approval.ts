import "server-only";

type OnboardingStage = { stage: string };

export function canRepairTapApproval(status: string, isActive: boolean, hasOnboarding: boolean): boolean {
  return status === "pending" || (status === "approved" && !isActive && !hasOnboarding);
}

export async function finalizeTapAdminApproval<TProvider extends { id: string; isActive: boolean }>(deps: {
  approveInactive(): Promise<TProvider>;
  createCommissions(provider: TProvider): Promise<void>;
  ensureOnboarding(provider: TProvider): Promise<OnboardingStage>;
  scheduleOnboarding(provider: TProvider): void;
}) {
  const provider = await deps.approveInactive();
  await deps.createCommissions(provider);
  const tapOnboarding = await deps.ensureOnboarding(provider);
  deps.scheduleOnboarding(provider);
  return { provider, tapOnboarding };
}
