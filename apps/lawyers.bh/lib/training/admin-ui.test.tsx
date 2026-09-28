import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import TrainingAdmin from "@/app/[locale]/admin/training/TrainingAdmin";
import ApplicantDetail from "@/app/[locale]/admin/training/ApplicantDetail";
import type { TrainingApplication } from "./types";
it.each(["ar", "en"])("renders private training filters and empty state in %s", locale => {
  const html = renderToStaticMarkup(<TrainingAdmin locale={locale} initialApplications={[]} initialTotal={0} />);
  expect(html).toContain('name="query"');
  expect(html).toContain('name="status"');
  expect(html).toContain('name="archived"');
  expect(html).not.toContain('type="file"');
  expect(html).toContain(locale === "ar" ? "لا توجد طلبات" : "No applications");
});
it("shows protected attachments, separate internal notes and restore without rendering applicant HTML", () => {
  const application: TrainingApplication = { id: "00000000-0000-4000-8000-000000000001", reference: "TRN-TEST", fullName: "Test", email: "test@example.invalid", type: "law", status: "accepted", version: 2, createdAt: "2026-09-09T00:00:00Z", updatedAt: "2026-09-09T01:00:00Z", archivedAt: "2026-09-09T01:00:00Z", field: "", phone: "+97333333333", location: "Manama", university: "", qualification: "Student", specialization: "Law", startDate: "2026-10-01", durationWeeks: 4, message: "<script>unsafe()</script>", consent: true, notes: "Internal note", files: [{ kind: "cv", name: "cv.pdf", size: 100 }] };
  const html = renderToStaticMarkup(<ApplicantDetail application={application} ar={false} onClose={() => {}} onUpdated={() => {}} onReload={() => {}} />);
  expect(html).toContain("Restore"); expect(html).toContain("Internal admin notes");
  expect(html).toContain(`/api/admin/training/applications/${application.id}/files/cv`);
  expect(html).not.toContain("<script>"); expect(html).toContain("&lt;script&gt;");
});
