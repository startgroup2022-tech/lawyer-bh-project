import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JobsAdmin from "./JobsAdmin";
import ApplicantsAdmin from "./applications/ApplicantsAdmin";
describe("careers administration", () => {
  it.each(["ar", "en"])("offers a bilingual job editor and applicant navigation (%s)", (locale) => {
    const html = renderToStaticMarkup(<JobsAdmin locale={locale} initialJobs={[]} initialHasMore={false} countries={[{ code: "BH", nameAr: "اسم الدولة من الخادم", nameEn: "Server country label" }]} />);
    expect(html).toContain(locale === "ar" ? "اسم الدولة من الخادم" : "Server country label");
    expect(html).toContain(`href="/${locale}/admin/careers/applications"`);
    for (const name of ["titleAr", "titleEn", "descriptionAr", "descriptionEn", "requirementsAr", "requirementsEn", "closesAt"]) expect(html).toContain(`name="${name}"`);
  });
  it.each(["ar", "en"])("shows an empty applicant list with job/status filters (%s)", (locale) => {
    const html = renderToStaticMarkup(<ApplicantsAdmin locale={locale} jobs={[]} initialApplications={[]} initialTotal={0} initialJobId="" />);
    expect(html).toContain('name="jobId"'); expect(html).toContain('name="status"');
    expect(html).toContain(locale === "ar" ? "لا توجد طلبات مطابقة" : "No matching applications");
  });
});
