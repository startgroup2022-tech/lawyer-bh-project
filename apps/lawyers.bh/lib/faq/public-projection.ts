import type { FaqIconKey, PublicFaqGroup } from "./types";

type CategoryRow = { id: string; key: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; iconKey: string; status: string; position: number; archivedAt: Date | null; createdAt: Date };
type QuestionRow = { id: string; categoryId: string; questionAr: string; questionEn: string; answerAr: string; answerEn: string; status: string; position: number; archivedAt: Date | null; createdAt: Date };

const stableOrder = <T extends { position: number; createdAt: Date; id: string }>(a: T, b: T) =>
  a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);

export function projectPublicFaqRows(categories: CategoryRow[], questions: QuestionRow[]): PublicFaqGroup[] {
  const visibleQuestions = questions.filter((row) => row.status === "published" && !row.archivedAt).sort(stableOrder);
  return categories
    .filter((row) => row.status === "published" && !row.archivedAt)
    .sort(stableOrder)
    .map((category) => ({
      id: category.id,
      key: category.key,
      iconKey: category.iconKey as FaqIconKey,
      category: { ar: category.nameAr, en: category.nameEn },
      description: { ar: category.descriptionAr, en: category.descriptionEn },
      questions: visibleQuestions.filter((question) => question.categoryId === category.id).map((question) => ({
        id: question.id,
        q: { ar: question.questionAr, en: question.questionEn },
        a: { ar: question.answerAr, en: question.answerEn },
      })),
    }))
    .filter((group) => group.questions.length > 0);
}
