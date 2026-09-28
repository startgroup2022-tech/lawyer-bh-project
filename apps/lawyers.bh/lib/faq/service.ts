import "server-only";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { assertCompleteOrder, assertQuestionCanPublish } from "./domain";
import { FaqDomainError, type FaqCategoryInput, type FaqQuestionInput } from "./types";

type MutationContext = { adminId: string; expectedUpdatedAt?: Date };
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function categoryWhere(id: string, expected?: Date) {
  return expected ? and(eq(schema.faqCategories.id, id), eq(schema.faqCategories.updatedAt, expected)) : eq(schema.faqCategories.id, id);
}
function questionWhere(id: string, expected?: Date) {
  return expected ? and(eq(schema.faqQuestions.id, id), eq(schema.faqQuestions.updatedAt, expected)) : eq(schema.faqQuestions.id, id);
}

async function requireCategory(id: string, executor: typeof db | DbTransaction = db) {
  const [category] = await executor.select().from(schema.faqCategories).where(eq(schema.faqCategories.id, id)).limit(1);
  if (!category) throw new FaqDomainError("category_not_found", 404);
  return category;
}

export async function listAdminFaq() {
  const [categories, questions] = await Promise.all([
    db.select().from(schema.faqCategories).orderBy(asc(schema.faqCategories.position), asc(schema.faqCategories.createdAt), asc(schema.faqCategories.id)),
    db.select().from(schema.faqQuestions).orderBy(asc(schema.faqQuestions.categoryId), asc(schema.faqQuestions.position), asc(schema.faqQuestions.createdAt), asc(schema.faqQuestions.id)),
  ]);
  return { categories, questions };
}

export async function createCategory(input: FaqCategoryInput, context: MutationContext) {
  return db.transaction(async (tx) => {
    const [{ position }] = await tx.select({ position: max(schema.faqCategories.position) }).from(schema.faqCategories).where(isNull(schema.faqCategories.archivedAt));
    const [created] = await tx.insert(schema.faqCategories).values({ ...input, position: (position ?? -1) + 1, createdByAdminId: context.adminId, updatedByAdminId: context.adminId }).returning();
    return created;
  });
}

export async function updateCategory(id: string, input: FaqCategoryInput, context: MutationContext) {
  return db.transaction(async (tx) => {
    const current = await requireCategory(id, tx);
    if (current.archivedAt) throw new FaqDomainError("category_archived", 409);
    const now = new Date();
    const [updated] = await tx.update(schema.faqCategories).set({ ...input, updatedAt: now, updatedByAdminId: context.adminId }).where(categoryWhere(id, context.expectedUpdatedAt)).returning();
    if (!updated) throw new FaqDomainError("stale_record", 409);
    if (input.status === "draft") await tx.update(schema.faqQuestions).set({ status: "draft", updatedAt: now, updatedByAdminId: context.adminId }).where(eq(schema.faqQuestions.categoryId, id));
    return updated;
  });
}

export async function archiveCategory(id: string, context: MutationContext) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx.update(schema.faqCategories).set({ status: "draft", archivedAt: now, archivedByAdminId: context.adminId, updatedAt: now, updatedByAdminId: context.adminId }).where(categoryWhere(id, context.expectedUpdatedAt)).returning();
    if (!updated) throw new FaqDomainError("stale_or_missing_category", 409);
    await tx.update(schema.faqQuestions).set({ status: "draft", archivedAt: now, archivedByAdminId: context.adminId, updatedAt: now, updatedByAdminId: context.adminId }).where(and(eq(schema.faqQuestions.categoryId, id), isNull(schema.faqQuestions.archivedAt)));
    return updated;
  });
}

