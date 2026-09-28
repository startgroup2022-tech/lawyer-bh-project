import "server-only";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getCaseTypeBySlug } from "./caseTypes";

interface ActorEntry {
  actor: string;
  action: string;
  ts: string;
}

export interface CaseFileArgs {
  caseRef: string;
  caseType: string;
  serviceStatus: string;
  paymentStatus: string;
  paymentRef: string | null;
  baseFee: number;
  contactName: string;
  contactPhone: string;
  contactIdNumber: string | null;
  description: string | null;
  location: { lat: number; lng: number; address?: string } | null;
  responseTsIso: string | null;
  arrivalTsIso: string | null;
  completedTsIso: string | null;
  createdAtIso: string;
  ratingStars: number | null;
  ratingComment: string | null;
  advocateName: string | null;
  advocateRegNo: string | null;
  consentSigner: string | null;
  consentSignedAtIso: string | null;
  dispatchActorLog: ActorEntry[];
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const TOP = PAGE_HEIGHT - 56;
const BOTTOM = 56;
const BRAND = rgb(0.114, 0.137, 0.494); // Deep navy #1A237E

async function loadFont(filename: string): Promise<Uint8Array> {
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);
  const bytes = await fs.readFile(fontPath);
  return new Uint8Array(bytes);
}

interface State {
  doc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  pages: PDFPage[];
  cursor: number;
}

function newPage(s: State) {
  s.page = s.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  s.pages.push(s.page);
  s.cursor = TOP;
  // Brand band at the top of every page.
  s.page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 14,
    width: PAGE_WIDTH,
    height: 14,
    color: BRAND,
  });
}

function need(s: State, lineHeight: number) {
  if (s.cursor - lineHeight < BOTTOM) newPage(s);
}

function drawText(
  s: State,
  text: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {},
) {
  const size = opts.size ?? 10;
  const lineHeight = size * 1.4;
  const usable = PAGE_WIDTH - MARGIN_X * 2;
  const font = opts.bold ? s.fontBold : s.font;
  const color = opts.color ?? rgb(0.05, 0.05, 0.05);
  for (const para of text.split(/\n/)) {
    if (!para.trim()) {
      need(s, lineHeight);
      s.cursor -= lineHeight * 0.4;
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) > usable && line) {
        need(s, lineHeight);
        s.page.drawText(line, {
          x: MARGIN_X,
          y: s.cursor - size,
          size,
          font,
          color,
        });
        s.cursor -= lineHeight;
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) {
      need(s, lineHeight);
      s.page.drawText(line, {
        x: MARGIN_X,
        y: s.cursor - size,
        size,
        font,
        color,
      });
      s.cursor -= lineHeight;
    }
  }
  s.cursor -= opts.gap ?? size * 0.3;
}

function drawDivider(s: State) {
  need(s, 16);
  s.page.drawLine({
    start: { x: MARGIN_X, y: s.cursor },
    end: { x: PAGE_WIDTH - MARGIN_X, y: s.cursor },
    thickness: 0.6,
    color: rgb(0.85, 0.85, 0.85),
  });
  s.cursor -= 14;
}

function drawKeyValue(s: State, k: string, v: string) {
  need(s, 14);
  s.page.drawText(`${k}:`, {
    x: MARGIN_X,
    y: s.cursor - 9,
    size: 9,
    font: s.font,
    color: rgb(0.4, 0.4, 0.4),
  });
  s.page.drawText(v, {
    x: MARGIN_X + 130,
    y: s.cursor - 9,
    size: 9,
    font: s.font,
    color: rgb(0.05, 0.05, 0.05),
  });
  s.cursor -= 13;
}

