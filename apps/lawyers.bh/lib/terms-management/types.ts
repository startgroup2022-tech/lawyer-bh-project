export type PublicPolicyType = "general" | "privacy" | "refund";
export type TermsDocumentType = PublicPolicyType | "lawyer_registration" | "legalsos_terms" | "legalsos_privacy" | "legalsos_lawyer_agreement";
export type TermsVersionStatus = "draft" | "published" | "archived";

export type TermsDraftInput = {
  documentType: TermsDocumentType;
  countryCode?: string | null;
  contentAr: string;
  contentEn: string;
  platformPercentageYearOne: string | null;
  platformPercentageYearTwo: string | null;
  lawyerPercentageYearOne: string | null;
  lawyerPercentageYearTwo: string | null;
};

export type TermsVersion = TermsDraftInput & {
  id: string;
  version: number;
  status: TermsVersionStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
};

export type TermsAdminActor = { adminId: string };
