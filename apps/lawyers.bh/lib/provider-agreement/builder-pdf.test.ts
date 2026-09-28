import { mkdir, writeFile, readFile } from "node:fs/promises";
import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { expect, it } from "vitest";
import { importBuilder } from "./builder-model";
import { legacyTemplate, sampleData, parseTemplate } from "./model";
import { renderProviderPdf } from "./pdf";
import { renderBuilderPdf } from "./builder-pdf";
import { normalizeAsset } from "./assets";
import sharp from "sharp";
function pdfText(bytes: Uint8Array): Promise<string[]> {
  return PDFDocument.load(bytes).then((doc) => doc.getPages().map((page) => {
    const contents = page.node.Contents();
    const refs = contents && "asArray" in contents ? contents.asArray() : [contents];
    return refs.flatMap((ref) => {
      const stream = Buffer.from(decodePDFRawStream(doc.context.lookup(ref!) as PDFRawStream).decode()).toString();
      return [...stream.matchAll(/\/ActualText <([A-F0-9]+)>/g)].map((m) => Buffer.from(m[1], "hex").swap16().toString("utf16le"));
    }).join(" ");
  }));
}
it("renders only selected built-in languages across body and signature", async () => {
  const template = importBuilder(legacyTemplate());
  template.pdfLanguages = ["en"];
  template.clauses = [{ id: "one", title: { ar: "بند عربي فقط", en: "English clause only" }, body: { ar: "محتوى عربي فقط", en: "English content only" } }];
  const bytes = await renderBuilderPdf(template, sampleData, {}, true);
  const pages = await pdfText(bytes);
  expect(pages.join(" ")).toContain("English content only");
  expect(pages.join(" ")).not.toContain("محتوى عربي فقط");
  expect(pages.join(" ")).not.toContain("توقيع الطرف الأول");
  expect(pages.join(" ")).toContain("First party signature");
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/provider-agreement-english-only-preview.pdf", bytes);
});
it("renders Arabic-only PDF without English agreement labels", async () => {
  const template = importBuilder(legacyTemplate());
  template.pdfLanguages = ["ar"];
  template.clauses = [{ id: "one", title: { ar: "البند الأول", en: "" }, body: { ar: "اتفاقية تجريبية باللغة العربية فقط", en: "" } }];
  const bytes = await renderBuilderPdf(template, sampleData, {}, true);
  const pages = await pdfText(bytes);
  expect(pages.join(" ")).toContain("اتفاقية تجريبية باللغة العربية فقط");
  expect(pages.join(" ")).not.toContain("First party signature");
  expect(pages.join(" ")).not.toContain("UNSIGNED PREVIEW");
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/provider-agreement-arabic-only-preview.pdf", bytes);
});
it("renders manually authored additional language without unselected built-in pages", async () => {
  const template = importBuilder(legacyTemplate());
  template.pdfLanguages = ["fr"];
  template.additionalLanguages = [{ code: "fr", name: "Français", direction: "ltr", title: "Accord avocat", content: "Bonjour {{provider_name}}", firstParty: "Première partie", secondParty: "Avocat", identity: "Identité", signatures: "Signatures", firstSignature: "Plateforme", secondSignature: "Avocat signataire", stamp: "Cachet", footer: "Bahreïn" }];
  template.additionalLanguages[0].firstPartyDetails = "Société ABC";
  template.additionalLanguages[0].secondPartyDetails = "Maître {{provider_name}}";
  const bytes = await renderBuilderPdf(template, sampleData, {}, true);
  const pages = await pdfText(bytes);
  expect(pages.join(" ")).toContain("Accord avocat");
  expect(pages.join(" ")).toContain("Bonjour Mohammed Ahmed Abdullah");
  expect(pages.join(" ")).toContain("Société ABC");
  expect(pages.join(" ")).toContain("Maître Mohammed Ahmed Abdullah");
  expect(pages.join(" ")).not.toContain(legacyTemplate().titleAr);
  expect(pages.join(" ")).not.toContain(legacyTemplate().titleEn);
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/provider-agreement-french-only-preview.pdf", bytes);
});
it("rejects characters missing from the bundled PDF font", async () => {
  const template = importBuilder(legacyTemplate());
  template.pdfLanguages = ["zh"];
  template.additionalLanguages = [{ code: "zh", name: "中文", direction: "ltr", title: "律师协议", content: "律师协议", firstParty: "甲方", secondParty: "乙方", identity: "身份", signatures: "签名", firstSignature: "签名", secondSignature: "签名", stamp: "印章", footer: "" }];
  await expect(renderBuilderPdf(template, sampleData, {}, true)).rejects.toThrow("unsupported_pdf_glyph");
});
it("rejects unsupported glyphs on a later language's signature labels", async () => {
  const template = importBuilder(legacyTemplate());
  template.pdfLanguages = ["en", "zh"];
  template.additionalLanguages = [{ code: "zh", name: "Chinese", direction: "ltr", title: "Agreement", content: "Terms", firstParty: "First party", secondParty: "Second party", identity: "Identity", signatures: "签名", firstSignature: "平台签名", secondSignature: "律师签名", stamp: "Stamp", footer: "" }];
  await expect(renderBuilderPdf(template, sampleData, {}, true)).rejects.toThrow("unsupported_pdf_glyph");
});
it("keeps the historical bilingual rendering when older snapshots have no language settings", async () => {
  const template = importBuilder(legacyTemplate());
  delete template.pdfLanguages;
  delete template.additionalLanguages;
  const parsed = parseTemplate({ builder: template }).builder!;
  expect(parsed.pdfLanguages).toBeUndefined();
  const pages = await pdfText(await renderBuilderPdf(parsed, sampleData, {}, true));
  expect(pages.join(" ")).toContain("معاينة غير موقّعة | UNSIGNED PREVIEW");
  expect(pages.join(" ")).toContain("التوقيع والختم | SIGNATURES & STAMP");
  expect(pages.join(" ")).toContain("Version: DRAFT | structured-v2");
});
it("renders editable parties and bilingual footer without mixing them with legal body", async () => {
  const template = importBuilder(legacyTemplate());
  template.header.dataUrl = await normalizeAsset(
    await readFile("public/images/logo-full-ar.png"),
    "image/png",
  );
  template.watermark.dataUrl = await normalizeAsset(
    await sharp(await readFile("app/apple-icon.png"))
      .resize({ width: 300, height: 300, fit: "inside" })
      .png()
      .toBuffer(),
    "image/png",
  );
  template.parties.first.rows = [
    {
      id: "name",
      label: { ar: "الاسم", en: "Name" },
      visible: true,
      source: {
        kind: "fixed",
        value: { ar: "منصة محامون البحرين", en: "Bahrain Lawyers Platform" },
      },
    },
  ];
  template.footer.extra = {
    ar: "السجل التجاري: رقم تجريبي | عنوان المكتب: المنامة - مملكة البحرين",
    en: "Commercial registration: SAMPLE | Office: Manama - Kingdom of Bahrain",
  };
  template.clauses = [
    {
      id: "intro",
      title: { ar: "المادة الأولى", en: "Article one" },
      body: {
        ar: "هذه بيانات تجريبية لمعاينة القالب فقط. يلتزم الطرفان بما ورد في الاتفاقية.\n".repeat(
          14,
        ),
        en: "Sample agreement for layout preview only. The parties agree to the terms of this agreement.\n".repeat(
          14,
        ),
      },
    },
  ];
  const bytes = await renderProviderPdf(
    {
      providerId: "preview",
      versionId: null,
      template: parseTemplate({ builder: template }),
      data: sampleData,
      legacy: false,
    },
    true,
  );
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const refs =
      contents && "asArray" in contents ? contents.asArray() : [contents];
    const stream = refs
      .map((ref) =>
        Buffer.from(
          decodePDFRawStream(doc.context.lookup(ref!) as PDFRawStream).decode(),
        ).toString(),
      )
      .join("\n");
    const texts = [...stream.matchAll(/\/ActualText <([A-F0-9]+)>/g)].map((m) =>
      Buffer.from(m[1], "hex").swap16().toString("utf16le"),
    );
    expect(texts.some((t) => t.includes("UNSIGNED PREVIEW"))).toBe(true);
    expect(
      texts.some(
        (t) =>
          t.includes("السجل التجاري") || t.includes("Commercial registration"),
      ),
    ).toBe(true);
  }
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/provider-agreement-builder-preview.pdf", bytes);
});
it("rejects an oversized footer rather than overlapping contract content", async () => {
  const template = importBuilder(legacyTemplate());
  template.footer.rows = Array.from({ length: 12 }, (_, i) => ({
    id: `row_${i}`,
    visible: true,
    label: { ar: "عنوان", en: "Address" },
    source: {
      kind: "fixed" as const,
      value: { ar: "عنوان طويل ".repeat(60), en: "Long address ".repeat(40) },
    },
  }));
  await expect(
    renderBuilderPdf(template, sampleData, {}, true),
  ).rejects.toThrow("footer_too_large");
});
