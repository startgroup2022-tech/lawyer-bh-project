import { createHash } from "node:crypto";
interface FingerprintInput {
  propertyId: string;
  unitId: string;
  applicantType: "individual" | "company";
  applicantNameAr: string;
  applicantNameEn: string;
  registrationNumber?: string | null;
  startDate: string;
  endDate: string;
  durationMonths: number;
  idDocumentId: string;
}

export function rentalSubmissionFingerprint(input: FingerprintInput) {
  const canonical = JSON.stringify({
    propertyId: input.propertyId.toLowerCase(),
    unitId: input.unitId.toLowerCase(),
    applicantType: input.applicantType,
    applicantNameAr: input.applicantNameAr.trim(),
    applicantNameEn: input.applicantNameEn.trim(),
    registrationNumber: input.registrationNumber?.trim() || null,
    startDate: input.startDate,
    endDate: input.endDate,
    durationMonths: input.durationMonths,
    idDocumentId: input.idDocumentId.toLowerCase(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
