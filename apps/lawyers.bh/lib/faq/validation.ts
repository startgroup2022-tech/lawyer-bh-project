import { FaqDomainError, type FaqCategoryInput, type FaqIconKey, type FaqQuestionInput, type FaqStatus } from "./types";

export const FAQ_ICON_KEYS = ["help-circle", "scale", "user-check", "credit-card", "shield-check"] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FaqDomainError("invalid_payload");
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") throw new FaqDomainError("invalid_text");
  const normalized = value.trim();
  if (normalized.length > max) throw new FaqDomainError("text_too_long");
  return normalized;
}

function status(value: unknown): FaqStatus {
  if (value !== "draft" && value !== "published") throw new FaqDomainError("invalid_status");
  return value;
}

export function parseFaqCategoryInput(value: unknown): FaqCategoryInput {
  const source = record(value);
  const key = text(source.key, 64).toLowerCase().replace(/\s+/g, "-");
  if (!keyPattern.test(key)) throw new FaqDomainError("invalid_key");
  const iconKey = text(source.iconKey, 32);
  if (!FAQ_ICON_KEYS.includes(iconKey as FaqIconKey)) throw new FaqDomainError("invalid_icon");
  const result: FaqCategoryInput = {
    key, nameAr: text(source.nameAr, 160), nameEn: text(source.nameEn, 160),
    descriptionAr: text(source.descriptionAr, 500), descriptionEn: text(source.descriptionEn, 500),
    iconKey: iconKey as FaqIconKey, status: status(source.status),
  };
  if (result.status === "published" && (!result.nameAr || !result.nameEn || !result.descriptionAr || !result.descriptionEn)) throw new FaqDomainError("bilingual_content_required");
  return result;
}

export function parseFaqQuestionInput(value: unknown): FaqQuestionInput {
  const source = record(value);
  const categoryId = text(source.categoryId, 36);
  if (!uuidPattern.test(categoryId)) throw new FaqDomainError("invalid_category");
  const result: FaqQuestionInput = {
    categoryId, questionAr: text(source.questionAr, 500), questionEn: text(source.questionEn, 500),
    answerAr: text(source.answerAr, 5000), answerEn: text(source.answerEn, 5000), status: status(source.status),
  };
  if (result.status === "published" && (!result.questionAr || !result.questionEn || !result.answerAr || !result.answerEn)) throw new FaqDomainError("bilingual_content_required");
  return result;
}

export function parseReorderInput(value: unknown) {
  const source = record(value);
  if (!Array.isArray(source.ids)) throw new FaqDomainError("invalid_order");
  const ids = source.ids.map((id) => {
    if (typeof id !== "string" || !uuidPattern.test(id)) throw new FaqDomainError("invalid_order_id");
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new FaqDomainError("duplicate_order_id");
  return ids;
}

export function parseExpectedUpdatedAt(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new FaqDomainError("invalid_updated_at");
  return new Date(value);
}

export function parseUuid(value: unknown, code = "invalid_id") {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new FaqDomainError(code);
  return value;
}

export type FaqLifecycleAction = "update" | "publish" | "draft" | "archive" | "restore";
export function parseLifecycleAction(value: unknown): FaqLifecycleAction {
  if (value === "update" || value === "publish" || value === "draft" || value === "archive" || value === "restore") return value;
  throw new FaqDomainError("invalid_action");
}
