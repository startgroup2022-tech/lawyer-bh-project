import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TrainingForm from "@/app/[locale]/training/TrainingForm";
import CodezyCredit from "@/components/CodezyCredit";
import CareersView from "@/app/[locale]/careers/CareersView";
import { buildPageMetadata } from "@/lib/seo/metadata";
describe("training form and site entry points", () => {
  it.each(["ar", "en"])("renders required CV and optional university letter in %s", locale => {
    const html = renderToStaticMarkup(<TrainingForm locale={locale} />);
    expect(html.match(/<input[^>]*name="cv"[^>]*>/)?.[0]).toContain('required');
    expect(html).toMatch(/<input[^>]+name="university_letter"/);
    expect(html.match(/<input[^>]+name="university_letter"[^>]*>/)?.[0]).not.toContain("required");
    expect(html).toContain('name="consent"'); expect(html).toContain('value="other"');
    expect(html).not.toContain('type="password"');
  });
  it.each(["ar", "en"])("links only the localized developer name in %s", locale => {
    const html = renderToStaticMarkup(<CodezyCredit locale={locale} />);
    expect(html).toContain('href="https://codezy-tech.com"'); expect(html).toContain('target="_blank"'); expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(locale === "ar" ? "تمت البرمجة بواسطة" : "Developed by");
    expect(html).toMatch(locale === "ar" ? />كودزي<\/a>/ : />Codezy<\/a>/);
  });
  it("exposes training even when no job openings exist", () => {
    const html = renderToStaticMarkup(<CareersView locale="ar" jobs={[]} page={1} hasMore={false} />);
    expect(html).toContain('href="/ar/training"');
  });
  it("uses a training canonical and both language alternates", () => {
    const metadata = buildPageMetadata("training", "ar");
    expect(metadata.alternates?.canonical).toBe("https://www.lawyers.bh/ar/training");
    expect(metadata.alternates?.languages?.en).toBe("https://www.lawyers.bh/en/training");
  });
});
