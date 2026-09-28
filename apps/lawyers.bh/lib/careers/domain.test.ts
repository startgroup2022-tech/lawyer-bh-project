import { describe, expect, it } from "vitest";
import { parseJob, parseApplication, isOpenJob, validatePdfBytes, jobStructuredData } from "./domain";

export const jobFixture = { titleAr: "مستشار قانوني", titleEn: "Legal consultant", descriptionAr: "انضم إلى فريقنا القانوني", descriptionEn: "Join our legal team", requirementsAr: "خبرة في الاستشارات", requirementsEn: "Consulting experience", country: "BH", cityAr: "المنامة", cityEn: "Manama", employmentType: "FULL_TIME", workMode: "onsite", salary: "", closesAt: "2030-12-31T20:59:59.000Z", status: "published" };
export const applicationFixture = { fullName: "Applicant Name", email: " PERSON@example.com ", phone: "+973 33333333", location: "Manama", qualification: "Law degree", yearsExperience: 3, message: "", consent: true, website: "" };

describe("careers domain", () => {
  it("normalizes application email and preserves applicant fields", () => {
    expect(parseApplication(applicationFixture)).toMatchObject({ email: "person@example.com", yearsExperience: 3, fullName: "Applicant Name" });
  });
  it.each([{ consent: false }, { email: "bad" }, { yearsExperience: 3.2 }, { fullName: "" }, { website: "spam" }])("rejects invalid applications %j", (change) => {
    expect(() => parseApplication({ ...applicationFixture, ...change })).toThrow();
  });
  it("requires bilingual content and a future deadline for publishing", () => {
    expect(parseJob(jobFixture).titleEn).toBe("Legal consultant");
    expect(() => parseJob({ ...jobFixture, titleAr: "" })).toThrow();
    expect(() => parseJob({ ...jobFixture, closesAt: "2020-01-01T00:00:00Z" })).toThrow();
    expect(() => parseJob({ ...jobFixture, employmentType: "wrong" })).toThrow();
    expect(() => parseJob({ ...jobFixture, country: "ZZ" })).toThrow();
  });
  it("does not allow submission at or after the deadline or to unpublished jobs", () => {
    expect(isOpenJob(jobFixture, new Date("2030-12-31T20:59:58Z"))).toBe(true);
    expect(isOpenJob(jobFixture, new Date(jobFixture.closesAt))).toBe(false);
    for (const status of ["draft", "closed", "archived"]) expect(isOpenJob({ ...jobFixture, status })).toBe(false);
  });
  it("rejects oversized and disguised PDF bytes", () => {
    expect(() => validatePdfBytes(Buffer.from("not a pdf"))).toThrow();
    expect(() => validatePdfBytes(Buffer.alloc(5 * 1024 * 1024 + 1))).toThrow();
    expect(() => validatePdfBytes(Buffer.from("%PDF-1.7\nbody\n%%EOF"))).not.toThrow();
  });
  it("emits localized schema only for an open single job, with matching location and application URL", () => {
    const job = { ...parseJob(jobFixture), id: "id", slug: "legal-consultant", version: 1, publishedAt: "2026-09-09T12:00:00Z", updatedAt: "2026-09-09T12:00:00Z" };
    expect(jobStructuredData(job, "ar")).toMatchObject({ "@type": "JobPosting", title: "مستشار قانوني", url: "https://www.lawyers.bh/ar/careers/legal-consultant", jobLocation: { address: { addressCountry: "BH", addressLocality: "المنامة" } } });
    expect(jobStructuredData({ ...job, status: "closed" }, "en")).toBeNull();
    expect(jobStructuredData({ ...job, workMode: "remote" }, "en")).toMatchObject({ jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { name: "BH" } });
  });
});
