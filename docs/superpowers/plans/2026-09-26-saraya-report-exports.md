# Saraya Square Report Exports Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with test-first development and review each completed task before continuing.

**Goal:** Add complete, authorized Saraya Square PDF and Excel exports for one comprehensive report and eight focused operational reports.

**Architecture:** A server-side reporting module validates filters, applies property and owner scope, loads normalized report sections, and renders either PDF or XLSX bytes. The Flutter client selects report type and period, requests the authenticated file, and saves it through platform-specific download adapters while preserving the current live summary.

**Tech Stack:** Next.js route handlers, TypeScript, Drizzle/PostgreSQL, `pdf-lib`, `@pdf-lib/fontkit`, existing Arabic bidi shaping, `exceljs`, Flutter/Dart, Dio, Vitest, and Flutter widget tests.

## Global Constraints

- Use only registered Saraya data; never generate sample report rows.
- Scope every query to an authorized property and existing owner access rules.
- Reject tenant access to management reports.
- Use Bahrain timezone for date presets and inclusive report periods.
- Support Arabic RTL and English LTR output.
- Do not commit, push, or deploy publicly.
- Do not modify unrelated dirty files.

---

### Task 1: Report Contracts, Filter Validation, and Authorization

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/reports/contracts.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/service.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/service.test.ts`

**Interfaces:**
- Produces `ReportType`, `ReportFormat`, `ReportLocale`, `ReportFilter`, `ReportSection`, and `ReportDocument`.
- Produces `createReportService(repository, renderers, audit)` with `export(principal, filter): Promise<ReportFile>`.
- Consumes the existing `SarayaPrincipal`, `authorize`, and `ApiError` contracts.

- [ ] **Step 1: Write failing validation and authorization tests**

```ts
it("rejects tenants and cross-property exports", async () => {
  await expect(service.export(tenantPrincipal, validFilter)).rejects.toMatchObject({ status: 403 });
  await expect(service.export(adminPrincipal, { ...validFilter, propertyId: otherPropertyId }))
    .rejects.toMatchObject({ status: 403 });
});

it("rejects reversed or unsupported report filters", async () => {
  await expect(service.export(adminPrincipal, { ...validFilter, from: "2026-09-30", to: "2026-09-01" }))
    .rejects.toMatchObject({ status: 422 });
});
```

- [ ] **Step 2: Run the focused service test and confirm it fails because the reporting module does not exist**

Run: `npx vitest run lib/saraya/reports/service.test.ts`

- [ ] **Step 3: Implement strict contracts and service orchestration**

```ts
export type ReportType =
  | "comprehensive" | "finance" | "invoices" | "leases" | "occupancy"
  | "clients" | "virtual_addresses" | "maintenance" | "meeting_rooms";

export interface ReportFilter {
  propertyId: string;
  reportType: ReportType;
  format: "pdf" | "xlsx";
  locale: "ar" | "en";
  from: string;
  to: string;
  status?: string;
}
```

Validate ISO dates, inclusive ordering, supported enum values, role permissions, property membership, and report-specific statuses before querying. Apply `ownerId` only when the selected membership role is `owner`. Audit only after valid bytes are rendered.

- [ ] **Step 4: Run the service tests and confirm they pass**

Run: `npx vitest run lib/saraya/reports/service.test.ts`

---

### Task 2: Property-Scoped Report Data Repository

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/reports/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/repository.test.ts`

**Interfaces:**
- Produces `reportRepository.load(filter, scope): Promise<ReportDocument>`.
- Consumes `ReportFilter`, `{ ownerId?: string }`, the Drizzle database client, and Saraya schema tables.

- [ ] **Step 1: Write failing repository-contract tests**

Cover normalized rows and totals for empty and populated fixtures, inclusive dates, statuses, property isolation, and owner-scoped units, leases, requests, and invoices. Assert that a comprehensive report contains all eight focused sections and that each focused report contains only its requested section plus summary metadata.

- [ ] **Step 2: Run the repository tests and confirm the missing implementation failure**

Run: `npx vitest run lib/saraya/reports/repository.test.ts`

- [ ] **Step 3: Implement section loaders with explicit selected columns**

Create small private loaders for:

