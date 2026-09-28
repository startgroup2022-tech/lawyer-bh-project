import "server-only";

import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { promises as fs } from "node:fs";
import { Buffer } from "node:buffer";
import path from "node:path";
import {
  renderAgreement,
  agreementPlainText,
  AGREEMENT_VERSION,
  type AgreementData,
} from "./agreementTemplate";

async function loadFont(filename: string): Promise<Uint8Array> {
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);
  return new Uint8Array(await fs.readFile(fontPath));
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const TOP = PAGE_HEIGHT - 56;
const BOTTOM = 56;
const BRAND = rgb(0, 0.424, 0.196); // #006C32

interface DrawState {
  fontLatin: PDFFont;
  fontAr: PDFFont;
  pages: PDFPage[];
  current: PDFPage;
  cursorY: number;
}

function newPage(doc: PDFDocument, s: DrawState) {
  s.current = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  s.pages.push(s.current);
  s.cursorY = TOP;
  drawBand(s);
}

function drawBand(s: DrawState) {
  s.current.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 14,
    width: PAGE_WIDTH,
    height: 14,
    color: BRAND,
  });
}

function ensure(doc: PDFDocument, s: DrawState, lineHeight: number) {
  if (s.cursorY - lineHeight < BOTTOM) newPage(doc, s);
}

const LATIN_RUN = /[A-Za-z0-9@._%+\-/:#]/;
const TASHKEEL = /[ً-ْٰـ]/g;

function stripTashkeel(s: string): string {
  return s.replace(TASHKEEL, "");
}

function pickFont(s: DrawState, word: string): PDFFont {
  return LATIN_RUN.test(word) ? s.fontLatin : s.fontAr;
}

interface Token {
  text: string;
  font: PDFFont;
}

/**
 * Draw a short RTL line without changing cursorY.
 *
 * This intentionally uses the same word-by-word rendering strategy as block(),
 * because that is the strategy already producing connected Arabic correctly
 * in the agreement body.
 */
function drawRtlLine(
  s: DrawState,
  text: string,
  options: {
    y: number;
    size: number;
    color?: ReturnType<typeof rgb>;
  },
) {
  const { y, size } = options;
  const color = options.color ?? rgb(0.08, 0.08, 0.08);
  const words = stripTashkeel(text).split(/\s+/).filter(Boolean);

  let x = PAGE_WIDTH - MARGIN_X;

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const font = pickFont(s, word);
    const width = font.widthOfTextAtSize(word, size);

    x -= width;

    s.current.drawText(word, {
      x,
      y,
      size,
      font,
      color,
    });

    if (index < words.length - 1) {
      x -= font.widthOfTextAtSize(" ", size);
    }
  }
}

function block(
  doc: PDFDocument,
  s: DrawState,
  text: string,
  opts: {
    rtl: boolean;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
  },
) {
  const { size, rtl } = opts;
  const color = opts.color ?? rgb(0.08, 0.08, 0.08);
  const lineHeight = size * 1.5;
  const usable = PAGE_WIDTH - MARGIN_X * 2;
  const spaceWidth = (f: PDFFont) => f.widthOfTextAtSize(" ", size);
  const source = rtl ? stripTashkeel(text) : text;

  for (const para of source.split(/\n/)) {
    if (!para.trim()) {
      ensure(doc, s, lineHeight);
      s.cursorY -= lineHeight * 0.5;
      continue;
    }

    const words = para.split(/\s+/).filter(Boolean);
    let line: Token[] = [];
    let lineWidth = 0;

    const flush = () => {
      ensure(doc, s, lineHeight);

      if (rtl) {
        let x = PAGE_WIDTH - MARGIN_X;

        for (let i = 0; i < line.length; i++) {
          const tok = line[i];
          const w = tok.font.widthOfTextAtSize(tok.text, size);

          x -= w;

          s.current.drawText(tok.text, {
            x,
            y: s.cursorY - size,
            size,
            font: tok.font,
            color,
          });

          if (i < line.length - 1) x -= spaceWidth(tok.font);
        }
      } else {
        let x = MARGIN_X;

        for (let i = 0; i < line.length; i++) {
          const tok = line[i];

          s.current.drawText(tok.text, {
            x,
            y: s.cursorY - size,
            size,
            font: tok.font,
            color,
          });

          x += tok.font.widthOfTextAtSize(tok.text, size);

          if (i < line.length - 1) x += spaceWidth(tok.font);
        }
      }

      s.cursorY -= lineHeight;
      line = [];
      lineWidth = 0;
    };

    for (const w of words) {
      const font = rtl ? pickFont(s, w) : opts.font;
      const wWidth = font.widthOfTextAtSize(w, size);
      const addWidth = (line.length ? spaceWidth(font) : 0) + wWidth;

      if (lineWidth + addWidth > usable && line.length) flush();

      line.push({ text: w, font });
      lineWidth += line.length === 1 ? wWidth : addWidth;
    }

    if (line.length) flush();

    s.cursorY -= size * 0.35;
  }
}

