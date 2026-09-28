import type { TermsVersion } from "./types";

export type RegistrationAcceptanceMetadata = {
  ip: string | null;
  userAgent: string | null;
};

export type RegistrationAcceptanceInput = {
  lawyerId: string;
  termsVersionId: string;
  acceptedIp: string | null;
  acceptedUserAgent: string | null;
  source: "registration";
};

export type RegistrationTermsRepository = {
  getPublished(): Promise<TermsVersion | null>;
  insertAcceptance(input: RegistrationAcceptanceInput): Promise<void>;
};

export class TermsRegistrationError extends Error {
  constructor(public readonly code: "terms_version_required" | "terms_version_stale") {
    super(code);
    this.name = "TermsRegistrationError";
  }
}

export function createRegistrationTermsService(repository: RegistrationTermsRepository) {
  async function requirePublished() {
    const published = await repository.getPublished();
    if (!published) throw new TermsRegistrationError("terms_version_required");
    return published;
  }

  return {
    async getCurrentRegistrationTerms(locale: string) {
      const published = await requirePublished();
      return {
        id: published.id,
        version: published.version,
        content: locale === "ar" ? published.contentAr : published.contentEn,
        platformPercentageYearOne: published.platformPercentageYearOne,
        platformPercentageYearTwo: published.platformPercentageYearTwo,
        lawyerPercentageYearOne: published.lawyerPercentageYearOne,
        lawyerPercentageYearTwo: published.lawyerPercentageYearTwo,
      };
    },

    async validateRegistrationTermsVersion(termsVersionId: string) {
      if (!termsVersionId.trim()) throw new TermsRegistrationError("terms_version_required");
      const published = await requirePublished();
      if (published.id !== termsVersionId) throw new TermsRegistrationError("terms_version_stale");
      return published;
    },

    async recordRegistrationAcceptance(
      transaction: RegistrationTermsRepository,
      lawyerId: string,
      termsVersionId: string,
      metadata: RegistrationAcceptanceMetadata,
    ) {
      await transaction.insertAcceptance({
        lawyerId,
        termsVersionId,
        acceptedIp: metadata.ip,
        acceptedUserAgent: metadata.userAgent,
        source: "registration",
      });
    },
  };
}
