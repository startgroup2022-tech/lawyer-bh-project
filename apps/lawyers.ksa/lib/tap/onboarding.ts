import "server-only";

import { TapApiError, type TapClient } from "./client";
import { getTapConfig } from "./config";
import { nextResumeStage, type TapOnboardingSnapshot, type TapOnboardingStage } from "./onboarding-state";
import type { TapRetailerLeadInput } from "./types";

export type TapOnboardingRecord = TapOnboardingSnapshot & {
  id: string;
  lawyerId: string;
  environment: "test" | "live";
  marketplaceMid: string;
};

type FileKind = "commercialRegistration" | "personalId" | "ibanCertificate";
type Documents = Record<FileKind, Blob>;

export interface TapOnboardingRepository {
  getOrCreate(lawyerId: string, environment: "test" | "live", marketplaceMid: string): Promise<TapOnboardingRecord>;
  claim(id: string, expectedStage: TapOnboardingStage, stage: TapOnboardingStage): Promise<TapOnboardingRecord | null>;
  saveFileId(id: string, kind: FileKind, value: string): Promise<TapOnboardingRecord>;
  saveLeadId(id: string, value: string): Promise<TapOnboardingRecord>;
  saveRetailer(id: string, retailerId: string, destinationId: string, payoutEnabled: boolean): Promise<TapOnboardingRecord>;
  markKycPending(id: string): Promise<TapOnboardingRecord>;
  markFailed(id: string, code: string, message: string): Promise<TapOnboardingRecord>;
}

type RunnerDeps = {
  config?: { mode: "test" | "live"; marketplaceMid: string };
  repository: TapOnboardingRepository;
  tapClient: Pick<TapClient, "uploadFile" | "createRetailerLead" | "convertLeadToRetailer">;
  loadDocuments(lawyerId: string): Promise<Documents>;
  buildLead(lawyerId: string, fileIds: { commercialRegistration: string; personalId: string; ibanCertificate: string }): TapRetailerLeadInput | Promise<TapRetailerLeadInput>;
};

export function createTapOnboardingRunner(deps: RunnerDeps) {
  return async function run(lawyerId: string): Promise<TapOnboardingRecord> {
    const config = deps.config ?? getTapConfig();
    let row = await deps.repository.getOrCreate(lawyerId, config.mode, config.marketplaceMid);
    if (row.stage === "active") return row;

    try {
      let resume = nextResumeStage(row);
      const claimed = await deps.repository.claim(row.id, row.stage, resume);
      if (!claimed) return row;
      row = claimed;

      if (resume === "tap_uploading_files") {
        const documents = await deps.loadDocuments(lawyerId);
        const uploads: Array<[FileKind, keyof Pick<TapOnboardingRecord, "commercialRegistrationFileId" | "personalIdFileId" | "ibanCertificateFileId">, string, "commercial_registration" | "identity_document" | "bank_certificate"]> = [
          ["commercialRegistration", "commercialRegistrationFileId", "Commercial registration", "commercial_registration"],
          ["personalId", "personalIdFileId", "Personal ID", "identity_document"],
          ["ibanCertificate", "ibanCertificateFileId", "IBAN certificate", "bank_certificate"],
        ];
        for (const [kind, key, title, purpose] of uploads) {
          if (row[key]) continue;
          const uploaded = await deps.tapClient.uploadFile({ file: documents[kind], title, purpose });
          row = await deps.repository.saveFileId(row.id, kind, uploaded.id);
        }
        resume = nextResumeStage(row);
      }

      if (resume === "tap_creating_lead") {
        const fileIds = {
          commercialRegistration: requiredId(row.commercialRegistrationFileId),
          personalId: requiredId(row.personalIdFileId),
          ibanCertificate: requiredId(row.ibanCertificateFileId),
        };
        const lead = await deps.tapClient.createRetailerLead(await deps.buildLead(lawyerId, fileIds));
        row = await deps.repository.saveLeadId(row.id, lead.id);
        resume = nextResumeStage(row);
      }

      if (resume === "tap_creating_retailer") {
        const account = await deps.tapClient.convertLeadToRetailer({ lead_id: requiredId(row.leadId) });
        row = await deps.repository.saveRetailer(row.id, account.retailer.id, account.retailer.id, account.retailer.status.payout);
      }

      return deps.repository.markKycPending(row.id);
    } catch (error) {
      const code = error instanceof TapApiError ? `tap_http_${error.status}` : "tap_onboarding_failed";
      return deps.repository.markFailed(row.id, code, "Tap onboarding request failed");
    }
  };
}

function requiredId(value: string | null): string {
  if (!value) throw new Error("Missing persisted Tap identifier");
  return value;
}

export type CommercialDocumentSource = {
  url: string | null;
  base64: string | null;
  number: string;
  documentName: "commercial_registration" | "professional_license";
};

export function selectCommercialDocument(input: {
  crNumber: string | null;
  institutionLicenseFileUrl: string | null;
  registrationNo: string;
  licenseFileUrl: string | null;
  licenseFileBase64: string | null;
}): CommercialDocumentSource {
  if (input.crNumber && input.institutionLicenseFileUrl) {
    return { url: input.institutionLicenseFileUrl, base64: null, number: input.crNumber, documentName: "commercial_registration" };
  }
  return { url: input.licenseFileUrl, base64: input.licenseFileBase64, number: input.registrationNo, documentName: "professional_license" };
}

export async function runTapOnboarding(lawyerId: string): Promise<TapOnboardingRecord> {
  const { runTapOnboardingRuntime } = await import("./onboarding-runtime");
  return runTapOnboardingRuntime(lawyerId);
}
