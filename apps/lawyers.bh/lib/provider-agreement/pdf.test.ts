import { mkdir, writeFile } from "node:fs/promises";
import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { expect, it } from "vitest";
import { renderProviderPdf } from "./pdf";
import { legacyTemplate, sampleData, modernDraft } from "./model";
import sharp from "sharp";
it("centers the full Arabic header on every modern page, including English and signatures",async()=>{
 const bytes=await renderProviderPdf({providerId:"preview",versionId:null,template:modernDraft(legacyTemplate()),data:sampleData,legacy:false},true);
 const pdf=await PDFDocument.load(bytes);
 for(const [i,page] of pdf.getPages().entries()){
  const objects=page.node.Resources()!.lookup(PDFName.of("XObject"),PDFDict);
  expect(objects.entries().some(([,ref])=>{const image=pdf.context.lookup(ref) as PDFRawStream;return image.dict.lookupMaybe(PDFName.of("Width"),PDFNumber)?.asNumber()===3406&&image.dict.lookupMaybe(PDFName.of("Height"),PDFNumber)?.asNumber()===830;})).toBe(true);
  const transforms=[...pageText(pdf,i).matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) cm\n1 0 0 1 0 0 cm\n([\d.]+) 0 0 ([\d.]+) 0 0 cm/g)];
  const header=transforms.find(match=>Math.abs(Number(match[3])-330)<.01);
  expect(header).toBeDefined();
  expect(Number(header![1])+Number(header![3])/2).toBeCloseTo(page.getWidth()/2,2);
  expect(Number(header![2])).toBeGreaterThan(730);
 }
 await writeFile("output/pdf/provider-agreement-approved-header.pdf",bytes);
});
function pageText(pdf: PDFDocument, index: number) {
  const contents = pdf.getPage(index).node.Contents();
  const refs =
    contents && "asArray" in contents ? contents.asArray() : [contents];
  return refs
    .map((ref) =>
      Buffer.from(
        decodePDFRawStream(pdf.context.lookup(ref!) as PDFRawStream).decode(),
      ).toString(),
    )
    .join("\n");
}
it("renders both parties on a dedicated signature page without losing long legal text", async () => {
  const template = modernDraft(legacyTemplate());
  template.presentation!.firstParty.nameAr = "مفوض تجريبي";
  template.contentEn += "\nFINAL LEGAL CLAUSE";
  const bytes = await renderProviderPdf(
    {
      providerId: "preview",
      versionId: "v1",
      template,
      data: sampleData,
      legacy: false,
    },
    true,
  );
  const pdf = await PDFDocument.load(bytes),
    last = pageText(pdf, pdf.getPageCount() - 1);
  const hex = (s: string) =>
    Buffer.from("\ufeff" + s, "utf16le")
      .swap16()
      .toString("hex")
      .toUpperCase();
  expect(last).toContain(hex("FIRST PARTY / PLATFORM"));
  expect(last).toContain(hex("SECOND PARTY / PROVIDER"));
  expect(
    pdf
      .getPages()
      .map((_, i) => pageText(pdf, i))
      .join("\n"),
  ).toContain(hex("FINAL LEGAL CLAUSE"));
  const delivered = modernDraft(legacyTemplate());
  await writeFile(
    "output/pdf/provider-agreement-modern-preview.pdf",
    await renderProviderPdf(
      {
        providerId: "preview",
        versionId: null,
        template: delivered,
        data: sampleData,
        legacy: false,
      },
      true,
    ),
  );
});
it("keeps long representative details and three test image swatches inside the signature page", async () => {
  const template = modernDraft(legacyTemplate()),
    first = template.presentation!.firstParty;
  first.nameAr = "محمد عبدالله أحمد ".repeat(7).slice(0, 120);
  first.nameEn = "Representative Example ".repeat(6).slice(0, 120);
  first.roleAr = "المفوض بالتوقيع نيابة عن المنصة ".repeat(4).slice(0, 120);
  first.roleEn = "Authorized Platform Representative ".repeat(4).slice(0, 120);
  const swatch = async (color: string) =>
    "data:image/png;base64," +
    (
      await sharp({
        create: { width: 160, height: 40, channels: 4, background: color },
      })
        .png()
        .toBuffer()
    ).toString("base64");
  first.signatureDataUrl = await swatch("#cddaf0");
  first.stampDataUrl = await swatch("#f0dada");
  const bytes = await renderProviderPdf(
    {
      providerId: "preview",
      versionId: null,
      template,
      data: { ...sampleData, signatureDataUrl: await swatch("#d4eed4") },
      legacy: false,
    },
    true,
  );
  const pdf = await PDFDocument.load(bytes),
    last = pdf.getPage(pdf.getPageCount() - 1);
  expect(
    last.node.Resources()!.lookup(PDFName.of("XObject"), PDFDict).entries()
      .length,
  ).toBeGreaterThanOrEqual(5);
  await writeFile("output/pdf/provider-agreement-modern-stress.pdf", bytes);
});
it("does not apply the modern layout to old snapshots", async () => {
  const bytes = await renderProviderPdf({
    providerId: "old",
    versionId: null,
    template: legacyTemplate(),
    data: sampleData,
    legacy: true,
  });
  const pdf = await PDFDocument.load(bytes),
    last = pageText(pdf, pdf.getPageCount() - 1);
  const marker = Buffer.from("\ufeffFIRST PARTY / PLATFORM", "utf16le")
    .swap16()
    .toString("hex")
    .toUpperCase();
  expect(last).not.toContain(marker);
});
it("renders a paginated bilingual preview and marks it as unsigned", async () => {
  const bytes = await renderProviderPdf(
    {
      providerId: "preview",
      versionId: null,
      template: legacyTemplate(),
      data: sampleData,
      legacy: false,
    },
    true,
  );
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(2);
  expect(pdf.getSubject()).toBe("Preview only - not signed");
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/provider-agreement-preview.pdf", bytes);
});

it.each([true, false])(
  "places the logo at 8 percent opacity on every page (preview=%s)",
  async (preview) => {
    const bytes = await renderProviderPdf(
      {
        providerId: "preview",
        versionId: null,
        template: legacyTemplate(),
        data: sampleData,
        legacy: false,
      },
      preview,
    );
    const pdf = await PDFDocument.load(bytes);
    for (const page of pdf.getPages()) {
      const resources = page.node.Resources()!;
      expect(resources.get(PDFName.of("XObject"))).toBeDefined();
      expect(
        resources.lookup(PDFName.of("XObject"), PDFDict).entries().length,
      ).toBeGreaterThan(0);
      const states = resources.lookup(PDFName.of("ExtGState"), PDFDict);
      expect(
        states
          .entries()
          .some(
            ([, ref]) =>
              pdf.context
                .lookup(ref, PDFDict)
                .lookupMaybe(PDFName.of("ca"), PDFNumber)
                ?.asNumber() === 0.08,
          ),
      ).toBe(true);
    }
  },
);
