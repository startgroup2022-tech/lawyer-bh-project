import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFHexString, PDFName, beginText, endText, rgb, setFillingRgbColor, setFontAndSize, setTextMatrix, showText, type PDFPage } from "pdf-lib";
import { layoutLine } from "../../provider-agreement/shaping";
import type { ReportDocument, ReportSection } from "./contracts";

const width = 841.89;
const height = 595.28;
const margin = 36;
const primary = rgb(0.08, 0.33, 0.28);
const ink = rgb(0.08, 0.12, 0.16);
const muted = rgb(0.42, 0.46, 0.5);

export async function renderReportPdf(report: ReportDocument, locale: "ar" | "en") {
  const rtl = locale === "ar";
  const bytes = await readFile(path.join(process.cwd(), "public/fonts", rtl ? "Cairo-Full.ttf" : "Cairo-Latin.ttf"));
  const shaper = fontkit.create(bytes);
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const embedded = await document.embedFont(bytes, { subset: false });
  document.setTitle(`${rtl ? report.metadata.propertyNameAr : report.metadata.propertyNameEn} report`);
  document.setAuthor("Saraya Square");
  let page!: PDFPage;
  let fontName!: PDFName;
  let y = 0;
  let pageNumber = 0;

  const line = (text: string, x: number, baseline: number, size = 9, color = ink, alignRight = rtl) => {
    const value = text || "—";
    const shaped = layoutLine(shaper, value, alignRight);
    const scale = size / shaper.unitsPerEm;
    const start = alignRight ? x - shaped.width * scale : x;
    page.pushOperators(beginText(), setFontAndSize(fontName, size), setFillingRgbColor(color.red, color.green, color.blue));
    for (const glyph of shaped.glyphs) page.pushOperators(setTextMatrix(1, 0, 0, 1, start + glyph.x * scale, baseline + glyph.y * scale), showText(PDFHexString.of(glyph.id.toString(16).padStart(4, "0"))));
    page.pushOperators(endText());
  };
  const newPage = () => {
    page = document.addPage([width, height]);
    fontName = page.node.newFontDictionary("Cairo", embedded.ref);
    pageNumber += 1;
    page.drawRectangle({ x: 0, y: height - 10, width, height: 10, color: primary });
    line("SARAYA SQUARE", rtl ? width - margin : margin, height - 35, 16, primary, rtl);
    line(`${report.metadata.from} — ${report.metadata.to}`, rtl ? margin : width - 180, height - 35, 8, muted, false);
    line(`${rtl ? "صفحة" : "Page"} ${pageNumber}`, width / 2 - 20, 18, 8, muted, false);
    y = height - 58;
  };
  const heading = (ar: string, en: string, size = 14) => {
    if (y < 70) newPage();
    line(rtl ? ar : en, rtl ? width - margin : margin, y, size, primary, rtl);
    y -= size + 10;
  };
  const drawTable = (section: ReportSection) => {
    const columns = section.columns.slice(0, 6);
    const usable = width - margin * 2;
    const cellWidth = usable / Math.max(columns.length, 1);
    const header = () => {
      page.drawRectangle({ x: margin, y: y - 5, width: usable, height: 22, color: rgb(0.9, 0.95, 0.93) });
      columns.forEach((column, index) => {
        const logical = rtl ? columns.length - 1 - index : index;
        line(rtl ? column.labelAr : column.labelEn, margin + logical * cellWidth + (rtl ? cellWidth - 6 : 6), y + 2, 8, primary, rtl);
      });
      y -= 24;
    };
    header();
    if (!section.rows.length) {
      line(rtl ? "لا توجد سجلات ضمن الفترة المحددة" : "No records in the selected period", rtl ? width - margin : margin, y, 9, muted, rtl);
      y -= 24;
    }
    for (const row of section.rows) {
      if (y < 48) { newPage(); heading(section.titleAr, section.titleEn, 11); header(); }
      columns.forEach((column, index) => {
        const logical = rtl ? columns.length - 1 - index : index;
        const raw = row[column.key];
        const value = raw == null ? "—" : String(raw);
        const clipped = value.length > 28 ? `${value.slice(0, 27)}…` : value;
        line(clipped, margin + logical * cellWidth + (rtl ? cellWidth - 6 : 6), y, 7.5, ink, rtl);
      });
      page.drawLine({ start: { x: margin, y: y - 5 }, end: { x: width - margin, y: y - 5 }, thickness: 0.4, color: rgb(0.87, 0.89, 0.9) });
      y -= 18;
    }
    if (section.totals?.length) {
      if (y < 35) {
        newPage();
        heading(section.titleAr, section.titleEn, 11);
      }
      const totals = section.totals.map((total) => `${rtl ? total.labelAr : total.labelEn}: ${total.value}`).join("  •  ");
      line(totals, rtl ? width - margin : margin, y, 9, primary, rtl);
      y -= 17;
    }
  };

  newPage();
  heading(rtl ? report.metadata.propertyNameAr : report.metadata.propertyNameEn, report.metadata.propertyNameEn, 18);
  heading("ملخص التقرير", "Report summary", 13);
  for (const metric of report.summary) {
    line(`${rtl ? metric.labelAr : metric.labelEn}: ${metric.value}`, rtl ? width - margin : margin, y, 10, ink, rtl);
    y -= 18;
  }
  y -= 8;
  for (const section of report.sections) {
    heading(section.titleAr, section.titleEn);
    drawTable(section);
    y -= 12;
  }
  return document.save();
}
