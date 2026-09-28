import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createInvoiceService, type InvoiceRepository } from "./invoice-service";

const PROPERTY = "11111111-1111-4111-8111-111111111111";
const USER = "33333333-3333-4333-8333-333333333333";
const OWNER = "44444444-4444-4444-8444-444444444444";
const base = { userId: USER, sessionId: "s", propertyIds: [], memberships: [] } satisfies SarayaPrincipal;
const repository = (capture: Array<unknown>): InvoiceRepository => ({
  list: async (scope) => { capture.push(scope); return []; },
  listTargets: async (propertyId) => { capture.push({ propertyId }); return []; },
  create: async (input) => { capture.push(input); return { id: "invoice-1" }; },
});

describe("Saraya invoice access", () => {
  it("limits a user without management membership to their own invoices", async () => {
    const calls: unknown[] = [];
    await createInvoiceService(repository(calls)).list(base);
    expect(calls).toEqual([{ tenantUserId: USER }]);
  });

  it("limits an owner property query to the owner's units", async () => {
    const calls: unknown[] = [];
    const principal: SarayaPrincipal = { ...base, propertyIds: [PROPERTY], memberships: [{ propertyId: PROPERTY, role: "owner", ownerId: OWNER }] };
    await createInvoiceService(repository(calls)).list(principal, PROPERTY);
    expect(calls).toEqual([{ propertyId: PROPERTY, ownerId: OWNER }]);
  });

  it("allows a general administrator to list the whole property", async () => {
    const calls: unknown[] = [];
    const principal: SarayaPrincipal = { ...base, propertyIds: [PROPERTY], memberships: [{ propertyId: PROPERTY, role: "super_admin" }] };
    await createInvoiceService(repository(calls)).list(principal, PROPERTY);
    expect(calls).toEqual([{ propertyId: PROPERTY }]);
  });

  it("rejects a property outside the principal's memberships", async () => {
    await expect(createInvoiceService(repository([])).list(base, PROPERTY)).rejects.toMatchObject({ status: 403, code: "PROPERTY_ACCESS_DENIED" });
  });

  it("lists invoice targets for a billing writer", async () => {
    const calls: unknown[] = [];
    const principal: SarayaPrincipal = { ...base, memberships: [{ propertyId: PROPERTY, role: "accountant" }] };
    await createInvoiceService(repository(calls)).listTargets(principal, PROPERTY);
    expect(calls).toEqual([{ propertyId: PROPERTY }]);
  });

  it("creates a validated BHD invoice with a generated number", async () => {
    const calls: unknown[] = [];
    const principal: SarayaPrincipal = { ...base, memberships: [{ propertyId: PROPERTY, role: "super_admin" }] };
    const result = await createInvoiceService(repository(calls), () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee").create(principal, {
      propertyId: PROPERTY,
      rentalRequestId: "22222222-2222-4222-8222-222222222222",
      description: "September rent",
      amount: "1250.500",
      issueDate: "2026-09-01",
      dueDate: "2026-09-30",
      status: "due",
    });
    expect(result).toEqual({ id: "invoice-1" });
    expect(calls).toEqual([expect.objectContaining({
      propertyId: PROPERTY,
      actorUserId: USER,
      number: "INV-2026-AAAAAAAA",
      description: "September rent",
      amount: "1250.500",
      currency: "BHD",
    })]);
  });

  it("rejects creation without billing write permission", async () => {
    const principal: SarayaPrincipal = { ...base, memberships: [{ propertyId: PROPERTY, role: "property_manager" }] };
    await expect(createInvoiceService(repository([])).create(principal, {
      propertyId: PROPERTY,
      rentalRequestId: "22222222-2222-4222-8222-222222222222",
      description: "Rent",
      amount: "10.000",
      issueDate: "2026-09-02",
      dueDate: "2026-09-01",
      status: "due",
    })).rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
  });

  it("rejects invalid amounts and reversed dates", async () => {
    const principal: SarayaPrincipal = { ...base, memberships: [{ propertyId: PROPERTY, role: "accountant" }] };
    await expect(createInvoiceService(repository([])).create(principal, {
      propertyId: PROPERTY,
      rentalRequestId: "22222222-2222-4222-8222-222222222222",
      description: "Rent",
      amount: "0.000",
      issueDate: "2026-09-02",
      dueDate: "2026-09-01",
      status: "due",
    })).rejects.toMatchObject({ status: 422, code: "INVALID_INVOICE" });
  });
});
