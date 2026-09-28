import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TermsPage from "./Content";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("public terms page", () => {
  it("loads only the current published general terms", () => {
    expect(pageSource).toContain('getPublishedTerms("general")');
    expect(pageSource).not.toContain("listTermsVersions");
  });

  it("renders the selected locale content with publication metadata", () => {
    const html = renderToStaticMarkup(
      React.createElement(TermsPage, {
        locale: "ar",
        terms: {
          content: "عنوان القسم\n\nالفقرة الأولى\n\n- البند الأول\n- البند الثاني",
          version: 7,
          publishedAt: "2026-09-09T08:30:00.000Z",
        },
      }),
    );
    expect(html).toContain("عنوان القسم");
    expect(html).toContain("الفقرة الأولى");
    expect(html).toContain("البند الأول");
    expect(html).toContain("الإصدار 7");
    expect(html).toContain("٢٠٢٦");
    expect(html).toContain('dir="rtl"');
  });

  it("escapes stored markup rather than injecting it", () => {
    const html = renderToStaticMarkup(React.createElement(TermsPage, {
      locale: "en",
      terms: { content: '<img src=x onerror="alert(1)">', version: 2, publishedAt: null },
    }));
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(pageSource).not.toContain("dangerouslySetInnerHTML");
  });
});
