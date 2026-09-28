import type { SendEmailInput } from "@/lib/postmark";

import {
  buildLicenseExpiryReminder,
  classifyLicenseDate,
  type LicenseReminderKind,
} from "./license-expiry-maintenance";

export type LicenseExpiryCandidate = {
  lawyerId: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  locale: "ar" | "en";
  expiryDate: string;
};

export interface LicenseExpiryStore {
  deactivateExpired(runDate: string): Promise<number>;
  listReminderCandidates(runDate: string): Promise<LicenseExpiryCandidate[]>;
  claimReminder(
    candidate: LicenseExpiryCandidate,
    kind: LicenseReminderKind,
  ): Promise<string | null>;
  markReminderSent(claimId: string): Promise<void>;
  markReminderFailed(claimId: string, message: string): Promise<void>;
}

type DeliverEmail = (input: SendEmailInput) => Promise<unknown>;

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 500);
  return "Email delivery failed";
}

export async function runLicenseExpiryMaintenance(input: {
  runDate: string;
  store: LicenseExpiryStore;
  deliver: DeliverEmail;
}) {
  const deactivated = await input.store.deactivateExpired(input.runDate);
  const candidates = await input.store.listReminderCandidates(input.runDate);
  let remindersSent = 0;
  let remindersFailed = 0;

  for (const candidate of candidates) {
    const classification = classifyLicenseDate(input.runDate, candidate.expiryDate);
    if (classification !== "30_days" && classification !== "7_days") continue;

    const claimId = await input.store.claimReminder(candidate, classification);
    if (!claimId) continue;

    try {
      const daysRemaining = classification === "30_days" ? 30 : 7;
      await input.deliver({
        ...buildLicenseExpiryReminder({
          fullNameAr: candidate.fullNameAr,
          fullNameEn: candidate.fullNameEn,
          locale: candidate.locale,
          expiryDate: candidate.expiryDate,
          daysRemaining,
        }),
        to: candidate.email,
      });
      await input.store.markReminderSent(claimId);
      remindersSent += 1;
    } catch (error) {
      await input.store.markReminderFailed(claimId, errorMessage(error));
      remindersFailed += 1;
      console.error("[license-expiry] reminder delivery failed", {
        lawyerId: candidate.lawyerId,
        reminderKind: classification,
        error,
      });
    }
  }

  return { deactivated, remindersSent, remindersFailed };
}
