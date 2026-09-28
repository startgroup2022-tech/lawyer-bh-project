import { describe, expect, it, vi } from "vitest";
import { createLeaseCheckoutService } from "./checkout-service";
import type { ContractSnapshot } from "./contract-renderer";

describe("lease checkout", () => {
  it("creates exactly one immutable lease package for a paid request", async () => {
    const repository = {
      createForPaidRequest: vi.fn(async (_propertyId: string, _requestId: string, build: (snapshot: ContractSnapshot) => Promise<{ bytes: Uint8Array; leaseChecksum: string; documentChecksum: string }>) =>
        (await build({ leaseId: "lease-1", version: 1, propertyNameAr: "سرايا", propertyNameEn: "Saraya", unitNumber: "1", startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "500.000", feeAmount: "10.000", tenantNameAr: "مستأجر", tenantNameEn: "Tenant", ownerNameAr: "مالك", ownerNameEn: "Owner", currency: "BHD", paymentReference: "pay", approvalAudit: "approved", schedule: [], signatures: [], generatedAt: new Date() }), { leaseId: "lease-1", checksum: "a".repeat(64) })),
    };
    const renderer = { render: vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]), leaseChecksum: "a".repeat(64), documentChecksum: "b".repeat(64) })) };
    const service = createLeaseCheckoutService(repository as never, renderer as never);

    const first = await service.createForPaidRequest("property-1", "request-1");
    const second = await service.createForPaidRequest("property-1", "request-1");

    expect(first).toEqual({ leaseId: "lease-1", checksum: "a".repeat(64) });
    expect(second.leaseId).toBe(first.leaseId);
    expect(repository.createForPaidRequest).toHaveBeenCalledTimes(2);
    expect(renderer.render).toHaveBeenCalledTimes(2);
  });
});
