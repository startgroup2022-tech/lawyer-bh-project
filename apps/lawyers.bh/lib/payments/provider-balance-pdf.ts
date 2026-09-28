import "server-only";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { promises as fs } from "node:fs";
import path from "node:path";

export type ProviderBalancePdfSource = {
  publicReference: string;
  providerNameAr: string;
  providerNameEn: string;
  customerName: string;
  description: string;
  amount: string;
  currencyCode: string;
  dueDate: string | null;
  status: string;
  paidAt: Date | null;
};

type RenderInput = {
  kind: "invoice" | "receipt";
  locale: "ar" | "en";
  balance: ProviderBalancePdfSource;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const PRIMARY = rgb(0.72, 0.11, 0.11);
const INK = rgb(0.08, 0.1, 0.14);
const MUTED = rgb(0.38, 0.42, 0.48);

async function loadFont(name: string) {
  return new Uint8Array(await fs.readFile(path.join(process.cwd(), "public", "fonts", name)));
}

function drawAligned(page: PDFPage, font: PDFFont, text: string, y: number, size: number, rtl: boolean, color = INK) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rtl ? PAGE_WIDTH - MARGIN - width : MARGIN, y, size, font, color });
}

function drawValue(page: PDFPage, font: PDFFont, label: string, value: string, y: number, rtl: boolean) {
  drawAligned(page, font, label, y, 9, rtl, MUTED);
  drawAligned(page, font, value || "-", y - 19, 12, rtl);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 8);
}

export async function renderProviderBalancePdf({ kind, locale, balance }: RenderInput) {
  const isAr = locale === "ar";
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(await loadFont(isAr ? "Cairo-Full.ttf" : "Cairo-Latin.ttf"), { subset: true });
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const title = kind === "invoice"
    ? (isAr ? "مطالبة مالية" : "Payment Invoice")
    : (isAr ? "إيصال دفع" : "Payment Receipt");
  document.setTitle(`Lawyers.bh ${kind === "invoice" ? "Invoice" : "Receipt"} ${balance.publicReference}`);
  document.setAuthor("Lawyers.bh");
  document.setSubject(balance.publicReference);

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 16, width: PAGE_WIDTH, height: 16, color: PRIMARY });
  drawAligned(page, font, "Lawyers.bh", 752, 24, isAr, PRIMARY);
  drawAligned(page, font, title, 714, 19, isAr);
  drawAligned(page, font, balance.publicReference, 686, 10, isAr, MUTED);
  page.drawLine({ start: { x: MARGIN, y: 666 }, end: { x: PAGE_WIDTH - MARGIN, y: 666 }, thickness: 1, color: rgb(0.88, 0.89, 0.91) });

  const provider = isAr ? balance.providerNameAr : balance.providerNameEn;
  drawValue(page, font, isAr ? "مقدم الخدمة" : "Service provider", provider, 630, isAr);
  drawValue(page, font, isAr ? "العميل" : "Customer", balance.customerName, 574, isAr);
  drawValue(page, font, isAr ? "تاريخ الإصدار" : "Issue date", new Date().toISOString().slice(0, 10), 518, isAr);
  drawValue(page, font, isAr ? "تاريخ الاستحقاق" : "Due date", balance.dueDate ?? (isAr ? "غير محدد" : "Not specified"), 462, isAr);

  drawAligned(page, font, isAr ? "وصف الخدمة" : "Service description", 402, 9, isAr, MUTED);
  let descriptionY = 378;
  for (const line of wrap(balance.description, font, 11, PAGE_WIDTH - MARGIN * 2)) {
    drawAligned(page, font, line, descriptionY, 11, isAr);
    descriptionY -= 18;
  }

  page.drawRectangle({ x: MARGIN, y: 190, width: PAGE_WIDTH - MARGIN * 2, height: 88, color: rgb(0.98, 0.96, 0.96), borderColor: rgb(0.91, 0.78, 0.78), borderWidth: 1 });
  drawAligned(page, font, isAr ? "المبلغ الإجمالي" : "Total amount", 244, 10, isAr, MUTED);
  drawAligned(page, font, `${Number(balance.amount).toFixed(3)} ${balance.currencyCode}`, 214, 22, isAr, PRIMARY);

  if (kind === "receipt") {
    const paidAt = balance.paidAt ? balance.paidAt.toISOString().slice(0, 10) : "-";
    drawAligned(page, font, isAr ? `مدفوع - ${paidAt}` : `PAID - ${paidAt}`, 150, 13, isAr, rgb(0.06, 0.52, 0.28));
  } else if (balance.status === "cancelled") {
    drawAligned(page, font, isAr ? "ملغاة" : "CANCELLED", 150, 13, isAr, PRIMARY);
  }

  drawAligned(page, font, isAr ? "صدرت هذه الوثيقة إلكترونيًا من منصة محامون." : "This document was issued electronically by Lawyers.bh.", 74, 9, isAr, MUTED);
  return document.save();
}
