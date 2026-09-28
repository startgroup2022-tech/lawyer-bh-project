import { describe, expect, it } from "vitest";
import { canTransition, nextResumeStage } from "./onboarding-state";

const empty = { stage: "pending_admin" as const, commercialRegistrationFileId: null, personalIdFileId: null, ibanCertificateFileId: null, leadId: null, retailerId: null, destinationId: null, payoutEnabled: false };

describe("Tap onboarding state", () => {
  it("allows forward transitions and failure, but forbids backwards transitions", () => {
    expect(canTransition("pending_admin", "tap_uploading_files")).toBe(true);
    expect(canTransition("tap_creating_lead", "tap_creating_retailer")).toBe(true);
    expect(canTransition("tap_creating_retailer", "tap_failed")).toBe(true);
    expect(canTransition("active", "tap_kyc_pending")).toBe(false);
    expect(canTransition("tap_creating_retailer", "tap_creating_lead")).toBe(false);
  });

  it.each([
    [empty, "tap_uploading_files"],
    [{ ...empty, commercialRegistrationFileId: "f1", personalIdFileId: "f2", ibanCertificateFileId: "f3" }, "tap_creating_lead"],
    [{ ...empty, commercialRegistrationFileId: "f1", personalIdFileId: "f2", ibanCertificateFileId: "f3", leadId: "l1" }, "tap_creating_retailer"],
    [{ ...empty, commercialRegistrationFileId: "f1", personalIdFileId: "f2", ibanCertificateFileId: "f3", leadId: "l1", retailerId: "r1", destinationId: "r1" }, "tap_kyc_pending"],
    [{ ...empty, stage: "active" as const }, "active"],
  ])("derives resume stage from persisted ids", (snapshot, expected) => {
    expect(nextResumeStage(snapshot)).toBe(expected);
  });
});
