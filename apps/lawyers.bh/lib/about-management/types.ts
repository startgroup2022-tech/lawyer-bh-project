export type AboutSchemaType = "Person" | "Organization";

export type AboutSectionInput = { romanLabel: string; headingAr: string; headingEn: string };

export type AboutMemberInput = {
  sectionId: string; nameAr: string; nameEn: string; titleAr: string; titleEn: string;
  slug: string; schemaType: AboutSchemaType; featured: boolean;
  previousExperienceAr: string[]; previousExperienceEn: string[];
  experienceAr: string[]; experienceEn: string[];
  yearsOfExperienceAr: string; yearsOfExperienceEn: string;
  previousEmployerAr: string; previousEmployerEn: string;
  tasksAr: string[]; tasksEn: string[]; tasksLabelAr: string; tasksLabelEn: string;
};

export class AboutManagementError extends Error {
  constructor(public readonly code: string, public readonly status: 400 | 404 | 409 = 400) {
    super(code); this.name = "AboutManagementError";
  }
}