export async function restoreCategory(id: string, context: MutationContext) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx.update(schema.faqCategories).set({ status: "draft", archivedAt: null, archivedByAdminId: null, updatedAt: now, updatedByAdminId: context.adminId }).where(categoryWhere(id, context.expectedUpdatedAt)).returning();
    if (!updated) throw new FaqDomainError("stale_or_missing_category", 409);
    await tx.update(schema.faqQuestions).set({ status: "draft", archivedAt: null, archivedByAdminId: null, updatedAt: now, updatedByAdminId: context.adminId }).where(eq(schema.faqQuestions.categoryId, id));
    return updated;
  });
}

export async function reorderCategories(ids: string[], context: MutationContext) {
  return db.transaction(async (tx) => {
    const current = await tx.select({ id: schema.faqCategories.id }).from(schema.faqCategories).where(isNull(schema.faqCategories.archivedAt));
    assertCompleteOrder(current.map((row) => row.id), ids);
    const now = new Date();
    await Promise.all(ids.map((id, position) => tx.update(schema.faqCategories).set({ position, updatedAt: now, updatedByAdminId: context.adminId }).where(eq(schema.faqCategories.id, id))));
  });
}

export async function createQuestion(input: FaqQuestionInput, context: MutationContext) {
  return db.transaction(async (tx) => {
    const category = await requireCategory(input.categoryId, tx);
    if (input.status === "published") assertQuestionCanPublish(category);
    const [{ position }] = await tx.select({ position: max(schema.faqQuestions.position) }).from(schema.faqQuestions).where(and(eq(schema.faqQuestions.categoryId, input.categoryId), isNull(schema.faqQuestions.archivedAt)));
    const [created] = await tx.insert(schema.faqQuestions).values({ ...input, position: (position ?? -1) + 1, createdByAdminId: context.adminId, updatedByAdminId: context.adminId }).returning();
    return created;
  });
}

export async function updateQuestion(id: string, input: FaqQuestionInput, context: MutationContext) {
  return db.transaction(async (tx) => {
    const category = await requireCategory(input.categoryId, tx);
    if (input.status === "published") assertQuestionCanPublish(category);
    const [updated] = await tx.update(schema.faqQuestions).set({ ...input, updatedAt: new Date(), updatedByAdminId: context.adminId }).where(questionWhere(id, context.expectedUpdatedAt)).returning();
    if (!updated) throw new FaqDomainError("stale_or_missing_question", 409);
    return updated;
  });
}

export async function archiveQuestion(id: string, context: MutationContext) {
  const now = new Date();
  const [updated] = await db.update(schema.faqQuestions).set({ status: "draft", archivedAt: now, archivedByAdminId: context.adminId, updatedAt: now, updatedByAdminId: context.adminId }).where(questionWhere(id, context.expectedUpdatedAt)).returning();
  if (!updated) throw new FaqDomainError("stale_or_missing_question", 409);
  return updated;
}

export async function restoreQuestion(id: string, context: MutationContext) {
  const now = new Date();
  const [updated] = await db.update(schema.faqQuestions).set({ status: "draft", archivedAt: null, archivedByAdminId: null, updatedAt: now, updatedByAdminId: context.adminId }).where(questionWhere(id, context.expectedUpdatedAt)).returning();
  if (!updated) throw new FaqDomainError("stale_or_missing_question", 409);
  return updated;
}

export async function reorderQuestions(categoryId: string, ids: string[], context: MutationContext) {
  return db.transaction(async (tx) => {
    await requireCategory(categoryId, tx);
    const current = await tx.select({ id: schema.faqQuestions.id }).from(schema.faqQuestions).where(and(eq(schema.faqQuestions.categoryId, categoryId), isNull(schema.faqQuestions.archivedAt)));
    assertCompleteOrder(current.map((row) => row.id), ids);
    const now = new Date();
    await Promise.all(ids.map((id, position) => tx.update(schema.faqQuestions).set({ position, updatedAt: now, updatedByAdminId: context.adminId }).where(and(eq(schema.faqQuestions.id, id), eq(schema.faqQuestions.categoryId, categoryId)))));
  });
}