export interface AgreementPdfArgs {
  data: AgreementData;
  reference: string;
  contractTextHash: string;
  signedByName: string;
  signatureDataUrl?: string | null;
  signedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

async function drawSignatureImage(
  doc: PDFDocument,
  s: DrawState,
  signatureDataUrl?: string | null,
) {
  if (!signatureDataUrl?.startsWith("data:image/")) return false;

  try {
    const [meta, base64] = signatureDataUrl.split(",", 2);

    if (!base64) return false;

    const bytes = Buffer.from(base64, "base64");
    const mime = meta.toLowerCase();

    const isPng = mime.includes("image/png");
    const isJpeg = mime.includes("image/jpeg") || mime.includes("image/jpg");

    if (!isPng && !isJpeg) {
      console.warn(
        "[agreementPdf] Unsupported signature image type. Use PNG or JPEG.",
        meta,
      );
      return false;
    }

    const img = isJpeg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);

    const maxWidth = 240;
    const maxHeight = 85;

    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

    const width = img.width * scale;
    const height = img.height * scale;

    ensure(doc, s, height + 20);

    s.current.drawImage(img, {
      x: MARGIN_X,
      y: s.cursorY - height,
      width,
      height,
    });

    s.cursorY -= height + 8;

    return true;
  } catch (error) {
    console.error("[agreementPdf] Could not embed signature image:", error);
    return false;
  }
}

