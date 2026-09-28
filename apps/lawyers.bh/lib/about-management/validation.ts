import { AboutManagementError, type AboutMemberInput, type AboutSchemaType, type AboutSectionInput } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
function required(value: unknown, code: string) { const result = text(value); if (!result) throw new AboutManagementError(code); return result; }
function list(value: unknown, code: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new AboutManagementError(code);
  const items = value.map((item) => item.trim()).filter(Boolean);
  if (items.length > 30 || items.some((item) => item.length > 2_000)) throw new AboutManagementError(code);
  return items;
}

export function parseAboutSectionInput(value: unknown): AboutSectionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AboutManagementError("invalid_section");
  const v = value as Record<string, unknown>;
  return { romanLabel: required(v.romanLabel, "roman_label_required"), headingAr: required(v.headingAr, "bilingual_heading_required"), headingEn: required(v.headingEn, "bilingual_heading_required") };
}

export function parseAboutMemberInput(value: unknown): AboutMemberInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AboutManagementError("invalid_member");
  const v = value as Record<string, unknown>; const sectionId = text(v.sectionId);
  if (!UUID.test(sectionId)) throw new AboutManagementError("invalid_section");
  const schemaType = text(v.schemaType) as AboutSchemaType;
  if (schemaType !== "Person" && schemaType !== "Organization") throw new AboutManagementError("invalid_schema_type");
  const nameAr = text(v.nameAr), nameEn = text(v.nameEn);
  if (schemaType === "Person" ? (!nameAr || !nameEn) : Boolean(nameAr) !== Boolean(nameEn)) throw new AboutManagementError("bilingual_name_required");
  return {
    sectionId, nameAr, nameEn, titleAr: required(v.titleAr, "bilingual_title_required"), titleEn: required(v.titleEn, "bilingual_title_required"),
    slug: text(v.slug), schemaType, featured: v.featured === true,
    previousExperienceAr: list(v.previousExperienceAr, "invalid_experience"), previousExperienceEn: list(v.previousExperienceEn, "invalid_experience"),
    experienceAr: list(v.experienceAr, "invalid_experience"), experienceEn: list(v.experienceEn, "invalid_experience"),
    yearsOfExperienceAr: text(v.yearsOfExperienceAr), yearsOfExperienceEn: text(v.yearsOfExperienceEn),
    previousEmployerAr: text(v.previousEmployerAr), previousEmployerEn: text(v.previousEmployerEn),
    tasksAr: list(v.tasksAr, "invalid_tasks"), tasksEn: list(v.tasksEn, "invalid_tasks"), tasksLabelAr: text(v.tasksLabelAr), tasksLabelEn: text(v.tasksLabelEn),
  };
}

export function parseAboutReorderInput(value: unknown) {
  const ids = value && typeof value === "object" && !Array.isArray(value) ? (value as { ids?: unknown }).ids : null;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !UUID.test(id))) throw new AboutManagementError("invalid_order_id");
  if (new Set(ids).size !== ids.length) throw new AboutManagementError("duplicate_order_id");
  return ids as string[];
}
