import { describe, expect, it } from "vitest";
import { projectPublicFaqRows } from "./public-projection";

const baseCategory = { id: "c1", key: "general", nameAr: "عام", nameEn: "General", descriptionAr: "وصف", descriptionEn: "Description", iconKey: "help-circle", status: "published", position: 0, archivedAt: null, createdAt: new Date("2026-01-01") } as const;
const baseQuestion = { id: "q1", categoryId: "c1", questionAr: "س؟", questionEn: "Q?", answerAr: "ج", answerEn: "A", status: "published", position: 0, archivedAt: null, createdAt: new Date("2026-01-01") } as const;

describe("public FAQ projection", () => {
  it("returns only published unarchived content and removes empty categories", () => {
    const groups = projectPublicFaqRows(
      [baseCategory, { ...baseCategory, id: "c2", key: "draft", status: "draft" }, { ...baseCategory, id: "c3", key: "empty", position: 2 }],
      [baseQuestion, { ...baseQuestion, id: "q2", status: "draft" }, { ...baseQuestion, id: "q3", categoryId: "c2" }],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("general");
    expect(groups[0].questions.map((question) => question.id)).toEqual(["q1"]);
  });

  it("uses deterministic category and question order", () => {
    const groups = projectPublicFaqRows(
      [{ ...baseCategory, id: "c2", key: "second", position: 2 }, baseCategory],
      [{ ...baseQuestion, id: "q2", position: 2 }, baseQuestion, { ...baseQuestion, id: "q3", categoryId: "c2" }],
    );
    expect(groups.map((group) => group.id)).toEqual(["c1", "c2"]);
    expect(groups[0].questions.map((question) => question.id)).toEqual(["q1", "q2"]);
  });
});
