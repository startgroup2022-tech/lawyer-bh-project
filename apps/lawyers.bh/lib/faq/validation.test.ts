import { describe, expect, it } from "vitest";
import { parseFaqCategoryInput, parseFaqQuestionInput, parseLifecycleAction, parseReorderInput } from "./validation";

const idA = "11111111-1111-4111-8111-111111111111";
const idB = "22222222-2222-4222-8222-222222222222";
const category = { key: "getting-started", nameAr: "البدء", nameEn: "Getting started", descriptionAr: "وصف", descriptionEn: "Description", iconKey: "help-circle", status: "published" };
const question = { categoryId: idA, questionAr: "سؤال؟", questionEn: "Question?", answerAr: "إجابة", answerEn: "Answer", status: "published" };

describe("FAQ validation", () => {
  it("requires complete bilingual category content before publication", () => {
    expect(() => parseFaqCategoryInput({ ...category, nameEn: " " })).toThrowError("bilingual_content_required");
    expect(parseFaqCategoryInput({ ...category, status: "draft", nameEn: " " }).nameEn).toBe("");
  });

  it("requires complete bilingual question content before publication", () => {
    expect(() => parseFaqQuestionInput({ ...question, answerAr: "" })).toThrowError("bilingual_content_required");
  });

  it("normalizes valid content and rejects untrusted values", () => {
    expect(parseFaqCategoryInput({ ...category, key: "  GETTING Started  " }).key).toBe("getting-started");
    expect(() => parseFaqCategoryInput({ ...category, iconKey: "<script>" })).toThrowError("invalid_icon");
    expect(() => parseFaqQuestionInput({ ...question, categoryId: "bad" })).toThrowError("invalid_category");
  });

  it("accepts a complete unique UUID order", () => {
    expect(parseReorderInput({ ids: [idA, idB] })).toEqual([idA, idB]);
  });

  it("rejects duplicate and malformed order IDs", () => {
    expect(() => parseReorderInput({ ids: [idA, idA] })).toThrowError("duplicate_order_id");
    expect(() => parseReorderInput({ ids: ["bad"] })).toThrowError("invalid_order_id");
  });

  it("accepts only supported lifecycle actions", () => {
    expect(parseLifecycleAction("archive")).toBe("archive");
    expect(() => parseLifecycleAction("delete")).toThrowError("invalid_action");
  });
});