/** Render the signed bilingual Legal Fees Agreement as an A4 PDF. */
export async function renderAgreementPdf(
  args: AgreementPdfArgs,
): Promise<Uint8Array> {
  const sections = renderAgreement(args.data);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const cairoFull = await loadFont("Cairo-Full.ttf");
  const cairo = await doc.embedFont(cairoFull, { subset: false });

  const fontLatin = cairo;
  const fontAr = cairo;

  const s: DrawState = {
    fontLatin,
    fontAr,
    pages: [],
    current: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    cursorY: TOP,
  };

  s.pages.push(s.current);
  drawBand(s);

  // ── Title ──
  s.cursorY = TOP - 24;

  s.current.drawText("Lawyers.bh — Legal Fees & Representation Agreement", {
    x: MARGIN_X,
    y: s.cursorY,
    size: 15,
    font: fontLatin,
    color: BRAND,
  });

  s.cursorY -= 18;

  const arTitle = "اتفاقية أتعاب المحاماة والتمثيل القانوني";

  s.current.drawText(arTitle, {
    x: PAGE_WIDTH - MARGIN_X - fontAr.widthOfTextAtSize(arTitle, 13),
    y: s.cursorY,
    size: 13,
    font: fontAr,
    color: rgb(0.35, 0.35, 0.35),
  });

  s.cursorY -= 26;

  // ── Metadata ──
  const meta: Array<[string, string]> = [
    ["Reference", args.reference],
    ["Contract version", AGREEMENT_VERSION],
    ["Contract hash", args.contractTextHash],
    ["Signed by", args.signedByName],
    ["Signed at (UTC)", args.signedAt],
  ];

  if (args.ipAddress) meta.push(["IP", args.ipAddress]);
  if (args.userAgent) meta.push(["User-Agent", trunc(args.userAgent, 80)]);

  for (const [k, val] of meta) {
    ensure(doc, s, 13);

    s.current.drawText(`${k}:`, {
      x: MARGIN_X,
      y: s.cursorY - 9,
      size: 9,
      font: fontLatin,
      color: rgb(0.35, 0.35, 0.35),
    });

    s.current.drawText(String(val), {
      x: MARGIN_X + 110,
      y: s.cursorY - 9,
      size: 9,
      font: fontLatin,
      color: rgb(0.05, 0.05, 0.05),
    });

    s.cursorY -= 13;
  }

  s.cursorY -= 10;

  // ── English body ──
  s.current.drawText("Agreement (English)", {
    x: MARGIN_X,
    y: s.cursorY,
    size: 11,
    font: fontLatin,
    color: BRAND,
  });

  s.cursorY -= 18;

  for (const sec of sections) {
    ensure(doc, s, 20);

    block(doc, s, sec.titleEn, {
      rtl: false,
      size: 10,
      font: fontLatin,
      color: rgb(0.15, 0.15, 0.15),
    });

    block(doc, s, sec.bodyEn, {
      rtl: false,
      size: 9,
      font: fontLatin,
    });

    s.cursorY -= 4;
  }

  // ── Arabic body on a fresh page ──
  newPage(doc, s);

  s.cursorY = TOP - 24;

  const arAgreementTitle = "الاتفاقية (عربي)";

  s.current.drawText(arAgreementTitle, {
    x:
      PAGE_WIDTH -
      MARGIN_X -
      fontAr.widthOfTextAtSize(arAgreementTitle, 13),
    y: s.cursorY,
    size: 13,
    font: fontAr,
    color: BRAND,
  });

  s.cursorY -= 22;

  for (const sec of sections) {
    ensure(doc, s, 22);

    block(doc, s, sec.titleAr, {
      rtl: true,
      size: 11,
      font: fontAr,
      color: rgb(0.15, 0.15, 0.15),
    });

    block(doc, s, sec.bodyAr, {
      rtl: true,
      size: 10,
      font: fontAr,
    });

    s.cursorY -= 4;
  }

  // ── Signature page ──
  newPage(doc, s);

  s.cursorY = TOP - 32;

  const signatureTitleY = s.cursorY;

  s.current.drawText("Electronic Signature", {
    x: MARGIN_X,
    y: signatureTitleY,
    size: 12,
    font: fontLatin,
    color: BRAND,
  });

  drawRtlLine(s, "التوقيع الإلكتروني", {
    y: signatureTitleY,
    size: 12,
    color: BRAND,
  });

  s.cursorY -= 30;

  const signatureDrawn = await drawSignatureImage(
    doc,
    s,
    args.signatureDataUrl,
  );

  if (!signatureDrawn) {
    s.current.drawText(args.signedByName, {
      x: MARGIN_X,
      y: s.cursorY - 18,
      size: 18,
      font: fontLatin,
      color: rgb(0.05, 0.05, 0.05),
    });

    s.cursorY -= 36;
  }

  s.current.drawLine({
    start: { x: MARGIN_X, y: s.cursorY },
    end: { x: MARGIN_X + 280, y: s.cursorY },
    thickness: 0.8,
    color: rgb(0.2, 0.2, 0.2),
  });

  s.cursorY -= 14;

  s.current.drawText(`Second Party (Client): ${args.signedByName}`, {
    x: MARGIN_X,
    y: s.cursorY,
    size: 10,
    font: fontLatin,
    color: rgb(0.05, 0.05, 0.05),
  });

  s.cursorY -= 14;

  s.current.drawText(`First Party (Lawyer): ${args.data.lawyer.name}`, {
    x: MARGIN_X,
    y: s.cursorY,
    size: 10,
    font: fontLatin,
    color: rgb(0.05, 0.05, 0.05),
  });

  s.cursorY -= 16;

  s.current.drawText(
    `Signed electronically on ${args.signedAt} (UTC) — Bahrain Electronic Transactions Law 2018`,
    {
      x: MARGIN_X,
      y: s.cursorY,
      size: 8,
      font: fontLatin,
      color: rgb(0.4, 0.4, 0.4),
    },
  );

  return doc.save();
}

/**
 * Convenience: the plain text used for hashing, exported so the API can
 * compute the same hash that the PDF embeds.
 */
export function agreementHashSource(data: AgreementData): string {
  return agreementPlainText(renderAgreement(data));
}

function trunc(str: string, n: number): string {
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}
