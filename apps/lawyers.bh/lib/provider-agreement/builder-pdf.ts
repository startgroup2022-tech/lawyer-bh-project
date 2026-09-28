import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
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
  type PDFImage,
} from "pdf-lib";
import { AgreementError, type SigningData } from "./model";
import type { BuilderTemplate, Alignment } from "./builder-model";
import { materializeBuilder, materializeAdditionalLanguage } from "./builder-materialize";
import { layoutLine, wrapText } from "./shaping";

let fontBytes: Promise<Buffer> | undefined;
const ink: [number, number, number] = [0.04, 0.15, 0.29],
  red: [number, number, number] = [0.7, 0.1, 0.14],
  gray: [number, number, number] = [0.35, 0.38, 0.42];

/** A new renderer, isolated from historical legacy/modern-v1 snapshots. All images come from the frozen template. */
export async function renderBuilderPdf(
  template: BuilderTemplate,
  data: SigningData,
  values: Record<string, string>,
  preview: boolean,
  versionId = "DRAFT",
  files: Record<string, string> = {},
) {
  const bytes = await (fontBytes ??= readFile(
    path.join(process.cwd(), "public/fonts/Cairo-Full.ttf"),
  ));
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(bytes, { subset: false }),
    shaper = fontkit.create(bytes);
  const w = 595.28,
    h = 841.89,
    m = 44,
    usable = w - m * 2;
  const historical = template.pdfLanguages === undefined;
  const languages = template.pdfLanguages ?? ["ar", "en"];
  const additional = new Map((template.additionalLanguages ?? []).map((entry) => [entry.code, entry]));
  const isRtl = (lang: string) => lang === "ar" || additional.get(lang)?.direction === "rtl";
  type Material = ReturnType<typeof materializeBuilder>;
  const material: Record<string, Material> = Object.fromEntries(languages.map((lang) => [
    lang,
    lang === "ar" || lang === "en"
      ? materializeBuilder(template, data, values, lang, files)
      : materializeAdditionalLanguage(template, additional.get(lang)!, data, values, files),
  ]));
  const footerLines: Record<string, string[]> = Object.fromEntries(languages.map((lang) => [
    lang, material[lang].footer.flatMap((value) => wrapText(shaper, value, isRtl(lang), 8, usable)),
  ]));
  const footerHeight =
    Math.max(...languages.map((lang) => footerLines[lang].length)) * 13 + 46;
  if (footerHeight > 200) throw new AgreementError("footer_too_large");
  const floor = footerHeight + 20;
  async function embed(value: string): Promise<PDFImage | null> {
    if (!value) return null;
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(
      value,
    );
    if (!match) throw new AgreementError("invalid_asset");
    const image = Buffer.from(match[2], "base64");
    return match[1] === "png" ? doc.embedPng(image) : doc.embedJpg(image);
  }
  const [header, watermark, firstSign, stamp, providerSign] = await Promise.all(
    [
      embed(template.header.visible ? template.header.dataUrl : ""),
      embed(template.watermark.visible ? template.watermark.dataUrl : ""),
      embed(
        template.signatures.showFirst
          ? template.signatures.signatureDataUrl
          : "",
      ),
      embed(
        template.signatures.showStamp ? template.signatures.stampDataUrl : "",
      ),
      embed(data.signatureDataUrl),
    ],
  );
  doc.setTitle(material[languages[0]].title);
  doc.setSubject(preview ? "Preview only - not signed" : "Provider agreement");
  // Stable timestamps for reproducible historical regeneration.
  doc.setCreationDate(new Date(data.signedAt));
  doc.setModificationDate(new Date(data.signedAt));
  let page!: PDFPage,
    fontName: PDFName,
    y = 0,
    locale = languages[0];
  const pageLanguages: string[] = [];
  function text(
    value: string,
    x: number,
    baseline: number,
    size = 10,
    rtl = isRtl(locale),
    color = ink,
    width = usable,
    align: Alignment = rtl ? "right" : "left",
  ) {
    if (additional.size && [...value].some((char) => !/\s/.test(char) && !shaper.hasGlyphForCodePoint(char.codePointAt(0)!)))
      throw new AgreementError("unsupported_pdf_glyph");
    const run = layoutLine(shaper, value, rtl),
      scale = size / shaper.unitsPerEm;
    const left =
      align === "center"
        ? x + (width - run.width * scale) / 2
        : align === "right"
          ? x + width - run.width * scale
          : x;
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
  function fit(
    image: PDFImage | null,
    x: number,
    bottom: number,
    width: number,
    height: number,
    opacity = 1,
    align: Alignment = "center",
  ) {
    if (!image) return;
    const s = Math.min(width / image.width, height / image.height),
      iw = image.width * s,
      ih = image.height * s;
    page.drawImage(image, {
      x:
        align === "left"
          ? x
          : align === "right"
            ? x + width - iw
            : x + (width - iw) / 2,
      y: bottom + (height - ih) / 2,
      width: iw,
      height: ih,
      opacity,
    });
  }
  function rule(baseline: number) {
    page.drawLine({
      start: { x: m, y: baseline },
      end: { x: w - m, y: baseline },
      color: rgb(...red),
      thickness: 0.6,
    });
  }
  function newPage() {
    page = doc.addPage([w, h]);
    pageLanguages.push(locale);
    fontName = page.node.newFontDictionary("Cairo", font.ref);
    fit(
      watermark,
      (w - template.watermark.width) / 2,
      (h - template.watermark.width) / 2,
      template.watermark.width,
      template.watermark.width,
      template.watermark.opacity,
    );
    page.drawRectangle({
      x: 0,
      y: h - 8,
      width: w,
      height: 8,
      color: rgb(...red),
    });
    if (header) {
      const width = template.header.width;
      const x =
        template.header.align === "left"
          ? m
          : template.header.align === "right"
            ? w - m - width
            : (w - width) / 2;
      fit(header, x, h - 104, width, 80, 1, template.header.align);
    }
    if (preview && languages.some((lang) => lang === "ar" || lang === "en"))
      text(
        historical ? "معاينة غير موقّعة | UNSIGNED PREVIEW" : languages.flatMap((lang) => lang === "ar" ? ["معاينة غير موقّعة"] : lang === "en" ? ["UNSIGNED PREVIEW"] : []).join(" | "),
        m,
        h - 121,
        8,
        isRtl(locale),
        red,
        usable,
        "center",
      );
    y = h - 150;
  }
  function block(
    value: string,
    size = 10.5,
    color = ink,
    rtl = isRtl(locale),
  ) {
    for (const line of wrapText(shaper, value, rtl, size, usable)) {
      if (y - size * 1.7 < floor) newPage();
      text(line, m, y, size, rtl, color);
      y -= line ? size * 1.7 : size;
    }
    y -= 8;
  }
  for (const lang of languages) {
    locale = lang;
    newPage();
    const content = material[lang];
    block(content.title, 18, red);
    block(
      lang === "ar" ? `المرجع: ${data.reference}` : lang === "en" ? `Reference: ${data.reference}` : data.reference,
      8,
      gray,
    );
    block(historical ? `Version: ${versionId} | structured-v2` : lang === "ar" ? `الإصدار: ${versionId}` : lang === "en" ? `Version: ${versionId}` : versionId, 7, gray, false);
    if (!preview) block(historical ? `Signed at (UTC): ${data.signedAt}` : lang === "ar" ? `تاريخ التوقيع: ${data.signedAt}` : lang === "en" ? `Signed at (UTC): ${data.signedAt}` : data.signedAt, 8, gray, false);
    for (const side of ["first", "second"] as const) {
      const party = content.parties[side];
      if (y < floor + 70) newPage();
      block(party.title, 12, red);
      for (const row of party.rows.filter((r) => r.visible))
        block(row.label ? `${row.label}: ${row.value}` : row.value, 10);
    }
    // Identity cannot be removed or replaced through customizable rows.
    block(
      `${lang === "ar" ? "هوية مقدم الخدمة الموقّع" : lang === "en" ? "Signing provider identity" : additional.get(lang)?.identity ?? ""}: ${content.providerIdentity.name} | ${content.providerIdentity.license}`,
      9,
      gray,
    );
    for (const clause of content.clauses) {
      if (y < floor + 70) newPage();
      if (clause.title) block(clause.title, 12, red);
      block(clause.body);
    }
  }
  locale = languages[0];
  newPage();
  block(historical ? "التوقيع والختم | SIGNATURES & STAMP" : languages.map((lang) => lang === "ar" ? "التوقيع والختم" : lang === "en" ? "SIGNATURES & STAMP" : additional.get(lang)?.signatures ?? "").join(" | "), 16, red);
  const panelWidth = (usable - 20) / 2;
  const signatureDetails = historical ? {
    first: [
      { text: material.ar.signatures.firstLabel, rtl: true },
      { text: material.en.signatures.firstLabel, rtl: false },
      { text: template.signatures.representative.ar, rtl: true },
      { text: template.signatures.representative.en, rtl: false },
      { text: template.signatures.role.ar, rtl: true },
      { text: template.signatures.role.en, rtl: false },
    ],
    second: [
      { text: material.ar.signatures.secondLabel, rtl: true },
      { text: material.en.signatures.secondLabel, rtl: false },
      { text: data.fullNameAr, rtl: true },
      { text: data.fullNameEn, rtl: false },
      { text: `رقم الرخصة: ${data.registrationNo}`, rtl: true },
    ],
  } : {
    first: languages.flatMap((lang) => [
      { text: material[lang].signatures.firstLabel, rtl: isRtl(lang) },
      { text: lang === "ar" ? template.signatures.representative.ar : lang === "en" ? template.signatures.representative.en : "", rtl: isRtl(lang) },
      { text: lang === "ar" ? template.signatures.role.ar : lang === "en" ? template.signatures.role.en : "", rtl: isRtl(lang) },
    ]),
    second: [
      ...languages.map((lang) => ({ text: material[lang].signatures.secondLabel, rtl: isRtl(lang) })),
      ...languages.map((lang) => ({ text: lang === "ar" ? data.fullNameAr : data.fullNameEn || data.fullNameAr, rtl: isRtl(lang) })),
      { text: data.registrationNo, rtl: false },
    ],
  };
  let size = 9;
  const lines = () =>
    Object.fromEntries(
      (["first", "second"] as const).map((side) => [
        side,
        signatureDetails[side].flatMap(({ text: value, rtl }) =>
          value
            ? wrapText(shaper, value, rtl, size, panelWidth - 28).map(
                (text) => ({ text, rtl }),
              )
            : [],
        ),
      ]),
    ) as Record<"first" | "second", { text: string; rtl: boolean }[]>;
  let detail = lines();
  while (
    Math.max(detail.first.length, detail.second.length) * size * 1.65 + 210 >
      y - floor &&
    size > 7
  ) {
    size -= 0.5;
    detail = lines();
  }
  const height =
    Math.max(detail.first.length, detail.second.length) * size * 1.65 + 210;
  if (height > y - floor)
    throw new AgreementError("signature_details_too_large");
  const top = y;
  for (const side of ["first", "second"] as const) {
    if (side === "first" && !template.signatures.showFirst) continue;
    const right = (side === "first") === template.signatures.firstOnRight;
    const x = m + (right ? panelWidth + 20 : 0);
    page.drawRectangle({
      x,
      y: top - height,
      width: panelWidth,
      height,
      color: rgb(0.975, 0.982, 0.99),
    });
    page.drawRectangle({
      x,
      y: top - 3,
      width: panelWidth,
      height: 3,
      color: rgb(...(side === "first" ? red : ink)),
    });
    let baseline = top - 24;
    for (const row of detail[side]) {
      text(row.text, x + 14, baseline, size, row.rtl, ink, panelWidth - 28);
      baseline -= size * 1.65;
    }
    const bottom = top - height;
    fit(
      side === "first" ? firstSign : providerSign,
      x + 16,
      bottom + 99,
      panelWidth - 32,
      65,
    );
    text(
      historical ? "التوقيع | Signature" : languages.map((lang) => lang === "ar" ? "التوقيع" : lang === "en" ? "Signature" : side === "first" ? additional.get(lang)?.firstSignature ?? "" : additional.get(lang)?.secondSignature ?? "").join(" | "),
      x + 16,
      bottom + 84,
      8,
      isRtl(locale),
      gray,
      panelWidth - 32,
      "center",
    );
    if (side === "first" && template.signatures.showStamp) {
      fit(stamp, x + 16, bottom + 25, panelWidth - 32, 50);
      text(
        historical ? "الختم | Stamp" : languages.map((lang) => lang === "ar" ? "الختم" : lang === "en" ? "Stamp" : additional.get(lang)?.stamp ?? "").join(" | "),
        x + 16,
        bottom + 12,
        8,
        isRtl(locale),
        gray,
        panelWidth - 32,
        "center",
      );
    }
  }
  y = top - height - 18;
  if (!preview)
    block(
      `SHA-256: ${createHash("sha256").update(JSON.stringify({ template, data, values, files })).digest("hex")}`,
      7,
      gray,
      false,
    );
  const pages = doc.getPages();
  for (const [i, p] of pages.entries()) {
    page = p;
    fontName = p.node.newFontDictionary("Footer", font.ref);
    locale = pageLanguages[i];
    rule(footerHeight);
    let baseline = footerHeight - 18;
    for (const line of footerLines[locale]) {
      text(
        line,
        m,
        baseline,
        8,
        isRtl(locale),
        gray,
        usable,
        template.footer.align,
      );
      baseline -= 13;
    }
    if (template.footer.pageNumbers)
      text(
        `${i + 1} / ${pages.length}`,
        m,
        19,
        8,
        false,
        gray,
        usable,
        "center",
      );
  }
  return doc.save();
}