```ts
loadFinanceSection(filter, scope)
loadInvoiceSection(filter, scope)
loadLeaseSection(filter, scope)
loadOccupancySection(filter, scope)
loadClientSection(filter, scope)
loadVirtualAddressSection(filter, scope)
loadMaintenanceSection(filter, scope)
loadMeetingRoomSection(filter, scope)
```

Use parameterized Drizzle SQL, date predicates appropriate to each domain, and decimal strings for money. Include the property name/code/currency and requesting-user display name in metadata. Return zero totals and empty rows for empty datasets.

- [ ] **Step 4: Run repository and existing relevant Saraya service tests**

Run: `npx vitest run lib/saraya/reports/repository.test.ts lib/saraya/dashboard/service.test.ts lib/saraya/rentals/invoice-service.test.ts lib/saraya/leases/list-service.test.ts`

---

### Task 3: Branded PDF and Formatted Excel Renderers

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/reports/labels.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/pdf.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/pdf.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/xlsx.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/xlsx.test.ts`
- Reuse: `apps/lawyers.bh/lib/provider-agreement/shaping.ts`
- Reuse: `apps/lawyers.bh/public/fonts/Cairo-Full.ttf`
- Reuse: `apps/lawyers.bh/public/fonts/Cairo-Latin.ttf`

**Interfaces:**
- Produces `renderReportPdf(document, locale): Promise<Uint8Array>`.
- Produces `renderReportXlsx(document, locale): Promise<Uint8Array>`.
- Produces localized report, section, column, status, and empty-state labels.

- [ ] **Step 1: Write failing PDF structure tests**

```ts
it("renders a valid paginated Arabic PDF", async () => {
  const bytes = await renderReportPdf(longArabicDocument, "ar");
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(1);
  expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
});
```

Also test English output, empty sections, repeated long-table pagination, document metadata, and no clipped rows by asserting deterministic page growth.

- [ ] **Step 2: Write failing XLSX workbook tests**

Load generated bytes with `ExcelJS.Workbook.xlsx.load`. Assert `Summary`, required focused/comprehensive worksheets, frozen headers, auto-filters, RTL Arabic worksheet views, typed dates and numbers, formulas, and empty-state rows.

- [ ] **Step 3: Run renderer tests and confirm missing implementations**

Run: `npx vitest run lib/saraya/reports/pdf.test.ts lib/saraya/reports/xlsx.test.ts`

- [ ] **Step 4: Implement PDF rendering**

Use `pdf-lib`, embedded Cairo fonts, and the existing bidi shaping helper. Implement A4 page creation, Saraya header, metadata block, KPI rows, section headings, column-specific tables, repeated headers, page breaks, totals, and page-number footer. Keep column sets readable per report instead of dumping every schema field.

- [ ] **Step 5: Implement XLSX rendering**

Use `exceljs` with a styled `Summary` sheet and one sheet per included domain. Freeze row 1, enable filters, set widths, apply number/date/currency formats, alternate row fills, formula totals, and `rightToLeft: true` for Arabic sheets.

- [ ] **Step 6: Run renderer tests and visually render representative PDF pages**

Run: `npx vitest run lib/saraya/reports/pdf.test.ts lib/saraya/reports/xlsx.test.ts`

Render representative Arabic and English PDFs to PNG and inspect all pages for shaping, clipping, totals, and page headers.

---

### Task 4: Authenticated Export Endpoint and Audit Trail

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/reports/http.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/http.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/reports/runtime.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/reports/export/route.ts`

