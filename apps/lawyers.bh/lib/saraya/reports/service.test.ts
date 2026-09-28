import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createReportService, type ReportRepository } from "./service";
import type { ReportDocument, ReportFilter } from "./contracts";

const propertyId = "11111111-1111-4111-8111-111111111111";
const document: ReportDocument = {
  metadata: { propertyId, propertyNameAr: "سرايا سكوير", propertyNameEn: "Saraya Square", propertyCode: "SQ", currencyCode: "BHD", from: "2026-09-01", to: "2026-09-30", generatedAt: "2026-09-26T12:00:00.000Z" },
  summary: [{ labelAr: "الإجمالي", labelEn: "Total", value: "1" }],
  sections: [],
};
const filter: ReportFilter = { propertyId, reportType: "comprehensive", format: "pdf", locale: "ar", from: "2026-09-01", to: "2026-09-30" };
const manager: SarayaPrincipal = { userId: "22222222-2222-4222-8222-222222222222", sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "property_manager" }] };

function repository(): ReportRepository {
  return { load: async () => document };
}

describe("Saraya report service", () => {
  it("renders and audits an authorized management export", async () => {
    const audited: unknown[] = [];
    const service = createReportService(repository(), {
      pdf: async () => new Uint8Array([37, 80, 68, 70]),
      xlsx: async () => new Uint8Array([80, 75, 3, 4]),
    }, async (entry) => { audited.push(entry); });

    const file = await service.export(manager, filter);

    expect(file.contentType).toBe("application/pdf");
    expect(file.fileName).toContain("saraya-square-comprehensive-2026-09-01-2026-09-30-ar.pdf");
    expect(audited).toHaveLength(1);
  });

  it("passes owner scope to the repository", async () => {
    let scope: unknown;
    const owner: SarayaPrincipal = { ...manager, memberships: [{ propertyId, role: "owner", ownerId: "33333333-3333-4333-8333-333333333333" }] };
    const service = createReportService({ load: async (_filter, received) => { scope = received; return document; } }, { pdf: async () => new Uint8Array([1]), xlsx: async () => new Uint8Array([1]) }, async () => {});
    await service.export(owner, filter);
    expect(scope).toEqual({ ownerId: "33333333-3333-4333-8333-333333333333" });
  });

  it("rejects tenants, cross-property access, and reversed dates", async () => {
    const renderers = { pdf: async () => new Uint8Array([1]), xlsx: async () => new Uint8Array([1]) };
    const service = createReportService(repository(), renderers, async () => {});
    await expect(service.export({ ...manager, memberships: [{ propertyId, role: "tenant", tenantId: "t" }] }, filter)).rejects.toMatchObject({ code: "REPORT_ACCESS_DENIED" });
    await expect(service.export(manager, { ...filter, propertyId: "99999999-9999-4999-8999-999999999999" })).rejects.toMatchObject({ code: "PROPERTY_ACCESS_DENIED" });
    await expect(service.export(manager, { ...filter, from: "2026-10-01", to: "2026-09-01" })).rejects.toMatchObject({ code: "INVALID_REPORT_RANGE" });
  });
});
