import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CareersView from "./CareersView";
import ApplicationForm from "./[slug]/ApplicationForm";

describe("public careers UI", () => {
  it.each(["ar", "en"])("provides an honest empty state without invented vacancies (%s)", (locale) => {
    const html = renderToStaticMarkup(<CareersView locale={locale} jobs={[]} page={1} hasMore={false} />);
    expect(html).toContain(locale === "ar" ? "لا توجد وظائف متاحة حاليًا" : "No open positions right now");
    expect(html).not.toContain("/careers/undefined");
  });
  it.each(["ar", "en"])("offers required contact, experience, consent and a PDF upload without login (%s)", (locale) => {
    const html = renderToStaticMarkup(<ApplicationForm locale={locale} jobId="test" />);
    for (const name of ["fullName", "email", "phone", "location", "qualification", "yearsExperience", "cv", "consent"]) expect(html).toContain(`name="${name}"`);
    expect(html).toContain('accept="application/pdf,.pdf"');
    expect(html).not.toContain('type="password"');
  });
});
