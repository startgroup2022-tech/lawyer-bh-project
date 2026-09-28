import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createInvoiceHandlers } from "./invoice-http";

const propertyId = "11111111-1111-4111-8111-111111111111";
const principal: SarayaPrincipal = { userId: "33333333-3333-4333-8333-333333333333", sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "accountant" }] };

describe("Saraya invoice HTTP handlers", () => {
  it("forwards a create request and returns 201", async () => {
    let captured: unknown;
    const handlers = createInvoiceHandlers({
      authenticate: async () => principal,
      list: async () => [],
      listTargets: async () => [],
      create: async (_principal, input) => { captured = input; return { id: "invoice-1" }; },
    });
    const response = await handlers.create(new Request("https://sq.example/api/saraya/v1/invoices", {
      method: "POST",
      body: JSON.stringify({ propertyId, rentalRequestId: "22222222-2222-4222-8222-222222222222", description: "Rent", amount: "500.000", issueDate: "2026-09-01", dueDate: "2026-09-30", status: "due" }),
    }));
    expect(response.status).toBe(201);
    expect(captured).toMatchObject({ propertyId, amount: "500.000", status: "due" });
  });

  it("returns targets when requested", async () => {
    const handlers = createInvoiceHandlers({ authenticate: async () => principal, list: async () => [], create: async () => ({}), listTargets: async () => [{ rentalRequestId: "request-1" }] });
    const response = await handlers.list(new Request(`https://sq.example/api/saraya/v1/invoices?propertyId=${propertyId}&targets=true`));
    await expect(response.json()).resolves.toEqual({ items: [{ rentalRequestId: "request-1" }] });
  });
});
