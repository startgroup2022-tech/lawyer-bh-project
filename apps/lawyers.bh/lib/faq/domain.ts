import { FaqDomainError, type FaqStatus } from "./types";

export function assertQuestionCanPublish(category: { status: FaqStatus; archivedAt: Date | null }) {
  if (category.archivedAt) throw new FaqDomainError("category_archived", 409);
  if (category.status !== "published") throw new FaqDomainError("category_not_published", 409);
}

export function categoryCascadeFor(action: "draft" | "archive" | "restore") {
  if (action === "archive") return { questionStatus: "draft" as const, archiveQuestions: true as const };
  if (action === "restore") return { categoryStatus: "draft" as const, questionStatus: "draft" as const, restoreQuestions: true as const };
  return { questionStatus: "draft" as const };
}

export function assertCompleteOrder(currentIds: string[], requestedIds: string[]) {
  if (currentIds.length !== requestedIds.length) throw new FaqDomainError("incomplete_order", 409);
  const current = new Set(currentIds);
  if (requestedIds.some((id) => !current.has(id))) throw new FaqDomainError("out_of_scope_order_id", 409);
}
