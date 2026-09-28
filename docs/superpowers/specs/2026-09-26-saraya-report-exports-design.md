# Saraya Square Report Exports Design

## Objective

Add complete, prepared PDF and Excel exports to the existing Saraya Square reports area without replacing useful dashboard or operational functionality. Users can export either one comprehensive report or a focused report for a specific operational domain.

## Report Catalogue

The reports page provides these report types:

1. Comprehensive property report.
2. Financial and collection report.
3. Invoice report.
4. Lease report.
5. Unit and occupancy report.
6. Tenant and owner report.
7. Virtual-address report.
8. Maintenance and expense report.
9. Meeting-room booking report.

The comprehensive report contains an executive summary plus every applicable detailed section. Focused reports contain the same domain data and totals as the matching comprehensive-report section.

## Filters

Every report is scoped to an authorized property. Users can select:

- Today.
- Current month, which is the default.
- Current quarter.
- Current year.
- Custom inclusive start and end dates.
- Applicable record status for focused reports.

Dates use the Bahrain timezone. Invalid or reversed ranges are rejected before export. Exported files show the selected property, period, filters, locale, generation timestamp, and requesting user.

## Data and Authorization

The server owns report queries, aggregation, authorization, and file generation. The Flutter client sends only the report type, property identifier, locale, date range, format, and supported optional filters.

Existing Saraya role and property-membership rules apply. Owners receive only owner-scoped records where the existing access model requires it. Tenants cannot export management reports. Each export writes an audit-log entry without storing the generated file or exposing records from another property.

All numbers come from registered Saraya tables and operational services. Empty datasets produce a valid report with zero totals and an explicit no-records message; they never invent sample rows.

## Export API

Add one authenticated endpoint:

`GET /api/saraya/v1/reports/export`

Supported query parameters:

- `propertyId`
- `reportType`
- `format`: `pdf` or `xlsx`
- `locale`: `ar` or `en`
- `from`: ISO date
- `to`: ISO date
- `status`: optional report-specific status

The endpoint returns a downloadable attachment with a localized, filesystem-safe filename. Validation and authorization failures use the existing stable Saraya error envelope. Generation failures return a localized retryable error and do not create a misleading partial file.

## PDF Output

PDF files use Saraya Square branding and A4 pages. Arabic output is RTL and English output is LTR. Each file contains:

- Cover header with property, report name, period, and generation details.
- Executive metric cards or a compact KPI table.
- Detailed tables with repeated page headers.
- Currency and date formatting appropriate to the selected locale.
- Section totals and a final grand total where applicable.
- Page numbers and a generated-from-Saraya footer.

Long tables paginate without clipping. Columns are selected per report rather than shrinking every database field into an unreadable page.

## Excel Output

Excel files are formatted workbooks, not raw CSV exports. They contain:

- A `Summary` worksheet with report metadata and key totals.
- One worksheet per included domain.
- Frozen headers, filters, readable widths, styled headings, and alternating rows.
- Typed date, integer, decimal, and currency cells.
- Formula-backed section totals where appropriate.
- Arabic right-to-left worksheet direction for Arabic exports.

The comprehensive workbook contains all applicable domain worksheets. A focused workbook contains `Summary` plus its domain worksheet.

## Flutter Reports Experience

The existing reports summary remains visible and gains:

- Quick period controls and a custom date-range picker.
- A comprehensive-report card.
- Focused report cards grouped by financial and operational purpose.
- `Download PDF` and `Download Excel` actions on every card.
- Format-specific progress indicators that prevent duplicate requests.
- Clear success and failure messages.

On web, downloads use the authenticated response and browser download behavior. The responsive layout remains usable on mobile and desktop, with Arabic RTL and English LTR support.

## Boundaries

- No scheduled or emailed reports in this phase.
- No background export queue unless measured report size proves synchronous generation unsafe.
- No charts that duplicate the existing metrics without adding operational value.
- No public deployment, commit, or push is included.

## Testing and Acceptance

Backend tests cover:

- Property and owner scoping.
- Management-role authorization.
- Every preset and custom date range.
- Status filters.
- Accurate section and grand totals.
- Empty datasets.
- PDF and XLSX response headers and valid file signatures.
- Audit logging only after successful generation.

Flutter tests cover:

- Default current-month selection.
- Preset and custom date changes.
- Report-card rendering.
- PDF and Excel download requests.
- Duplicate-download prevention.
- Localized success and error states.

Acceptance requires opening representative Arabic and English PDF and Excel files, visually checking their layout and totals, running focused backend and Flutter tests, running TypeScript and Flutter analysis, building the web app, publishing only to the local Saraya bundle, and verifying downloads in the local browser without modifying business records.
