import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createRentalStatusService } from "./status-service";

const requestId = "55555555-5555-4555-8555-555555555555";
const row = {
  id: requestId, propertyId: "11111111-1111-4111-8111-111111111111",
  unitId: "22222222-2222-4222-8222-222222222222", tenantUserId: "tenant",
  ownerId: "owner-1", status: "paid_awaiting_signature", resolvedApprovalMode: "instant",
  createdAt: new Date("2026-09-27T10:00:00Z"), decidedAt: new Date("2026-09-27T10:01:00Z"),
  paymentDemandId: "demand-1", paymentStatus: "paid", totalAmount: "10.000", currency: "BHD",
  paymentUpdatedAt: new Date("2026-09-27T10:02:00Z"), leaseId: "lease-1", leaseStatus: "draft",
  leaseChecksum: "a".repeat(64), draftDocumentAvailable: true, finalDocumentAvailable: false,
  tenantSignedAt: null, ownerSignedAt: null,
  finalizedAt: null, leaseUpdatedAt: null,
};
const tenant: SarayaPrincipal = { userId: "tenant", sessionId: "s", propertyIds: [], memberships: [] };

describe("rental request status service", () => {
  it("returns a privacy-safe server-driven contract to the request tenant", async () => {
    const result = await createRentalStatusService({ find: async () => row }).read(tenant, requestId);
    expect(result).toMatchObject({ id: requestId, requestId, paymentStatus: "paid", lease: { id: "lease-1", documentAvailable: true } });
    expect(result.timeline.map((event) => event.code)).toEqual(["submitted", "instant_approved", "payment_confirmed"]);
    expect(JSON.stringify(result)).not.toContain("tenantUserId");
    expect(JSON.stringify(result)).not.toContain("ownerId");
  });

  it.each([
    {
      name: "tenant signs second",
      tenantSignedAt: new Date("2026-09-27T10:05:00Z"),
      ownerSignedAt: new Date("2026-09-27T10:04:00Z"),
      expected: ["submitted", "instant_approved", "payment_confirmed", "owner_signed", "tenant_signed", "activated"],
    },
    {
      name: "owner signs second",
      tenantSignedAt: new Date("2026-09-27T10:04:00Z"),
      ownerSignedAt: new Date("2026-09-27T10:05:00Z"),
      expected: ["submitted", "instant_approved", "payment_confirmed", "tenant_signed", "owner_signed", "activated"],
    },
  ])("sorts timeline when $name and activates at authoritative finalization", async ({ tenantSignedAt, ownerSignedAt, expected }) => {
    const finalizedAt = new Date("2026-09-27T10:06:00Z");
    const result = await createRentalStatusService({ find: async () => ({
      ...row, status: "completed", leaseStatus: "active", tenantSignedAt, ownerSignedAt, finalizedAt,
    }) }).read(tenant, requestId);
    expect(result.timeline.map((item) => item.code)).toEqual(expected);
    expect(result.timeline.at(-1)?.occurredAt).toBe(finalizedAt.toISOString());
  });

  it("allows scoped management and hides existence from unrelated users", async () => {
    const service = createRentalStatusService({ find: async () => row });
    await expect(service.read({ userId: "manager", sessionId: "s", propertyIds: [row.propertyId], memberships: [{ propertyId: row.propertyId, role: "property_manager" }] }, requestId)).resolves.toMatchObject({ id: requestId });
    await expect(service.read({ userId: "other", sessionId: "s", propertyIds: [], memberships: [] }, requestId)).rejects.toMatchObject({ status: 404 });
  });
});
