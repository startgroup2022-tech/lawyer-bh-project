import { APPLICATION_STATUSES, CareersError, CV_MAX_BYTES, EMPLOYMENT_TYPES, JOB_STATUSES, type ApplicationInput, type Job, type JobInput } from "./types";
import { SEO_ORIGIN } from "@/lib/seo/core";
import { countryCatalog } from "@/lib/countries/catalog";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CareersError("invalid_input");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new CareersError("invalid_input");
  return value.trim();
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) throw new CareersError("invalid_input");
  return value as T;
}
export function parseJob(value: unknown): JobInput {
  const v = record(value);
  const status = choice(v.status, JOB_STATUSES);
  const closesAt = text(v.closesAt, 40);
  if (!Number.isFinite(Date.parse(closesAt)) || (status === "published" && Date.parse(closesAt) <= Date.now())) throw new CareersError("invalid_deadline");
  const country = text(v.country, 2).toUpperCase();
  if (!countryCatalog.some((item) => item.code === country)) throw new CareersError("invalid_country");
  return {
    titleAr: text(v.titleAr, 180), titleEn: text(v.titleEn, 180), descriptionAr: text(v.descriptionAr, 12000), descriptionEn: text(v.descriptionEn, 12000),
    requirementsAr: text(v.requirementsAr, 8000), requirementsEn: text(v.requirementsEn, 8000), country,
    cityAr: text(v.cityAr, 120), cityEn: text(v.cityEn, 120), employmentType: choice(v.employmentType, EMPLOYMENT_TYPES), workMode: choice(v.workMode, ["onsite", "remote"]),
    salary: text(v.salary ?? "", 180, false), closesAt: new Date(closesAt).toISOString(), status,
  };
}
export function parseApplication(value: unknown): ApplicationInput {
  const v = record(value);
  if (v.consent !== true || (v.website !== undefined && v.website !== "")) throw new CareersError("invalid_input");
  const email = text(v.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CareersError("invalid_email");
  const phone = text(v.phone, 30);
  if (!/^[+\d\s()\-]{7,30}$/.test(phone)) throw new CareersError("invalid_phone");
  const yearsExperience = v.yearsExperience;
  if (typeof yearsExperience !== "number" || !Number.isInteger(yearsExperience) || yearsExperience < 0 || yearsExperience > 80) throw new CareersError("invalid_experience");
  return { fullName: text(v.fullName, 160), email, phone, location: text(v.location, 200), qualification: text(v.qualification, 300), yearsExperience, message: text(v.message ?? "", 4000, false), consent: true };
}
export function parseReview(value: unknown) {
  const v = record(value);
  if (!Number.isSafeInteger(v.version) || Number(v.version) < 1) throw new CareersError("invalid_version");
  return { status: choice(v.status, APPLICATION_STATUSES), notes: text(v.notes ?? "", 6000, false), version: Number(v.version) };
}
export function isOpenJob(job: { status: string; closesAt: string }, now = new Date()) {
  return job.status === "published" && Date.parse(job.closesAt) > now.getTime();
}
export function validatePdfBytes(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes.length > CV_MAX_BYTES) throw new CareersError("invalid_cv_size");
  const decoder = new TextDecoder();
  if (!decoder.decode(bytes.slice(0, 8)).startsWith("%PDF-") || !decoder.decode(bytes.slice(-1024)).includes("%%EOF")) throw new CareersError("invalid_pdf");
}
export function jobStructuredData(job: Job, locale: string) {
  if (!isOpenJob(job) || !job.publishedAt) return null;
  const ar = locale === "ar";
  return {
    "@context": "https://schema.org", "@type": "JobPosting", title: ar ? job.titleAr : job.titleEn,
    description: `${ar ? job.descriptionAr : job.descriptionEn}\n\n${ar ? job.requirementsAr : job.requirementsEn}`,
    identifier: { "@type": "PropertyValue", name: "Lawyers.bh", value: job.id },
    url: `${SEO_ORIGIN}/${locale}/careers/${job.slug}`, datePosted: job.publishedAt, validThrough: job.closesAt,
    employmentType: job.employmentType, directApply: true,
    hiringOrganization: { "@type": "Organization", name: "Lawyers.bh", sameAs: SEO_ORIGIN },
    ...(job.workMode === "remote" ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: job.country } } : {
      jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: job.country, addressLocality: ar ? job.cityAr : job.cityEn } },
    }),
  };
}
