import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createReportHandlers } from "./http";

const propertyId = "11111111-1111-4111-8111-111111111111";
const principal: SarayaPrincipal = { userId: "22222222-2222-4222-8222-222222222222", sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "property_manager" }] };

describe("report export HTTP handler", () => {
  it("returns downloadable PDF bytes with a safe filename", async () => {
    let captured: unknown;
    const handler = createReportHandlers({ authenticate: async () => principal, exportReport: async (_principal, filter) => { captured = filter; return { bytes: new Uint8Array([37, 80, 68, 70]), contentType: "application/pdf", fileName: "saraya-report-ar.pdf" }; } });
    const response = await handler.export(new Request(`https://sq.example/api?propertyId=${propertyId}&reportType=comprehensive&format=pdf&locale=ar&from=2026-09-01&to=2026-09-30`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("saraya-report-ar.pdf");
    expect(captured).toMatchObject({ propertyId, reportType: "comprehensive", format: "pdf", locale: "ar" });
  });

  it("rejects unsupported query values", async () => {
    const handler = createReportHandlers({ authenticate: async () => principal, exportReport: async () => { throw new Error("not called"); } });
    const response = await handler.export(new Request(`https://sq.example/api?propertyId=${propertyId}&reportType=bad&format=csv&locale=fr&from=x&to=y`));
    expect(response.status).toBe(422);
  });
});
