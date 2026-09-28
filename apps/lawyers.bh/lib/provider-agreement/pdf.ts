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
import { legacyTemplate, renderTemplate, type Snapshot } from "./model";
import { layoutLine, wrapText } from "./shaping";
import { renderModernProviderPdf } from "./modern-pdf";
import { renderBuilderPdf } from "./builder-pdf";
let fontBytes: Promise<Buffer> | undefined;
let logoBytes: Promise<Buffer> | undefined;
export async function renderProviderPdf(
  snapshot: Snapshot,
  preview = false,
): Promise<Uint8Array> {
  if (!snapshot.legacy && snapshot.template?.builder)
    return renderBuilderPdf(
      snapshot.template.builder,
      snapshot.data,
      snapshot.data.extraValues ?? {},
      preview,
      snapshot.versionId ?? "DRAFT",
      snapshot.data.fileNames ?? {},
    );
  if (
    !snapshot.legacy &&
    snapshot.template?.presentation?.layout === "modern-v1"
  )
    return renderModernProviderPdf(snapshot, preview);
  const bytes = await (fontBytes ??= readFile(
    path.join(process.cwd(), "public/fonts/Cairo-Full.ttf"),
  ));
  const shaper = fontkit.create(bytes);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embedded = await doc.embedFont(bytes, { subset: false });
  const logo = await doc.embedPng(
    await (logoBytes ??= readFile(
      path.join(process.cwd(), "app/apple-icon.png"),
    )),
  );
  const logoScale = 360 / Math.max(logo.width, logo.height);
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  // Old PDFs used the Arabic name in both languages. Keep that legacy text intact.
  const data = snapshot.legacy
    ? {
        ...snapshot.data,
        fullNameEn: snapshot.data.fullNameAr || snapshot.data.fullNameEn,
      }
    : snapshot.data;
  const template = renderTemplate(snapshot.template ?? legacyTemplate(), data);
  doc.setTitle(template.titleAr);
  doc.setSubject(preview ? "Preview only - not signed" : "Provider agreement");
  const width = 595.28,
    height = 841.89,
    margin = 48,
    usable = width - margin * 2;
  let page!: PDFPage;
  let y = 0;
  let fontName: PDFName;
  function line(
    text: string,
    rtl: boolean,
    size: number,
    baseline: number,
    color: [number, number, number] = [0.08, 0.13, 0.22],
  ) {
    const shaped = layoutLine(shaper, text, rtl);
    const scale = size / shaper.unitsPerEm;
    const left = rtl ? width - margin - shaped.width * scale : margin;
    page.pushOperators(
      PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
        PDFName.of("Span"),
        doc.context.obj({ ActualText: PDFHexString.fromText(text) }).toString(),
      ]),
      beginText(),
      setFontAndSize(fontName, size),
      setFillingRgbColor(...color),
    );
    for (const g of shaped.glyphs)
      page.pushOperators(
        setTextMatrix(1, 0, 0, 1, left + g.x * scale, baseline + g.y * scale),
        showText(PDFHexString.of(g.id.toString(16).padStart(4, "0"))),
      );
    page.pushOperators(
      endText(),
      PDFOperator.of(PDFOperatorNames.EndMarkedContent),
    );
  }
  function newPage() {
    page = doc.addPage([width, height]);
    // Paint before the text so the watermark never covers the agreement or signature.
    page.drawImage(logo, {
      x: (width - logoWidth) / 2,
      y: (height - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
      opacity: 0.08,
    });
    fontName = page.node.newFontDictionary("Cairo", embedded.ref);
    y = height - 70;
    page.drawRectangle({
      x: 0,
      y: height - 10,
      width,
      height: 10,
      color: rgb(0.7, 0.12, 0.16),
    });
    if (preview) {
      line(
        "معاينة تجريبية — غير موقّعة",
        true,
        10,
        height - 35,
        [0.7, 0.12, 0.16],
      );
      line(
        "PREVIEW ONLY — NOT SIGNED",
        false,
        9,
        height - 50,
        [0.7, 0.12, 0.16],
      );
    }
  }
  function block(
    text: string,
    rtl: boolean,
    size = 10.5,
    color: [number, number, number] = [0.08, 0.13, 0.22],
  ) {
    for (const row of wrapText(shaper, text, rtl, size, usable)) {
      const heading = /^(المادة\s+\d+|Article\s+\d+)/.test(row);
      if (y < 65 || (heading && y < 105)) newPage();
      line(row, rtl, size, y, color);
      y -= row ? size * 1.7 : size;
    }
    y -= 8;
  }
  newPage();
  block(template.titleAr, true, 17, [0.65, 0.1, 0.14]);
  block(template.titleEn, false, 13, [0.65, 0.1, 0.14]);
  block(
    `${preview ? "Preview reference" : "Reference"}: ${data.reference}`,
    false,
    9,
  );
  block(
    `Version: ${preview ? "DRAFT PREVIEW" : (snapshot.versionId ?? "legacy-2026-05-23")}`,
    false,
    8,
  );
  if (!preview) block(`Signed at (UTC): ${data.signedAt}`, false, 9);
  block(template.contentAr, true);
  newPage();
  block(template.titleEn, false, 15, [0.65, 0.1, 0.14]);
  block(template.contentEn, false);
  if (y < 360) newPage();
  else y -= 25;
  block(
    preview ? "تجربة شكل التوقيع فقط" : "التوقيع الإلكتروني",
    true,
    16,
    [0.65, 0.1, 0.14],
  );
  block(
    preview ? "Signature appearance preview" : "Electronic signature",
    false,
    13,
  );
  block(data.fullNameAr || data.fullNameEn, true, 13);
  block(data.fullNameEn || data.fullNameAr, false, 11);
  if (data.signatureDataUrl) {
    const match = data.signatureDataUrl.match(
      /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match) throw new Error("invalid_signature");
    const imageBytes = Buffer.from(match[2], "base64");
    const image =
      match[1] === "png"
        ? await doc.embedPng(imageBytes)
        : await doc.embedJpg(imageBytes);
    const scale = Math.min(240 / image.width, 100 / image.height);
    page.drawImage(image, {
      x: margin,
      y: y - 110,
      width: image.width * scale,
      height: image.height * scale,
    });
    y -= 130;
  } else
    block(
      preview ? "ارسم توقيعًا تجريبيًا في صفحة المعاينة لإظهاره هنا." : "",
      true,
      10,
    );
  if (preview) block("هذه معاينة فقط ولا تسجل توقيعًا أو موافقة.", true, 11);
  else {
    block(
      `SHA-256: ${createHash("sha256").update(JSON.stringify({ template, data })).digest("hex")}`,
      false,
      8,
    );
    if (snapshot.legacy) block("نسخة محفوظة بالقالب السابق.", true, 9);
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    page = p;
    fontName = p.node.newFontDictionary("CairoFooter", embedded.ref);
    line(`${i + 1} / ${pages.length}`, false, 8, 30);
  });
  return doc.save();
}
