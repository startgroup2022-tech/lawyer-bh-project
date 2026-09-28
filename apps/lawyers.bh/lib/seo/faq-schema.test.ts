import { describe, expect, it } from "vitest";
import { buildFaqGraph } from "./faq-schema";
import { readFileSync } from "node:fs";

describe("FAQ schema", () => {
  it("contains only supplied visible questions and answers", () => {
    const graph = buildFaqGraph([{ question: "What is Lawyers.bh?", answer: "A legal services platform." }]);
    expect(graph["@type"]).toBe("FAQPage");
    expect(graph.mainEntity).toEqual([{ "@type": "Question", name: "What is Lawyers.bh?", acceptedAnswer: { "@type": "Answer", text: "A legal services platform." } }]);
  });

  it("omits FAQ structured data when there are no published questions", () => {
    const content = readFileSync("app/[locale]/faq/Content.tsx", "utf8");
    expect(content).toContain("faqJsonLd.mainEntity.length > 0");
  });
});
