import { describe, expect, it } from "vitest";
import { assertCompleteOrder, assertQuestionCanPublish, categoryCascadeFor } from "./domain";

describe("FAQ lifecycle domain rules", () => {
  it("allows publication only under a published unarchived category", () => {
    expect(() => assertQuestionCanPublish({ status: "draft", archivedAt: null })).toThrowError("category_not_published");
    expect(() => assertQuestionCanPublish({ status: "published", archivedAt: new Date() })).toThrowError("category_archived");
    expect(() => assertQuestionCanPublish({ status: "published", archivedAt: null })).not.toThrow();
  });

  it("defines safe category cascades", () => {
    expect(categoryCascadeFor("draft")).toEqual({ questionStatus: "draft" });
    expect(categoryCascadeFor("archive")).toEqual({ questionStatus: "draft", archiveQuestions: true });
    expect(categoryCascadeFor("restore")).toEqual({ categoryStatus: "draft", questionStatus: "draft", restoreQuestions: true });
  });

  it("requires a complete exact reorder scope", () => {
    expect(() => assertCompleteOrder(["a", "b"], ["b", "a"])).not.toThrow();
    expect(() => assertCompleteOrder(["a", "b"], ["a"])).toThrowError("incomplete_order");
    expect(() => assertCompleteOrder(["a", "b"], ["a", "c"])).toThrowError("out_of_scope_order_id");
  });
});
