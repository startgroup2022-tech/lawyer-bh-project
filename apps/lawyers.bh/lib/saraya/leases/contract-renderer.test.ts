import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decodePDFRawStream, PDFDocument, PDFRawStream } from "pdf-lib";
import { createContractRenderer } from "./contract-renderer";

describe("bilingual contract renderer", () => {
  it("renders a valid PDF whose returned checksum matches the bytes", async () => {
    const renderer = createContractRenderer();
    const result = await renderer.render({ leaseId: "lease-1", version: 1, propertyNameAr: "سرايا سكوير", propertyNameEn: "Saraya Square", unitNumber: "101", tenantNameAr: "شركة المستأجر", tenantNameEn: "Tenant Co", ownerNameAr: "المالك", ownerNameEn: "Owner", startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "500.000", feeAmount: "10.000", currency: "BHD", paymentReference: "pay-1", approvalAudit: "approved", schedule: [], signatures: [], generatedAt: new Date("2026-09-27T00:00:00Z") });
    expect(result.documentChecksum).toBe(createHash("sha256").update(result.bytes).digest("hex"));
    expect(result.leaseChecksum).toMatch(/^[0-9a-f]{64}$/);
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it("produces byte-identical PDFs for the same immutable snapshot", async () => {
    const renderer = createContractRenderer();
    const snapshot = { leaseId: "lease-1", version: 1, propertyNameAr: "سرايا سكوير", propertyNameEn: "Saraya Square", unitNumber: "101", tenantNameAr: "شركة المستأجر", tenantNameEn: "Tenant Co", ownerNameAr: "المالك", ownerNameEn: "Owner", startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "500.000", feeAmount: "10.000", currency: "BHD", paymentReference: "pay-1", approvalAudit: "approved", schedule: [], signatures: [], generatedAt: new Date("2026-09-27T00:00:00Z") };
    const first = await renderer.render(snapshot);
    const second = await renderer.render(snapshot);
    expect(Buffer.from(second.bytes)).toEqual(Buffer.from(first.bytes));
    expect(second.documentChecksum).toBe(first.documentChecksum);
  });

  it("keeps mixed Arabic and English text extractable in logical order", async () => {
    const renderer = createContractRenderer();
    const result = await renderer.render({ leaseId: "lease-1", version: 1, propertyNameAr: "سرايا سكوير", propertyNameEn: "Saraya Square", unitNumber: "A-101", tenantNameAr: "شركة النور", tenantNameEn: "Al Noor LLC", ownerNameAr: "المالك", ownerNameEn: "Owner", startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "500.000", feeAmount: "10.000", currency: "BHD", paymentReference: "pay-1", approvalAudit: "approved", schedule: [], signatures: [], generatedAt: new Date("2026-09-27T00:00:00Z") });
    const document = await PDFDocument.load(result.bytes);
    const text = document.getPages().flatMap((page) => {
      const contents = page.node.Contents();
      const refs = contents && "asArray" in contents ? contents.asArray() : [contents];
      return refs.flatMap((ref) => {
        const stream = Buffer.from(decodePDFRawStream(document.context.lookup(ref!) as PDFRawStream).decode()).toString();
        return [...stream.matchAll(/\/ActualText <([A-F0-9]+)>/g)].map((match) => Buffer.from(match[1], "hex").swap16().toString("utf16le"));
      });
    }).join(" ");
    expect(text).toContain("Saraya Square");
    expect(text).toContain("سرايا سكوير");
    expect(text).toContain("Al Noor LLC");
    expect(text).toContain("شركة النور");
  });

  it("wraps maximum-length bilingual legal names inside page margins", async () => {
    const renderer = createContractRenderer();
    const result = await renderer.render({ leaseId: "lease-1", version: 1, propertyNameAr: "سرايا سكوير", propertyNameEn: "Saraya Square", unitNumber: "A-101", tenantNameAr: "شركة ".repeat(40).trim(), tenantNameEn: "Very Long Commercial Tenant Name ".repeat(8).trim(), ownerNameAr: "المالك ".repeat(35).trim(), ownerNameEn: "Very Long Owner Legal Name ".repeat(8).trim(), startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "500.000", feeAmount: "10.000", currency: "BHD", paymentReference: "pay-1", approvalAudit: "approved", schedule: Array.from({ length: 36 }, (_, index) => ({ sequence: index + 1, dueDate: "2026-10-01", totalMinor: "500000" })), signatures: [], generatedAt: new Date("2026-09-27T00:00:00Z") });
    const document = await PDFDocument.load(result.bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
    for (const page of document.getPages()) {
      const contents = page.node.Contents();
      const refs = contents && "asArray" in contents ? contents.asArray() : [contents];
      const stream = refs.map((ref) => Buffer.from(decodePDFRawStream(document.context.lookup(ref!) as PDFRawStream).decode()).toString()).join("\n");
      for (const match of stream.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/g)) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(39);
        expect(Number(match[1])).toBeLessThanOrEqual(556);
        expect(Number(match[2])).toBeGreaterThanOrEqual(39);
        expect(Number(match[2])).toBeLessThanOrEqual(803);
      }
    }
  });
});