**Interfaces:**
- Produces `GET /api/saraya/v1/reports/export`.
- Returns `application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with UTF-8 `Content-Disposition`.

- [ ] **Step 1: Write failing HTTP tests**

Cover missing and invalid query parameters, unauthenticated requests, forbidden tenant and cross-property requests, PDF/XLSX MIME types, safe localized filenames, binary response bodies, renderer errors, and successful audit invocation.

- [ ] **Step 2: Run the HTTP tests and confirm the missing-handler failure**

Run: `npx vitest run lib/saraya/reports/http.test.ts`

- [ ] **Step 3: Implement handler, runtime wiring, and route**

The handler parses query values, delegates to the report service, and returns exact binary bytes. The runtime wires existing Saraya authentication, report repository, both renderers, and an audit writer using action `report.exported` with filter metadata but no file bytes.

- [ ] **Step 4: Run all report backend tests and TypeScript validation**

Run: `npx vitest run lib/saraya/reports/*.test.ts && npx tsc --noEmit`

---

### Task 5: Flutter Download Client and Platform Save Adapters

**Files:**
- Modify: `apps/saraya_square_app/lib/core/network/api_client.dart`
- Create: `apps/saraya_square_app/lib/features/reports/domain/report_export.dart`
- Create: `apps/saraya_square_app/lib/features/reports/data/report_repository.dart`
- Create: `apps/saraya_square_app/lib/features/reports/data/report_downloader.dart`
- Create: `apps/saraya_square_app/lib/features/reports/data/report_downloader_web.dart`
- Create: `apps/saraya_square_app/lib/features/reports/data/report_downloader_native.dart`
- Create: `apps/saraya_square_app/test/features/reports/report_repository_test.dart`

**Interfaces:**
- Adds `SarayaApiClient.getBytes(path): Future<BinaryResponse>` preserving authentication and refresh behavior.
- Produces `ReportExportRequest`, `ReportKind`, `ReportPeriodPreset`, and `ReportFile`.
- Produces `ReportRepository.export(request)` and `ReportDownloader.save(file)`.

- [ ] **Step 1: Write failing API-client and repository tests**

Assert encoded query parameters, binary response preservation, filename parsing, authorization headers, one refresh retry after `401`, and typed failures for invalid binary responses.

- [ ] **Step 2: Run focused tests and confirm missing methods and classes**

Run: `flutter test test/core/network/api_client_test.dart test/features/reports/report_repository_test.dart`

- [ ] **Step 3: Implement binary networking and download adapters**

Use Dio `ResponseType.bytes`. On web, create and click a temporary object-URL anchor and revoke it. On native, save through a platform-safe writable path and open/share only if the existing platform supports it; keep the interface independent so tests use an in-memory fake.

- [ ] **Step 4: Run focused repository tests and Flutter analysis**

Run: `flutter test test/core/network/api_client_test.dart test/features/reports/report_repository_test.dart && flutter analyze`

---

### Task 6: Responsive Reports UI, Localization, and End-to-End Verification

**Files:**
- Modify: `apps/saraya_square_app/lib/features/reports/presentation/reports_screen.dart`
- Modify: `apps/saraya_square_app/lib/app/bootstrap.dart`
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/lib/app/saraya_app.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Create: `apps/saraya_square_app/test/features/reports/reports_screen_test.dart`

**Interfaces:**
- Consumes `DashboardRepository`, `ReportRepository`, and `ReportDownloader`.
- Preserves the current live summary and adds preset/custom period controls plus nine export cards.

- [ ] **Step 1: Write failing widget tests**

Test current-month default, today/month/quarter/year presets, inclusive custom range, comprehensive and focused cards, localized labels, PDF and Excel actions, one in-flight request per card/format, successful save message, error message, and responsive RTL/LTR layout.

- [ ] **Step 2: Run widget tests and confirm missing UI behavior**

Run: `flutter test test/features/reports/reports_screen_test.dart`

- [ ] **Step 3: Implement the responsive reports experience**

Keep the existing metrics at the top. Add compact date controls, custom date picker, a prominent comprehensive card, grouped focused cards, two export buttons per card, per-action progress, disabled duplicate actions, and localized snackbars. Inject the report repository and downloader through the existing bootstrap/router dependency pattern.

- [ ] **Step 4: Generate localization files and run focused tests**

Run: `flutter gen-l10n && flutter test test/features/reports/reports_screen_test.dart test/features/reports/report_repository_test.dart`

- [ ] **Step 5: Run complete verification**

Run backend report tests and `npx tsc --noEmit` with Node 22. Run `flutter analyze`, full `flutter test`, and `flutter build web --release --base-href /saraya/`.

- [ ] **Step 6: Publish only to the local static bundle and verify browser downloads**

Run: `dart run tool/publish_web.dart`

Verify in the local browser that Arabic PDF, English PDF, Arabic XLSX, and English XLSX downloads complete for a representative focused report and the comprehensive report. Open the files, inspect PDF pages and workbook sheets, compare displayed totals to exported totals, and do not create or modify business records.

- [ ] **Step 7: Mark completed checklist items and report evidence separately**

Report backend tests, Flutter tests, TypeScript, analysis, build, local HTTP, browser downloads, and visual file inspection as separate evidence. List any skipped database integration checks explicitly rather than calling them passed.
