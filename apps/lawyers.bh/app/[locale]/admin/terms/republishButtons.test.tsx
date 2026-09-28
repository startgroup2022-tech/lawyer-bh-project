import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TermsVersion } from "@/lib/terms-management/types";
import TermsAdminContent from "./TermsAdminContent";
import LawyerTermsAdminContent from "../lawyer-terms/LawyerTermsAdminContent";

const fixture = vi.hoisted(() => ({ versions: [] as TermsVersion[] }));
// Supply loaded version state for server rendering; effects/network are not run.
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => react.useState(Array.isArray(initial) ? fixture.versions : initial === true ? false : initial) };
});

describe.each([TermsAdminContent, LawyerTermsAdminContent])("terms history publish actions", (Page) => {
  it.each([true, false])("offers republish only on archived versions and keeps draft publishing (%s)", (isAr) => {
    fixture.versions = (["archived", "published", "draft"] as const).map((status, i) => ({
      id: `version-${i}`, version: i + 1, status, documentType: "general",
      contentAr: "شروط", contentEn: "Terms", platformPercentageYearOne: null,
      platformPercentageYearTwo: null, lawyerPercentageYearOne: null, lawyerPercentageYearTwo: null,
      createdAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T00:00:00Z", publishedAt: null, archivedAt: null,
    }));
    const html = renderToStaticMarkup(<Page isAr={isAr} />);
    const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)!;
    const archived = cards.find(card => card.includes(isAr ? "النسخة 1" : "Version 1"))!;
    const published = cards.find(card => card.includes(isAr ? "النسخة 2" : "Version 2"))!;
    const draft = cards.find(card => card.includes(isAr ? "النسخة 3" : "Version 3"))!;
    expect(archived).toContain(isAr ? "إعادة النشر" : "Republish");
    expect(published).not.toContain(isAr ? "إعادة النشر" : "Republish");
    expect(draft).toContain(isAr ? "نشر" : "Publish");
    expect(draft).not.toContain(isAr ? "إعادة النشر" : "Republish");
  });
});

describe("public policy navigation", () => {
  it.each(["privacy", "refund"] as const)("selects %s without mixing the policy editor", (documentType) => {
    fixture.versions = [];
    const html = renderToStaticMarkup(<TermsAdminContent isAr documentType={documentType} />);
    expect(html).toContain('href="?policy=general"');
    expect(html).toContain('href="?policy=privacy"');
    expect(html).toContain('href="?policy=refund"');
    const active = html.match(/<a[^>]+aria-current="page"[^>]*>[\s\S]*?<\/a>/)?.[0];
    expect(active).toContain(`?policy=${documentType}`);
    expect(html).toContain(documentType === "privacy" ? "سياسة الخصوصية" : "سياسة الإلغاء والاسترداد");
  });
});
