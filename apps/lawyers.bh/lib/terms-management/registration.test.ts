import { describe, expect, it } from "vitest";
import {
  createRegistrationTermsService,
  TermsRegistrationError,
  type RegistrationTermsRepository,
} from "./registration";
import type { TermsVersion } from "./types";

const published: TermsVersion = {
  id: "terms-v3", documentType: "lawyer_registration", version: 3,
  status: "published", contentAr: "شروط عربية", contentEn: "English terms",
  platformPercentageYearOne: "20.00", platformPercentageYearTwo: "45.00",
  lawyerPercentageYearOne: "80.00", lawyerPercentageYearTwo: "55.00",
  createdAt: "2026-09-09T00:00:00.000Z", updatedAt: "2026-09-09T00:00:00.000Z",
  publishedAt: "2026-09-09T00:00:00.000Z", archivedAt: null,
};

function repository(current: TermsVersion | null = published) {
  const acceptances: Array<Record<string, unknown>> = [];
  const repo: RegistrationTermsRepository = {
    async getPublished() { return current; },
    async insertAcceptance(value) { acceptances.push(value); },
  };
  return { repo, acceptances };
}

describe("registration terms", () => {
  it("returns locale content and published commission shares", async () => {
    const { repo } = repository();
    const service = createRegistrationTermsService(repo);
    await expect(service.getCurrentRegistrationTerms("ar")).resolves.toEqual({
      id: "terms-v3", version: 3, content: "شروط عربية",
      platformPercentageYearOne: "20.00", platformPercentageYearTwo: "45.00",
      lawyerPercentageYearOne: "80.00", lawyerPercentageYearTwo: "55.00",
    });
  });

  it("requires an available publication", async () => {
    const service = createRegistrationTermsService(repository(null).repo);
    await expect(service.getCurrentRegistrationTerms("en")).rejects.toMatchObject({ code: "terms_version_required" });
  });

  it("accepts only the exact current published version", async () => {
    const service = createRegistrationTermsService(repository().repo);
    await expect(service.validateRegistrationTermsVersion("")).rejects.toMatchObject({ code: "terms_version_required" });
    await expect(service.validateRegistrationTermsVersion("terms-v2")).rejects.toMatchObject({ code: "terms_version_stale" });
    await expect(service.validateRegistrationTermsVersion("terms-v3")).resolves.toEqual(published);
  });

  it("records exact-version acceptance through the supplied transaction", async () => {
    const { repo, acceptances } = repository();
    const service = createRegistrationTermsService(repo);
    await service.recordRegistrationAcceptance(repo, "lawyer-1", "terms-v3", { ip: "127.0.0.1", userAgent: "test" });
    expect(acceptances).toEqual([{ lawyerId: "lawyer-1", termsVersionId: "terms-v3", acceptedIp: "127.0.0.1", acceptedUserAgent: "test", source: "registration" }]);
  });

  it("exposes stable registration error codes", () => {
    expect(new TermsRegistrationError("terms_version_stale").code).toBe("terms_version_stale");
  });
});
