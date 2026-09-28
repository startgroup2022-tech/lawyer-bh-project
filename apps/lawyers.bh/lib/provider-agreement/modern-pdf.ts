import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFOperator,
  PDFOperatorNames,
  beginText,
  endText,
  setFontAndSize,
  setTextMatrix,
  showText,
  setFillingRgbColor,
  rgb,
  type PDFPage,
} from "pdf-lib";
import { renderTemplate, type Snapshot } from "./model";
import { layoutLine, wrapText } from "./shaping";
let resources: Promise<[Buffer, Buffer, Buffer]> | undefined;
const ink: [number, number, number] = [0.04, 0.15, 0.29],
  red: [number, number, number] = [0.7, 0.1, 0.14],
  gray: [number, number, number] = [0.35, 0.38, 0.42];

/** Versioned renderer. Never reads today's platform settings. */
export async function renderModernProviderPdf(
  snapshot: Snapshot,
  preview: boolean,
): Promise<Uint8Array> {
  const template = renderTemplate(snapshot.template!, snapshot.data),
    data = snapshot.data,
    first = template.presentation!.firstParty;
  const [bytes, logoBytes, headerBytes] = await (resources ??= Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/Cairo-Full.ttf")),
    readFile(path.join(process.cwd(), "app/apple-icon.png")),
    readFile(path.join(process.cwd(), "public/images/logo-full-ar.png")),
  ]));
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(bytes, { subset: false }),
    shaper = fontkit.create(bytes),
    logo = await doc.embedPng(logoBytes),
    header = await doc.embedPng(headerBytes);
  doc.setTitle(template.titleAr);
  doc.setSubject(preview ? "Preview only - not signed" : "Provider agreement");
  const w = 595.28,
    h = 841.89,
    m = 44,
    usable = w - 2 * m;
  let page: PDFPage,
    fontName: PDFName,
    y = 0;
  function text(
    value: string,
    x: number,
    baseline: number,
    size = 10.5,
    rtl = true,
    color = ink,
    width = usable,
  ) {
    const run = layoutLine(shaper, value, rtl),
      scale = size / shaper.unitsPerEm,
      left = rtl ? x + width - run.width * scale : x;
    page.pushOperators(
      PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
        PDFName.of("Span"),
        doc.context
          .obj({ ActualText: PDFHexString.fromText(value) })
          .toString(),
      ]),
      beginText(),
      setFontAndSize(fontName, size),
      setFillingRgbColor(...color),
    );
    for (const g of run.glyphs)
      page.pushOperators(
        setTextMatrix(1, 0, 0, 1, left + g.x * scale, baseline + g.y * scale),
        showText(PDFHexString.of(g.id.toString(16).padStart(4, "0"))),
      );
    page.pushOperators(
      endText(),
      PDFOperator.of(PDFOperatorNames.EndMarkedContent),
    );
  }
  function box(
    x: number,
    bottom: number,
    width: number,
    height: number,
    color: [number, number, number] = [0.965, 0.974, 0.983],
  ) {
    page.drawRectangle({ x, y: bottom, width, height, color: rgb(...color) });
  }
  function rule(baseline: number, x = m, width = usable, color = red) {
    page.drawLine({
      start: { x, y: baseline },
      end: { x: x + width, y: baseline },
      thickness: 0.6,
      color: rgb(...color),
    });
  }
  function newPage() {
    page = doc.addPage([w, h]);
    fontName = page.node.newFontDictionary("Cairo", font.ref);
    const s = 350 / Math.max(logo.width, logo.height);
    page.drawImage(logo, {
      x: (w - logo.width * s) / 2,
      y: (h - logo.height * s) / 2,
      width: logo.width * s,
      height: logo.height * s,
      opacity: 0.08,
    });
    box(0, h - 9, w, 9, red);
    page.drawImage(header, {
      x: (w - 330) / 2,
      y: h - 95,
      width: 330,
      height: (330 * header.height) / header.width,
    });
    if (preview)
      text(
        "معاينة غير موقّعة | UNSIGNED PREVIEW",
        m,
        h - 108,
        9,
        true,
        red,
        usable - 78,
      );
    y = h - 140;
  }
  function block(value: string, rtl = true, size = 10.5, color = ink) {
    for (const row of wrapText(shaper, value, rtl, size, usable)) {
      const heading = /^(المادة\s+\d+|Article\s+\d+)/.test(row);
      if (y < 78 || (heading && y < 125)) newPage();
      text(row, m, y, size, rtl, heading ? red : color);
      y -= row ? size * 1.7 : size;
    }
    y -= 8;
  }
  function wrapped(
    value: string,
    x: number,
    top: number,
    width: number,
    size = 10,
    rtl = true,
    color = ink,
  ) {
    for (const row of wrapText(shaper, value, rtl, size, width)) {
      text(row, x, top, size, rtl, color, width);
      top -= size * 1.65;
    }
    return top;
  }
  newPage();
  block(template.titleAr, true, 20, red);
  block(template.titleEn, false, 12, gray);
  block(
    `${preview ? "Preview reference" : "Reference"}: ${data.reference}`,
    false,
    8,
    gray,
  );
  block(
    `Version: ${snapshot.versionId ?? "DRAFT"} | modern-v1`,
    false,
    8,
    gray,
  );
  if (!preview) block(`Signed at (UTC): ${data.signedAt}`, false, 8, gray);
  const gap = 16,
    cw = (usable - gap) / 2;
  const partyHeight = Math.max(
    100,
    54 +
      wrapText(shaper, data.fullNameAr || data.fullNameEn, true, 10, cw - 28)
        .length *
        17 +
      wrapText(shaper, data.registrationNo, true, 9, cw - 28).length * 15,
  );
  if (y - partyHeight < 100) newPage();
  box(m, y - partyHeight, cw, partyHeight);
  box(m + cw + gap, y - partyHeight, cw, partyHeight);
  text(
    "الطرف الأول | المنصة",
    m + cw + gap + 14,
    y - 23,
    11,
    true,
    red,
    cw - 28,
  );
  wrapped("منصة محامون البحرين", m + cw + gap + 14, y - 48, cw - 28);
  text("info@lawyers.bh", m + cw + gap + 14, y - 72, 9, false, gray, cw - 28);
  text("الطرف الثاني | المحامي", m + 14, y - 23, 11, true, red, cw - 28);
  const ny = wrapped(
    data.fullNameAr || data.fullNameEn,
    m + 14,
    y - 48,
    cw - 28,
  );
  wrapped(
    `رقم الرخصة: ${data.registrationNo}`,
    m + 14,
    ny - 8,
    cw - 28,
    9,
    true,
    gray,
  );
  y -= partyHeight + 28;
  block(template.contentAr, true);
  newPage();
  block(template.titleEn, false, 16, red);
  block(template.contentEn, false);
  newPage();
  block("التوقيع والختم", true, 22, red);
  block("SIGNATURES & STAMP", false, 11, gray);
  if (preview)
    block(
      "هذه معاينة فقط ولا تسجل توقيعًا أو موافقة. البيانات المعروضة تجريبية.",
      true,
      10,
      gray,
    );
  const top = y - 12,
    panelWidth = (usable - 20) / 2;
  const firstDetails = [first.nameAr, first.nameEn, first.roleAr, first.roleEn];
  const secondDetails = [
    data.fullNameAr,
    data.fullNameEn,
    `رقم الرخصة: ${data.registrationNo}`,
  ];
  let detailSize = 9;
  const detailHeight = () =>
    Math.max(
      ...[firstDetails, secondDetails].map((details) =>
        details.reduce(
          (sum, value, i) =>
            sum +
            (value
              ? wrapText(
                  shaper,
                  value,
                  i !== 1 && i !== 3,
                  detailSize,
                  panelWidth - 28,
                ).length *
                  detailSize *
                  1.65 +
                4
              : 0),
          0,
        ),
      ),
    );
  while (80 + detailHeight() + 180 > top - 100 && detailSize > 7)
    detailSize -= 0.5;
  const signatureOffset = Math.max(225, 80 + detailHeight() + 8),
    height = signatureOffset + 175;
  async function asset(
    value: string,
    x: number,
    bottom: number,
    width: number,
    height: number,
  ) {
    if (!value) return;
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(
      value,
    );
    if (!match) throw new Error("invalid_signature");
    const buf = Buffer.from(match[2], "base64"),
      img =
        match[1] === "png" ? await doc.embedPng(buf) : await doc.embedJpg(buf);
    const s = Math.min(width / img.width, height / img.height);
    page.drawImage(img, {
      x: x + (width - img.width * s) / 2,
      y: bottom + (height - img.height * s) / 2,
      width: img.width * s,
      height: img.height * s,
    });
  }
  async function panel(x: number, isFirst: boolean) {
    box(x, top - height, panelWidth, height, [0.985, 0.989, 0.995]);
    box(x, top - 4, panelWidth, 4, isFirst ? red : ink);
    text(
      isFirst ? "الطرف الأول - المنصة" : "الطرف الثاني - المحامي",
      x + 14,
      top - 30,
      11,
      true,
      ink,
      panelWidth - 28,
    );
    text(
      isFirst ? "FIRST PARTY / PLATFORM" : "SECOND PARTY / PROVIDER",
      x + 14,
      top - 51,
      8,
      false,
      gray,
      panelWidth - 28,
    );
    let sy = top - 77;
    const details = isFirst ? firstDetails : secondDetails;
    for (let i = 0; i < details.length; i++)
      if (details[i])
        sy =
          wrapped(
            details[i],
            x + 14,
            sy,
            panelWidth - 28,
            detailSize,
            i !== 1 && i !== 3,
            gray,
          ) - 4;
    // Reserve the full lower half exclusively for the matching signing images.
    await asset(
      isFirst ? first.signatureDataUrl : data.signatureDataUrl,
      x + 18,
      top - signatureOffset - 65,
      panelWidth - 36,
      65,
    );
    rule(
      top - signatureOffset - 71,
      x + 18,
      panelWidth - 36,
      [0.7, 0.72, 0.75],
    );
    text(
      "التوقيع | Signature",
      x + 18,
      top - signatureOffset - 85,
      8,
      true,
      gray,
      panelWidth - 36,
    );
    if (isFirst) {
      await asset(
        first.stampDataUrl,
        x + 18,
        top - signatureOffset - 157,
        panelWidth - 36,
        62,
      );
      text(
        "الختم | Stamp",
        x + 18,
        top - signatureOffset - 169,
        8,
        true,
        gray,
        panelWidth - 36,
      );
    }
  }
  await panel(m + panelWidth + 20, true);
  await panel(m, false);
  y = top - height - 24;
  if (!preview)
    block(
      `SHA-256: ${createHash("sha256").update(JSON.stringify({ template, data })).digest("hex")}`,
      false,
      7,
      gray,
    );
  const pages = doc.getPages();
  for (const [i, p] of pages.entries()) {
    page = p;
    fontName = p.node.newFontDictionary("CairoFooter", font.ref);
    rule(54);
    if (preview) text("معاينة تجريبية - غير موقّعة", m, 36, 8, true, gray);
    text(`${i + 1} / ${pages.length}`, m, 30, 8, false, gray);
  }
  return doc.save();
}
