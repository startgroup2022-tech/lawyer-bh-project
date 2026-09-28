import "server-only";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  SOS_CONSENT_AR,
  SOS_CONSENT_EN,
  SOS_CONSENT_VERSION,
} from "./consentText";

// Ship the same Cairo TTFs we already use for /legal-tools PDF overlay.
// The fonts live under public/fonts/ so they're bundled with the build.
async function loadFont(filename: string): Promise<Uint8Array> {
  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    filename,
  );
  const bytes = await fs.readFile(fontPath);
  return new Uint8Array(bytes);
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const TOP = PAGE_HEIGHT - 56;
const BOTTOM = 56;
const BRAND = rgb(0.726, 0.114, 0.11); // #B91D1C — primary

interface RenderArgs {
  caseRef?: string;
  fullName: string;
  idType: string;
  idNumber: string;
  role: "client" | "advocate";
  locale: "en" | "ar";
  /** Base64 PNG data URL of the user's drawn signature. */
  signatureDataUrl?: string | null;
  /** ISO timestamp of when the consent was signed. */
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  contractTextHash: string;
  /** Optional case-type and fee for the per-request dispatch PDF. */
  caseType?: { en: string; ar: string };
  baseFeeBhd?: number;
  description?: string;
  location?: { lat: number; lng: number; address?: string };
}

interface DrawState {
  font: PDFFont;
  fontBold: PDFFont;
  pages: PDFPage[];
  current: PDFPage;
  cursorY: number;
}

function newPage(doc: PDFDocument, state: DrawState) {
  state.current = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  state.pages.push(state.current);
  state.cursorY = TOP;
}

function maybeWrap(doc: PDFDocument, state: DrawState, lineHeight: number) {
  if (state.cursorY - lineHeight < BOTTOM) newPage(doc, state);
}

function drawHeader(doc: PDFDocument, state: DrawState) {
  // Brand band at the very top of every page.
  state.current.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 14,
    width: PAGE_WIDTH,
    height: 14,
    color: BRAND,
  });
}

function drawTextBlock(
  doc: PDFDocument,
  state: DrawState,
  text: string,
  opts: { rtl: boolean; size: number; bold?: boolean; lineGap?: number } = {
    rtl: false,
    size: 10,
  },
) {
  const font = opts.bold ? state.fontBold : state.font;
  const lineHeight = opts.size * 1.45;
  const usableWidth = PAGE_WIDTH - MARGIN_X * 2;
  const paragraphs = text.split(/\n+/);

  for (const para of paragraphs) {
    if (!para.trim()) {
      maybeWrap(doc, state, lineHeight);
      state.cursorY -= lineHeight * 0.5;
      continue;
    }

    // Greedy word-wrap. RTL paragraphs are still drawn left-aligned in
    // the PDF (pdf-lib doesn't reorder bidi); the visual reading order
    // remains correct because Cairo handles Arabic glyph shaping.
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      const trialWidth = font.widthOfTextAtSize(trial, opts.size);
      if (trialWidth > usableWidth && line) {
        maybeWrap(doc, state, lineHeight);
        const x = opts.rtl
          ? PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(line, opts.size)
          : MARGIN_X;
        state.current.drawText(line, {
          x,
          y: state.cursorY - opts.size,
          size: opts.size,
          font,
          color: rgb(0.05, 0.05, 0.05),
        });
        state.cursorY -= lineHeight;
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) {
      maybeWrap(doc, state, lineHeight);
      const x = opts.rtl
        ? PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(line, opts.size)
        : MARGIN_X;
      state.current.drawText(line, {
        x,
        y: state.cursorY - opts.size,
        size: opts.size,
        font,
        color: rgb(0.05, 0.05, 0.05),
      });
      state.cursorY -= lineHeight;
    }
    state.cursorY -= (opts.lineGap ?? opts.size * 0.4);
  }
}

function drawDivider(state: DrawState) {
  state.current.drawLine({
    start: { x: MARGIN_X, y: state.cursorY },
    end: { x: PAGE_WIDTH - MARGIN_X, y: state.cursorY },
    thickness: 0.6,
    color: rgb(0.85, 0.85, 0.85),
  });
  state.cursorY -= 16;
}

/** Render the Legal SOS consent (and optional dispatch metadata) as a
 *  signed A4 PDF. Returns the PDF as a Uint8Array suitable for emailing
 *  or storing in `consent_log.signed_pdf_base64`. */
