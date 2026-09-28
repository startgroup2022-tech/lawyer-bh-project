import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createRentalHandlers } from "./http";

const principal: SarayaPrincipal = { userId: "33333333-3333-4333-8333-333333333333", sessionId: "s", propertyIds: [], memberships: [] };
const requestBody = {
  propertyId: "11111111-1111-4111-8111-111111111111",
  unitId: "22222222-2222-4222-8222-222222222222",
  applicantType: "company",
  applicantNameAr: "شركة المستأجر",
  applicantNameEn: "Tenant Company",
  registrationNumber: "CR-100",
  startDate: "2026-10-01",
  endDate: "2027-09-30",
  durationMonths: 12,
  idDocumentId: "66666666-6666-4666-8666-666666666666",
  idempotencyKey: "rent-1",
};

describe("Saraya rental HTTP handlers", () => {
  it("returns 201 for a valid authenticated submission", async () => {
    let captured: unknown;
    const handlers = createRentalHandlers({
      authenticate: async () => principal,
      submit: async (_principal, input) => {
        captured = input;
        return { id: "request-1", status: "pending_owner_review", ...input };
      },
      decide: async () => ({}),
      listInvoices: async () => [],
    });
    const response = await handlers.submit(new Request("https://sq.lawyers.bh/api", { method: "POST", body: JSON.stringify(requestBody) }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: "pending_owner_review", durationMonths: 12 });
    expect(captured).toMatchObject({
      applicantType: "company",
      applicantNameAr: "شركة المستأجر",
      applicantNameEn: "Tenant Company",
      registrationNumber: "CR-100",
    });
  });

  it("returns a bilingual 400 response for a malformed JSON body", async () => {
    const handlers = createRentalHandlers({ authenticate: async () => principal, submit: async () => ({}), decide: async () => ({}), listInvoices: async () => [] });
    const response = await handlers.submit(new Request("https://sq.lawyers.bh/api", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_JSON", messageAr: expect.any(String), messageEn: expect.any(String) } });
  });

  it("passes the route request id and approval command to the service", async () => {
    let captured: unknown;
    const handlers = createRentalHandlers({
      authenticate: async () => principal,
      submit: async () => ({}),
      decide: async (_principal, propertyId, requestId, decision) => { captured = { propertyId, requestId, decision }; return { status: "approved_awaiting_payment" }; },
      listInvoices: async () => [],
    });
    const response = await handlers.decide(
      new Request("https://sq.lawyers.bh/api", { method: "POST", body: JSON.stringify({ propertyId: requestBody.propertyId, decision: "approve", idempotencyKey: "approve-1" }) }),
      "55555555-5555-4555-8555-555555555555",
    );
    expect(response.status).toBe(200);
    expect(captured).toMatchObject({ propertyId: requestBody.propertyId, requestId: "55555555-5555-4555-8555-555555555555", decision: { type: "approve" } });
  });

  it("uses the authenticated principal when listing invoices", async () => {
    let actor = "";
    const handlers = createRentalHandlers({ authenticate: async () => principal, submit: async () => ({}), decide: async () => ({}), listInvoices: async (value) => { actor = value.userId; return []; } });
    const response = await handlers.invoices(new Request(`https://sq.lawyers.bh/api?propertyId=${requestBody.propertyId}`));
    expect(response.status).toBe(200);
    expect(actor).toBe(principal.userId);
  });
});
