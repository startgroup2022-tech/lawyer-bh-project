import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("@/lib/terms-management/service", () => ({ getPublishedTerms: vi.fn(async () => ({ version: 1, contentAr: "محتوى منشور", contentEn: "Published content" })) }));

import Page from "./page";

describe("LegalSOS safety policy additions", () => {
  it("adds binding community standards to Terms of Use", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "en", document: "terms" }) }));
    expect(html).toContain("Community Standards form part of these Terms");
    expect(html).toContain("reporting and blocking");
  });

  it("discloses moderation processing in the Arabic privacy policy", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "ar", document: "privacy" }) }));
    expect(html).toContain("بيانات البلاغ");
    expect(html).toContain("سياق محدود من المحادثة");
  });
});
