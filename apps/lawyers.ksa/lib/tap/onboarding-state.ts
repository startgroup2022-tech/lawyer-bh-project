export const TAP_ONBOARDING_STAGES = ["pending_admin", "tap_uploading_files", "tap_creating_lead", "tap_creating_retailer", "tap_kyc_pending", "tap_failed", "active"] as const;
export type TapOnboardingStage = (typeof TAP_ONBOARDING_STAGES)[number];

const forward: Record<TapOnboardingStage, TapOnboardingStage[]> = {
  pending_admin: ["tap_uploading_files", "tap_failed"],
  tap_uploading_files: ["tap_creating_lead", "tap_failed"],
  tap_creating_lead: ["tap_creating_retailer", "tap_failed"],
  tap_creating_retailer: ["tap_kyc_pending", "tap_failed"],
  tap_kyc_pending: ["active", "tap_failed"],
  tap_failed: ["tap_uploading_files", "tap_creating_lead", "tap_creating_retailer", "tap_kyc_pending"],
  active: [],
};

export function canTransition(from: TapOnboardingStage, to: TapOnboardingStage): boolean {
  return from === to || forward[from].includes(to);
}

export type TapOnboardingSnapshot = {
  stage: TapOnboardingStage;
  commercialRegistrationFileId: string | null;
  personalIdFileId: string | null;
  ibanCertificateFileId: string | null;
  leadId: string | null;
  retailerId: string | null;
  destinationId: string | null;
  payoutEnabled: boolean;
};

export function nextResumeStage(row: TapOnboardingSnapshot): TapOnboardingStage {
  if (row.stage === "active") return "active";
  if (!row.commercialRegistrationFileId || !row.personalIdFileId || !row.ibanCertificateFileId) return "tap_uploading_files";
  if (!row.leadId) return "tap_creating_lead";
  if (!row.retailerId || !row.destinationId) return "tap_creating_retailer";
  return "tap_kyc_pending";
}
