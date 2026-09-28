import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createLeaseService, type LeaseRepository } from "./service";

const P = "11111111-1111-4111-8111-111111111111", OTHER = "22222222-2222-4222-8222-222222222222";
const principal: SarayaPrincipal = { userId: "33333333-3333-4333-8333-333333333333", sessionId: "s", propertyIds: [P], memberships: [{ propertyId: P, role: "property_manager" }] };
const lease = { id: "44444444-4444-4444-8444-444444444444", propertyId: P, unitId: "55555555-5555-4555-8555-555555555555", tenantOrganizationId: "66666666-6666-4666-8666-666666666666", status: "pending_approval" as const, currentVersion: 1, terms: { startDate: "2026-01-01", endDate: "2026-12-31", rentAmount: "100.000", depositAmount: "500.000", frequency: "monthly" as const, dueDay: 1, graceDays: 0, discountAmount: "0.000", feeAmount: "0.000" } };
const repository = (patch: Partial<LeaseRepository> = {}): LeaseRepository => ({
  getForUpdate: async () => lease, hasOverlappingActiveLease: async () => false,
  appendVersionAndTransition: async (input) => ({ ...lease, status: input.nextStatus }),
  transaction: async (work) => work(repository(patch)), ...patch,
});

describe("lease service", () => {
  it("rejects approval for a divided non-rentable parent office", async () => {
    const blocked = { ...lease, isRentable: false };
    const service = createLeaseService(repository({ getForUpdate: async () => blocked }));
    await expect(service.command(principal, P, lease.id, { type: "approve" }))
      .rejects.toMatchObject({ code: "UNIT_NOT_RENTABLE" });
  });

  it("authorizes the property before starting a transaction", async () => {
    let began = false; const service = createLeaseService(repository({ transaction: async (work) => { began = true; return work(repository()); } }));
    await expect(service.command(principal, OTHER, lease.id, { type: "approve" })).rejects.toMatchObject({ code: "PROPERTY_ACCESS_DENIED" });
    expect(began).toBe(false);
  });

  it("rejects an approval that overlaps another active lease", async () => {
    const service = createLeaseService(repository({ hasOverlappingActiveLease: async () => true }));
    await expect(service.command(principal, P, lease.id, { type: "approve" })).rejects.toMatchObject({ code: "LEASE_OVERLAP" });
  });

  it("atomically appends a version and marks the unit occupied on approval", async () => {
    let received: Parameters<LeaseRepository["appendVersionAndTransition"]>[0] | undefined;
    const service = createLeaseService(repository({ appendVersionAndTransition: async (input) => { received = input; return { ...lease, status: input.nextStatus }; } }));
    await service.command(principal, P, lease.id, { type: "approve" });
    expect(received).toMatchObject({ propertyId: P, leaseId: lease.id, nextStatus: "active", unitStatus: "occupied", actorUserId: principal.userId, command: { type: "approve" } });
  });

  it("passes the termination reason into append-only history", async () => {
    let received: Parameters<LeaseRepository["appendVersionAndTransition"]>[0] | undefined;
    const active = { ...lease, status: "active" as const };
    await createLeaseService(repository({ getForUpdate: async () => active, appendVersionAndTransition: async (input) => { received = input; return active; } })).command(principal, P, lease.id, { type: "terminate", reason: "mutual agreement" });
    expect(received?.command).toEqual({ type: "terminate", reason: "mutual agreement" });
  });

  it("marks the unit vacant only when a terminated lease closes", async () => {
    let unitStatus: string | null | undefined;
    const terminated = { ...lease, status: "terminated" as const };
    const repo = repository({ getForUpdate: async () => terminated, appendVersionAndTransition: async (input) => { unitStatus = input.unitStatus; return terminated; } });
    await createLeaseService(repo).command(principal, P, lease.id, { type: "close" });
    expect(unitStatus).toBe("vacant");
  });

  it("allows a tenant to request renewal only for its own scoped lease", async () => {
    const tenant = { ...principal, memberships: [{ propertyId: P, role: "tenant" as const, tenantId: lease.tenantOrganizationId }] };
    await expect(createLeaseService(repository({ getForUpdate: async () => ({ ...lease, status: "active" }) })).command(tenant, P, lease.id, { type: "request_renewal" })).resolves.toMatchObject({ status: "renewal_requested" });
    const otherTenant = { ...tenant, memberships: [{ ...tenant.memberships[0], tenantId: OTHER }] };
    await expect(createLeaseService(repository({ getForUpdate: async () => ({ ...lease, status: "active" }) })).command(otherTenant, P, lease.id, { type: "request_renewal" })).rejects.toMatchObject({ code: "TENANT_ACCESS_DENIED" });
  });
});
