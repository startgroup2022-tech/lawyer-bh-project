import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument, PDFHexString, PDFName, PDFOperator, PDFOperatorNames,
  beginText, endText, setFillingRgbColor, setFontAndSize, setTextMatrix, showText,
  type PDFPage,
} from "pdf-lib";
import { layoutLine, wrapText } from "@/lib/provider-agreement/shaping";

export interface ContractSnapshot {
  leaseId: string;
  version: number;
  propertyNameAr: string;
  propertyNameEn: string;
  unitNumber: string;
  tenantNameAr: string;
  tenantNameEn: string;
  ownerNameAr: string;
  ownerNameEn: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  feeAmount: string;
  currency: string;
  paymentReference: string;
  approvalAudit: string;
  schedule: Array<{ sequence: number; dueDate: string; totalMinor: string }>;
  signatures: Array<{ role: string; name: string; signedAt: string }>;
  generatedAt: Date;
}

const canonical = (snapshot: ContractSnapshot) => JSON.stringify({ ...snapshot, generatedAt: snapshot.generatedAt.toISOString() });
const mills = (value: string) => `${BigInt(value) / BigInt(1000)}.${String(BigInt(value) % BigInt(1000)).padStart(3, "0")}`;

export function createContractRenderer() {
  return {
    async render(snapshot: ContractSnapshot, acceptedLeaseChecksum?: string) {
      const leaseChecksum = acceptedLeaseChecksum ?? createHash("sha256").update(canonical(snapshot)).digest("hex");
      const pdf = await PDFDocument.create();
      pdf.registerFontkit(fontkit);
      const fontBytes = await readFile(join(process.cwd(), "public", "fonts", "Cairo-Full.ttf"));
      const embedded = await pdf.embedFont(fontBytes, { subset: false });
      const shaper = fontkit.create(fontBytes);
      pdf.setTitle("Saraya Square Lease Agreement");
      pdf.setSubject(`Lease ${snapshot.leaseId} version ${snapshot.version}`);
      pdf.setCreator("Saraya Square");
      pdf.setProducer("Saraya Square deterministic contract renderer");
      pdf.setCreationDate(snapshot.generatedAt);
      pdf.setModificationDate(snapshot.generatedAt);
      let page: PDFPage;
      let fontName: PDFName;
      let y = 800;
      const newPage = () => {
        page = pdf.addPage([595, 842]);
        fontName = page.node.newFontDictionary("Cairo", embedded.ref);
        y = 800;
      };
      newPage();
      const line = (text: string, size = 10) => {
        const rtl = /[\u0600-\u06ff]/.test(text);
        for (const wrapped of wrapText(shaper, text, rtl, size, 515)) {
          if (y < 55) newPage();
          const shaped = layoutLine(shaper, wrapped, rtl);
          const scale = size / shaper.unitsPerEm;
          const left = rtl ? Math.max(40, 555 - shaped.width * scale) : 40;
          page.pushOperators(
            PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of("Span"), pdf.context.obj({ ActualText: PDFHexString.fromText(wrapped) }).toString()]),
            beginText(), setFontAndSize(fontName, size), setFillingRgbColor(0.12, 0.16, 0.22),
          );
          for (const glyph of shaped.glyphs) page.pushOperators(setTextMatrix(1, 0, 0, 1, Math.min(555, Math.max(40, left + glyph.x * scale)), y + glyph.y * scale), showText(PDFHexString.of(glyph.id.toString(16).padStart(4, "0"))));
          page.pushOperators(endText(), PDFOperator.of(PDFOperatorNames.EndMarkedContent));
          y -= size + 8;
        }
      };
      line("SARAYA SQUARE LEASE AGREEMENT | عقد إيجار سرايا سكوير", 15);
      line(`${snapshot.propertyNameEn} | ${snapshot.propertyNameAr}`);
      line(`Unit / الوحدة: ${snapshot.unitNumber}`);
      line(`Tenant / المستأجر: ${snapshot.tenantNameEn} | ${snapshot.tenantNameAr}`);
      line(`Owner / المالك: ${snapshot.ownerNameEn} | ${snapshot.ownerNameAr}`);
      line(`Term / المدة: ${snapshot.startDate} — ${snapshot.endDate}`);
      line(`Rent / الإيجار: ${snapshot.rentAmount} ${snapshot.currency}`);
      line(`Deposit / التأمين: ${snapshot.depositAmount} ${snapshot.currency}`);
      line(`Fees / الرسوم: ${snapshot.feeAmount} ${snapshot.currency}`);
      line(`Verified payment / الدفع المتحقق: ${snapshot.paymentReference}`);
      line(`Approval audit / سجل الموافقة: ${snapshot.approvalAudit}`);
      line("Rent schedule / جدول الإيجار", 12);
      for (const item of snapshot.schedule) line(`#${item.sequence}  ${item.dueDate}  ${mills(item.totalMinor)} ${snapshot.currency}`);
      line("Signatures / التوقيعات", 12);
      if (!snapshot.signatures.length) line("Pending tenant and owner acceptance | بانتظار قبول المستأجر والمالك");
      for (const signature of snapshot.signatures) line(`${signature.role}: ${signature.name} — ${signature.signedAt}`);
      line(`Lease version checksum / بصمة نسخة العقد: ${leaseChecksum}`);
      line(`Generated / تاريخ الإنشاء: ${snapshot.generatedAt.toISOString()}`);
      const bytes = await pdf.save({ useObjectStreams: false });
      return { bytes, leaseChecksum, documentChecksum: createHash("sha256").update(bytes).digest("hex") };
    },
  };
}

export type ContractRenderer = ReturnType<typeof createContractRenderer>;
