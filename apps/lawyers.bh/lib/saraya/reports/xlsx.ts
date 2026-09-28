import ExcelJS from "exceljs";
import type { ReportDocument } from "./contracts";

const green = "FF155348";
const pale = "FFE6F0ED";

export async function renderReportXlsx(report: ReportDocument, locale: "ar" | "en") {
  const rtl = locale === "ar";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Saraya Square";
  workbook.created = new Date(report.metadata.generatedAt);
  const summary = workbook.addWorksheet(rtl ? "الملخص" : "Summary", { views: [{ rightToLeft: rtl }] });
  const metadata = [
    [rtl ? "العقار" : "Property", rtl ? report.metadata.propertyNameAr : report.metadata.propertyNameEn],
    [rtl ? "الفترة" : "Period", `${report.metadata.from} — ${report.metadata.to}`],
    [rtl ? "تاريخ الإصدار" : "Generated at", report.metadata.generatedAt],
    ...report.summary.map((metric) => [rtl ? metric.labelAr : metric.labelEn, metric.value]),
  ];
  summary.addRows(metadata);
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 42;
  summary.getColumn(1).font = { bold: true, color: { argb: green } };

  for (const section of report.sections) {
    const name = (rtl ? section.titleAr : section.titleEn).slice(0, 31);
    const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, rightToLeft: rtl }] });
    sheet.columns = section.columns.map((column) => ({ header: rtl ? column.labelAr : column.labelEn, key: column.key, width: column.kind === "text" || !column.kind ? 24 : 16 }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: green } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, section.columns.length) } };
    if (!section.rows.length) sheet.addRow({ [section.columns[0]?.key ?? "message"]: rtl ? "لا توجد سجلات ضمن الفترة المحددة" : "No records in the selected period" });
    for (const source of section.rows) {
      const row: Record<string, unknown> = {};
      for (const column of section.columns) {
        const value = source[column.key];
        row[column.key] = column.kind === "money" || column.kind === "number" ? Number(value ?? 0) : column.kind === "date" && value ? new Date(`${value}T00:00:00Z`) : value;
      }
      sheet.addRow(row);
    }
    for (let index = 2; index <= sheet.rowCount; index += 1) {
      if (index % 2 === 0) sheet.getRow(index).fill = { type: "pattern", pattern: "solid", fgColor: { argb: pale } };
      section.columns.forEach((column, columnIndex) => {
        const cell = sheet.getRow(index).getCell(columnIndex + 1);
        if (column.kind === "money") cell.numFmt = '#,##0.000 "BHD"';
        if (column.kind === "date") cell.numFmt = "yyyy-mm-dd";
      });
    }
    if (section.totals?.length) {
      sheet.addRow([]);
      for (const total of section.totals) sheet.addRow([rtl ? total.labelAr : total.labelEn, total.value]);
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
