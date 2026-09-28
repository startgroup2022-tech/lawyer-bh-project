import { describe, expect, it } from "vitest";
import { rentalSubmissionFingerprint } from "./fingerprint";

const input = {
  propertyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  unitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  applicantType: "company" as const,
  applicantNameAr: "شركة الاختبار",
  applicantNameEn: "Test Company",
  registrationNumber: "CR-100",
  startDate: "2030-01-01",
  endDate: "2030-12-31",
  durationMonths: 12,
  idDocumentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

describe("rental submission fingerprint", () => {
  it("treats uppercase and lowercase UUID spellings as the same complete request", () => {
    expect(rentalSubmissionFingerprint({
      ...input,
      propertyId: input.propertyId.toUpperCase(),
      unitId: input.unitId.toUpperCase(),
      idDocumentId: input.idDocumentId.toUpperCase(),
    })).toBe(rentalSubmissionFingerprint(input));
  });
});
