import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
// Published policy storage is deliberately empty for the admin-only rollout.
vi.mock("./service", () => ({ getPublishedTerms: async () => null }));
import RefundPage from "@/app/[locale]/refund-policy/page";
import PrivacyPage from "@/app/[locale]/privacy/page";
import TermsAdminContent from "@/app/[locale]/admin/terms/TermsAdminContent";

describe("admin-only policy rollout", () => {
  it("keeps existing refund rights visible when no managed refund publication exists", async () => {
    const page = await RefundPage({ params: Promise.resolve({ locale: "en" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("The service provider cancels the appointment or fails to show up.");
    expect(html).toContain("14 business days");
    expect(html).not.toContain("No published");
  });
  it("keeps the existing privacy destination until independent content is approved", async () => {
    await expect(PrivacyPage({ params: Promise.resolve({ locale: "ar" }) })).rejects.toThrow("redirect:/ar/terms");
  });
  it.each(["privacy", "refund"] as const)("explains that preparing %s does not switch the visitor page", (documentType) => {
    const html = renderToStaticMarkup(<TermsAdminContent isAr={false} documentType={documentType} />);
    expect(html).toContain("not connected to the public page yet");
    expect(html).not.toContain("Open public page");
  });
});
