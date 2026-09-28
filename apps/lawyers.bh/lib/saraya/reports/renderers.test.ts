import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { ReportDocument } from "./contracts";
import { renderReportPdf } from "./pdf";
import { renderReportXlsx } from "./xlsx";

const rows = Array.from({ length: 80 }, (_, index) => ({ number: `INV-${index + 1}`, tenant: `عميل ${index + 1}`, amount: (index + 1).toFixed(3), date: "2026-09-15" }));
const document: ReportDocument = {
  metadata: { propertyId: "p", propertyNameAr: "سرايا سكوير", propertyNameEn: "Saraya Square", propertyCode: "SQ", currencyCode: "BHD", from: "2026-09-01", to: "2026-09-30", generatedAt: "2026-09-26T12:00:00.000Z", requestedBy: "Admin" },
  summary: [{ labelAr: "إجمالي الفواتير", labelEn: "Invoice total", value: "3240.000 BHD" }],
  sections: [{ key: "invoices", titleAr: "الفواتير", titleEn: "Invoices", columns: [{ key: "number", labelAr: "الرقم", labelEn: "Number" }, { key: "tenant", labelAr: "المستأجر", labelEn: "Tenant" }, { key: "date", labelAr: "التاريخ", labelEn: "Date", kind: "date" }, { key: "amount", labelAr: "المبلغ", labelEn: "Amount", kind: "money" }], rows, totals: [{ labelAr: "الإجمالي", labelEn: "Total", value: "3240.000 BHD" }] }],
};

describe("report renderers", () => {
  it("renders a valid paginated Arabic PDF", async () => {
    const bytes = await renderReportPdf(document, "ar");
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it("renders a formatted Arabic workbook", async () => {
    const bytes = await renderReportXlsx(document, "ar");
    expect(Buffer.from(bytes).subarray(0, 2).toString()).toBe("PK");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["الملخص", "الفواتير"]);
    expect(workbook.worksheets[0].views[0]).toMatchObject({ rightToLeft: true });
    expect(workbook.worksheets[1].autoFilter).toBeTruthy();
    expect(workbook.worksheets[1].views[0]).toMatchObject({ state: "frozen", ySplit: 1, rightToLeft: true });
  });
});
