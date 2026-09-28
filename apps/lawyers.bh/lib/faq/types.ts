export type FaqStatus = "draft" | "published";
export type FaqIconKey = "help-circle" | "scale" | "user-check" | "credit-card" | "shield-check";

export type FaqCategoryInput = {
  key: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string;
  iconKey: FaqIconKey; status: FaqStatus;
};

export type FaqQuestionInput = {
  categoryId: string; questionAr: string; questionEn: string; answerAr: string; answerEn: string; status: FaqStatus;
};

export type FaqCategoryAdminRow = FaqCategoryInput & {
  id: string; position: number; archivedAt: string | null; updatedAt: string;
};

export type FaqQuestionAdminRow = FaqQuestionInput & {
  id: string; position: number; archivedAt: string | null; updatedAt: string;
};

export type PublicFaqGroup = {
  id: string; key: string; iconKey: FaqIconKey;
  category: { ar: string; en: string };
  description: { ar: string; en: string };
  questions: Array<{ id: string; q: { ar: string; en: string }; a: { ar: string; en: string } }>;
};

export class FaqDomainError extends Error {
  constructor(public readonly code: string, public readonly status: 400 | 404 | 409 = 400) {
    super(code);
    this.name = "FaqDomainError";
  }
}
