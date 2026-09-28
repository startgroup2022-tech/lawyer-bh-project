import { describe, expect, it } from "vitest";
import { filterFaqQuestions, moveOrderedId, summarizeFaq } from "./presentation";

const categories = [{ id: "c1", status: "published", archivedAt: null }, { id: "c2", status: "draft", archivedAt: "2026-01-01" }];
const questions = [{ id: "q1", categoryId: "c1", questionAr: "طريقة الدفع", questionEn: "Payment", answerAr: "بطاقة", answerEn: "Card", status: "published", archivedAt: null }];

describe("FAQ admin presentation", () => {
  it("summarizes published, draft, and archived records", () => {
    expect(summarizeFaq(categories, questions)).toEqual({ published: 2, draft: 0, archived: 1, total: 3 });
  });

  it("searches Arabic and English and applies category/status filters", () => {
    expect(filterFaqQuestions(questions, { query: "الدفع", categoryId: "all", status: "all", archived: false })).toHaveLength(1);
    expect(filterFaqQuestions(questions, { query: "card", categoryId: "c1", status: "published", archived: false })).toHaveLength(1);
    expect(filterFaqQuestions(questions, { query: "", categoryId: "c2", status: "all", archived: false })).toHaveLength(0);
  });

  it("moves IDs immutably", () => {
    const source = ["a", "b", "c"];
    expect(moveOrderedId(source, "c", "a")).toEqual(["c", "a", "b"]);
    expect(source).toEqual(["a", "b", "c"]);
  });
});
