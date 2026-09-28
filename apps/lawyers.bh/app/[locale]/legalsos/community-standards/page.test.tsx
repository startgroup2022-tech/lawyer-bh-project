import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));

import Page from "./page";

describe("LegalSOS community standards", () => {
  it("publishes Arabic reporting, blocking, enforcement, and appeal guidance", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "ar" }) }));
    expect(html).toContain("الإبلاغ");
    expect(html).toContain("الحظر");
    expect(html).toContain("تعطيل المحادثة");
    expect(html).toContain("الاعتراض");
  });

  it("publishes English prohibited-content and emergency limitations", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toContain("Harassment");
    expect(html).toContain("Reporting and blocking");
    expect(html).toContain("not an emergency service");
  });
});
