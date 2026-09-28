import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { projectPublicFaqRows } from "./public-projection";

export async function getPublicFaqGroups() {
  const [categories, questions] = await Promise.all([
    db.select().from(schema.faqCategories).where(and(eq(schema.faqCategories.status, "published"), isNull(schema.faqCategories.archivedAt))).orderBy(asc(schema.faqCategories.position), asc(schema.faqCategories.createdAt), asc(schema.faqCategories.id)),
    db.select().from(schema.faqQuestions).where(and(eq(schema.faqQuestions.status, "published"), isNull(schema.faqQuestions.archivedAt))).orderBy(asc(schema.faqQuestions.position), asc(schema.faqQuestions.createdAt), asc(schema.faqQuestions.id)),
  ]);
  return projectPublicFaqRows(categories, questions);
}