export async function renderSosConsentPdf(
  args: RenderArgs,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Cairo Latin first so the default text uses Latin glyphs; Cairo
  // Arabic for the RTL paragraphs. pdf-lib doesn't auto-fallback so
  // each paragraph is drawn with the right font explicitly.
  const cairoLatinBytes = await loadFont("Cairo-Latin.ttf");
  const cairoArBytes = await loadFont("Cairo-Regular.ttf");
  const fontLatin = await doc.embedFont(cairoLatinBytes, { subset: true });
  const fontAr = await doc.embedFont(cairoArBytes, { subset: true });

  const state: DrawState = {
    font: fontLatin,
    fontBold: fontLatin,
    pages: [],
    current: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    cursorY: TOP,
  };
  state.pages.push(state.current);
  drawHeader(doc, state);

  // ── Title block (English first since the runtime PDF is Latin-led;
  //    Arabic body still follows below) ─────────────────────────────
  state.cursorY = TOP - 24;
  state.current.drawText("Lawyers.bh — Legal SOS", {
    x: MARGIN_X,
    y: state.cursorY,
    size: 20,
    font: fontLatin,
    color: BRAND,
  });
  state.cursorY -= 22;
  state.current.drawText("Signed Consent & Service Acknowledgment", {
    x: MARGIN_X,
    y: state.cursorY,
    size: 11,
    font: fontLatin,
    color: rgb(0.35, 0.35, 0.35),
  });
  state.cursorY -= 24;

  // ── Identity block ──────────────────────────────────────────────
  const meta: Array<[string, string]> = [
    ["Case Reference", args.caseRef ?? "—"],
    ["Full Name", args.fullName],
    ["ID Type", args.idType.toUpperCase()],
    ["ID Number", args.idNumber],
    ["Role", args.role === "client" ? "Client" : "Advocate"],
    ["Signed at (UTC)", args.signedAt],
    ["Locale", args.locale.toUpperCase()],
    ["Contract version", SOS_CONSENT_VERSION],
    ["Contract hash", args.contractTextHash],
  ];
  if (args.ipAddress) meta.push(["IP", args.ipAddress]);
  if (args.userAgent) meta.push(["User-Agent", truncate(args.userAgent, 80)]);
  if (args.caseType)
    meta.push(["Case Type", `${args.caseType.en} / ${args.caseType.ar}`]);
  if (typeof args.baseFeeBhd === "number")
    meta.push(["Initial Response Fee", `${args.baseFeeBhd} BHD`]);
  if (args.location)
    meta.push([
      "Location",
      args.location.address ??
        `${args.location.lat.toFixed(5)}, ${args.location.lng.toFixed(5)}`,
    ]);
  if (args.description)
    meta.push(["Description", truncate(args.description, 200)]);

  const labelWidth = 110;
  for (const [k, v] of meta) {
    maybeWrap(doc, state, 14);
    state.current.drawText(`${k}:`, {
      x: MARGIN_X,
      y: state.cursorY - 9,
      size: 9,
      font: fontLatin,
      color: rgb(0.35, 0.35, 0.35),
    });
    state.current.drawText(String(v), {
      x: MARGIN_X + labelWidth,
      y: state.cursorY - 9,
      size: 9,
      font: fontLatin,
      color: rgb(0.05, 0.05, 0.05),
    });
    state.cursorY -= 13;
  }

  state.cursorY -= 6;
  drawDivider(state);

  // ── English contract text ──────────────────────────────────────
  state.font = fontLatin;
  state.fontBold = fontLatin;
  state.current.drawText("Agreement Terms (English)", {
    x: MARGIN_X,
    y: state.cursorY,
    size: 11,
    font: fontLatin,
    color: BRAND,
  });
  state.cursorY -= 16;
  drawTextBlock(doc, state, SOS_CONSENT_EN, {
    rtl: false,
    size: 9,
    lineGap: 2,
  });

  // ── Arabic contract text on a fresh page ───────────────────────
  newPage(doc, state);
  drawHeader(doc, state);
  state.cursorY = TOP - 24;
  state.current.drawText("نص الاتفاقية (عربي)", {
    x: PAGE_WIDTH - MARGIN_X,
    y: state.cursorY,
    size: 13,
    font: fontAr,
    color: BRAND,
  });
  state.cursorY -= 22;
  state.font = fontAr;
  state.fontBold = fontAr;
  drawTextBlock(doc, state, SOS_CONSENT_AR, {
    rtl: true,
    size: 10,
    lineGap: 3,
  });

  // ── Signature block on a final page ────────────────────────────
  newPage(doc, state);
  drawHeader(doc, state);
  state.cursorY = TOP - 32;
  state.current.drawText("Electronic Signature / التوقيع الإلكتروني", {
    x: MARGIN_X,
    y: state.cursorY,
    size: 12,
    font: fontLatin,
    color: BRAND,
  });
  state.cursorY -= 28;

  // Embed the canvas signature if provided.
  if (args.signatureDataUrl?.startsWith("data:image/png;base64,")) {
    const png = args.signatureDataUrl.split(",", 2)[1];
    if (png) {
      try {
        const sigBytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
        const sigImage = await doc.embedPng(sigBytes);
        const targetWidth = 240;
        const scale = targetWidth / sigImage.width;
        const targetHeight = sigImage.height * scale;
        state.current.drawImage(sigImage, {
          x: MARGIN_X,
          y: state.cursorY - targetHeight,
          width: targetWidth,
          height: targetHeight,
        });
        state.cursorY -= targetHeight + 6;
      } catch {
        // If decode fails we still print the typed-name confirmation.
      }
    }
  }

  state.current.drawLine({
    start: { x: MARGIN_X, y: state.cursorY },
    end: { x: MARGIN_X + 280, y: state.cursorY },
    thickness: 0.8,
    color: rgb(0.2, 0.2, 0.2),
  });
  state.cursorY -= 14;
  state.current.drawText(`${args.fullName}  ·  ${args.idNumber}`, {
    x: MARGIN_X,
    y: state.cursorY,
    size: 10,
    font: fontLatin,
    color: rgb(0.05, 0.05, 0.05),
  });
  state.cursorY -= 16;
  state.current.drawText(
    `Signed electronically on ${args.signedAt} (UTC) — Bahrain TES Law 2018`,
    {
      x: MARGIN_X,
      y: state.cursorY,
      size: 8,
      font: fontLatin,
      color: rgb(0.4, 0.4, 0.4),
    },
  );

  return doc.save();
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
