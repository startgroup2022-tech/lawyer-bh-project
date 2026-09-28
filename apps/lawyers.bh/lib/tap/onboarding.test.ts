import { describe, expect, it, vi } from "vitest";
import { createTapOnboardingRunner, selectCommercialDocument, type TapOnboardingRecord } from "./onboarding";

function record(overrides: Partial<TapOnboardingRecord> = {}): TapOnboardingRecord {
  return { id: "onb_1", lawyerId: "law_1", environment: "test", marketplaceMid: "27432553", stage: "pending_admin", commercialRegistrationFileId: null, personalIdFileId: null, ibanCertificateFileId: null, leadId: null, retailerId: null, destinationId: null, payoutEnabled: false, ...overrides };
}

function setup(initial = record()) {
  let row = initial;
  const events: string[] = [];
  const repository = {
    getOrCreate: vi.fn(async () => row),
    claim: vi.fn(async (_id: string, expected: TapOnboardingRecord["stage"], stage: TapOnboardingRecord["stage"]) => { if (row.stage !== expected || row.stage === "active") return null; row = { ...row, stage }; return row; }),
    saveFileId: vi.fn(async (_id: string, kind: "commercialRegistration" | "personalId" | "ibanCertificate", value: string) => { events.push(`save:${value}`); const key = `${kind}FileId` as keyof TapOnboardingRecord; row = { ...row, [key]: value }; return row; }),
    saveLeadId: vi.fn(async (_id: string, value: string) => { events.push(`save:${value}`); row = { ...row, leadId: value }; return row; }),
    saveRetailer: vi.fn(async (_id: string, retailerId: string, destinationId: string, payoutEnabled: boolean) => { events.push(`save:${retailerId}`); row = { ...row, retailerId, destinationId, payoutEnabled }; return row; }),
    markKycPending: vi.fn(async () => { row = { ...row, stage: "tap_kyc_pending" }; return row; }),
    markFailed: vi.fn(async (_id: string, code: string, message: string) => { row = { ...row, stage: "tap_failed" }; events.push(`failed:${code}:${message}`); return row; }),
  };
  const tapClient = {
    uploadFile: vi.fn(async ({ title }: { title: string }) => { const id = `file_${title}`; events.push(`remote:${id}`); return { id }; }),
    createRetailerLead: vi.fn(async () => { events.push("remote:lead_1"); return { id: "lead_1" }; }),
    convertLeadToRetailer: vi.fn(async () => { events.push("remote:ret_1"); return { lead: { id: "lead_1", status: "registered" }, retailer: { id: "ret_1", status: { payout: false } } }; }),
  };
  const runner = createTapOnboardingRunner({ config: { mode: "test", marketplaceMid: "27432553" }, repository, tapClient, loadDocuments: vi.fn(async () => ({ commercialRegistration: new Blob(["cr"]), personalId: new Blob(["id"]), ibanCertificate: new Blob(["iban"]) })), buildLead: vi.fn(() => ({ segment: { type: "BUSINESS" as const, sub_segment: { type: "RETAILER" as const } }, country: "BH", brand: {}, entity: {}, users: [], wallet: {}, marketplace: { id: "27432553" } })) });
  return { runner, repository, tapClient, events, getRow: () => row };
}

describe("Tap onboarding runner", () => {
  it("uses a commercial record only when both its number and file exist", () => {
    expect(selectCommercialDocument({ crNumber: "CR1", institutionLicenseFileUrl: "https://blob/cr.pdf", registrationNo: "LIC1", licenseFileUrl: "https://blob/lic.pdf", licenseFileBase64: null })).toMatchObject({ number: "CR1", documentName: "commercial_registration", url: "https://blob/cr.pdf" });
    expect(selectCommercialDocument({ crNumber: "CR1", institutionLicenseFileUrl: null, registrationNo: "LIC1", licenseFileUrl: "https://blob/lic.pdf", licenseFileBase64: null })).toMatchObject({ number: "LIC1", documentName: "professional_license", url: "https://blob/lic.pdf" });
  });

  it("does no remote work when the lease claim is lost", async () => {
    const ctx = setup();
    ctx.repository.claim.mockResolvedValueOnce(null);
    await ctx.runner("law_1");
    expect(ctx.tapClient.uploadFile).not.toHaveBeenCalled();
  });
  it("persists every remote id immediately and stops at KYC pending", async () => {
    const ctx = setup();
    const result = await ctx.runner("law_1");
    expect(result.stage).toBe("tap_kyc_pending");
    expect(ctx.events).toEqual(["remote:file_Commercial registration", "save:file_Commercial registration", "remote:file_Personal ID", "save:file_Personal ID", "remote:file_IBAN certificate", "save:file_IBAN certificate", "remote:lead_1", "save:lead_1", "remote:ret_1", "save:ret_1"]);
  });

  it("reuses persisted ids when resuming", async () => {
    const ctx = setup(record({ stage: "tap_failed", commercialRegistrationFileId: "f1", personalIdFileId: "f2", ibanCertificateFileId: "f3", leadId: "lead_existing" }));
    await ctx.runner("law_1");
    expect(ctx.tapClient.uploadFile).not.toHaveBeenCalled();
    expect(ctx.tapClient.createRetailerLead).not.toHaveBeenCalled();
    expect(ctx.tapClient.convertLeadToRetailer).toHaveBeenCalledWith({ lead_id: "lead_existing" });
  });

  it("stores only a sanitized failure", async () => {
    const ctx = setup();
    ctx.tapClient.uploadFile.mockRejectedValueOnce(new Error("authorization sk_test_SECRET iban BH00SECRET"));
    const result = await ctx.runner("law_1");
    expect(result.stage).toBe("tap_failed");
    expect(ctx.events.join(" ")).not.toContain("sk_test_SECRET");
    expect(ctx.events.join(" ")).not.toContain("BH00SECRET");
  });
});