function fmt(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/** Renders a complete case-file PDF — full audit trail, payment
 *  details, advocate, GPS and rating — for accounting / regulatory
 *  archive. Reuses the Cairo TTFs that ship with the agreement
 *  pipeline so Arabic case-type labels render correctly.*/
export async function renderCaseFilePdf(args: CaseFileArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const cairoLatin = await doc.embedFont(await loadFont("Cairo-Latin.ttf"), {
    subset: true,
  });
  const cairoAr = await doc.embedFont(await loadFont("Cairo-Regular.ttf"), {
    subset: true,
  });

  const s: State = {
    doc,
    font: cairoLatin,
    fontBold: cairoLatin,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    pages: [],
    cursor: TOP,
  };
  s.pages.push(s.page);
  s.page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 14,
    width: PAGE_WIDTH,
    height: 14,
    color: BRAND,
  });

  // ── Title block ────────────────────────────────────────────────
  s.cursor = TOP - 24;
  s.page.drawText("Lawyers.bh — Legal SOS Case File", {
    x: MARGIN_X,
    y: s.cursor,
    size: 20,
    font: cairoLatin,
    color: BRAND,
  });
  s.cursor -= 22;
  s.page.drawText(`Case ${args.caseRef}`, {
    x: MARGIN_X,
    y: s.cursor,
    size: 12,
    font: cairoLatin,
    color: rgb(0.35, 0.35, 0.35),
  });
  s.cursor -= 20;

  // Bilingual case type
  const caseTypeMeta = getCaseTypeBySlug(args.caseType);
  if (caseTypeMeta) {
    s.page.drawText(caseTypeMeta.label.en, {
      x: MARGIN_X,
      y: s.cursor,
      size: 11,
      font: cairoLatin,
      color: rgb(0.05, 0.05, 0.05),
    });
    const arWidth = cairoAr.widthOfTextAtSize(caseTypeMeta.label.ar, 11);
    s.page.drawText(caseTypeMeta.label.ar, {
      x: PAGE_WIDTH - MARGIN_X - arWidth,
      y: s.cursor,
      size: 11,
      font: cairoAr,
      color: rgb(0.05, 0.05, 0.05),
    });
    s.cursor -= 18;
  }
  drawDivider(s);

  // ── Case metadata ───────────────────────────────────────────────
  drawText(s, "Case", { size: 11, bold: true, color: BRAND, gap: 4 });
  drawKeyValue(s, "Status", args.serviceStatus);
  drawKeyValue(
    s,
    "Initial response fee",
    `${args.baseFee.toFixed(2)} SAR`,
  );
  drawKeyValue(s, "Payment status", args.paymentStatus);
  if (args.paymentRef) drawKeyValue(s, "Payment reference", args.paymentRef);
  drawKeyValue(s, "Created", fmt(args.createdAtIso));
  drawKeyValue(s, "Dispatched", fmt(args.responseTsIso));
  drawKeyValue(s, "Arrived on site", fmt(args.arrivalTsIso));
  drawKeyValue(s, "Completed", fmt(args.completedTsIso));
  s.cursor -= 6;
  drawDivider(s);

  // ── Client ──────────────────────────────────────────────────────
  drawText(s, "Client", { size: 11, bold: true, color: BRAND, gap: 4 });
  drawKeyValue(s, "Name", args.contactName);
  if (args.contactIdNumber) drawKeyValue(s, "ID number", args.contactIdNumber);
  drawKeyValue(s, "Phone", args.contactPhone);
  if (args.location) {
    drawKeyValue(
      s,
      "Location",
      `${args.location.lat.toFixed(5)}, ${args.location.lng.toFixed(5)}`,
    );
    if (args.location.address)
      drawKeyValue(s, "Address", args.location.address);
  }
  if (args.description) {
    s.cursor -= 4;
    drawText(s, "Description", { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 2 });
    drawText(s, args.description, { size: 10 });
  }
  s.cursor -= 6;
  drawDivider(s);

  // ── Advocate + consent ─────────────────────────────────────────
  drawText(s, "Advocate & Consent", {
    size: 11,
    bold: true,
    color: BRAND,
    gap: 4,
  });
  drawKeyValue(s, "Advocate", args.advocateName ?? "Not yet assigned");
  if (args.advocateRegNo)
    drawKeyValue(s, "Registration No", args.advocateRegNo);
  drawKeyValue(s, "Client consent signer", args.consentSigner ?? "—");
  drawKeyValue(s, "Consent signed at", fmt(args.consentSignedAtIso));
  s.cursor -= 6;
  drawDivider(s);

  // ── Dispatch audit log ─────────────────────────────────────────
  drawText(s, "Dispatch audit log", {
    size: 11,
    bold: true,
    color: BRAND,
    gap: 4,
  });
  if (args.dispatchActorLog.length === 0) {
    drawText(s, "No operator actions recorded.", {
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });
  } else {
    for (const e of args.dispatchActorLog) {
      need(s, 13);
      const line = `${fmt(e.ts)}  ·  ${e.action.padEnd(10, " ")}  ·  ${e.actor}`;
      s.page.drawText(line, {
        x: MARGIN_X,
        y: s.cursor - 8,
        size: 9,
        font: cairoLatin,
        color: rgb(0.05, 0.05, 0.05),
      });
      s.cursor -= 12;
    }
  }
  s.cursor -= 6;
  drawDivider(s);

  // ── Rating ──────────────────────────────────────────────────────
  drawText(s, "Client rating", {
    size: 11,
    bold: true,
    color: BRAND,
    gap: 4,
  });
  if (args.ratingStars == null) {
    drawText(s, "Not yet rated.", { size: 9, color: rgb(0.5, 0.5, 0.5) });
  } else {
    drawKeyValue(s, "Stars", `${args.ratingStars} / 5`);
    if (args.ratingComment)
      drawText(s, `\"${args.ratingComment}\"`, { size: 10 });
  }

  // ── Footer on the LAST page ────────────────────────────────────
  const footerY = 28;
  const lastPage = s.pages[s.pages.length - 1];
  lastPage.drawText(
    `Generated ${new Date().toLocaleString("en-GB")} · lawyers.bh`,
    {
      x: MARGIN_X,
      y: footerY,
      size: 8,
      font: cairoLatin,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  return doc.save();
}
