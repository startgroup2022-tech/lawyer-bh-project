export const JOB_STATUSES = ["draft", "published", "closed", "archived"] as const;
export const APPLICATION_STATUSES = ["new", "review", "interview", "accepted", "rejected"] as const;
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN", "TEMPORARY"] as const;
export type JobInput = {
  titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string;
  requirementsAr: string; requirementsEn: string; country: string; cityAr: string; cityEn: string;
  employmentType: typeof EMPLOYMENT_TYPES[number]; workMode: "onsite" | "remote";
  salary: string; closesAt: string; status: typeof JOB_STATUSES[number];
};
export type Job = JobInput & { id: string; slug: string; version: number; publishedAt: string | null; updatedAt: string };
export type ApplicationInput = { fullName: string; email: string; phone: string; location: string; qualification: string; yearsExperience: number; message: string; consent: true };
export type Application = ApplicationInput & { id: string; jobId: string; jobTitleAr: string; jobTitleEn: string; status: typeof APPLICATION_STATUSES[number]; notes: string; version: number; createdAt: string };
export class CareersError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_CHUNK_BYTES = 1024 * 1024;
