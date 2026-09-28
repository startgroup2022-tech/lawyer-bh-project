import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createLeaseSignatureService } from "./signature-service";

const checksum = "b".repeat(64);
const tenant: SarayaPrincipal = { userId: "tenant-user", sessionId: "s", propertyIds: [], memberships: [] };
const acceptance = { acceptedName: "Tenant Name", checksum, ip: "1.2.3.4", userAgent: "ua" };
const preparation = {
  kind: "prepare" as const, leaseId: "lease-1", propertyId: "property-1", checksum,
  evidenceDigest: "c".repeat(64), generatedAt: new Date("2026-09-27T00:00:00Z"),
  snapshot: { leaseId: "lease-1", version: 1, propertyNameAr: "سرايا", propertyNameEn: "Saraya", unitNumber: "1", tenantNameAr: "مستأجر", tenantNameEn: "Tenant", ownerNameAr: "مالك", ownerNameEn: "Owner", startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "500.000", feeAmount: "0.000", currency: "BHD", paymentReference: "pay", approvalAudit: "approved", schedule: [], signatures: [], generatedAt: new Date("2026-09-27T00:00:00Z") },
};

describe("lease signatures", () => {
  it("requires exact checksum and typed legal name", async () => {
    const service = createLeaseSignatureService({ accept: vi.fn(), registerPreparedDocument: vi.fn(), complete: vi.fn(), resolveCompletion: vi.fn(), abort: vi.fn() } as never, { render: vi.fn() } as never, { put: vi.fn(), delete: vi.fn() } as never);
    await expect(service.sign(tenant, "lease-1", { ...acceptance, acceptedName: "" })).rejects.toMatchObject({ code: "INVALID_SIGNATURE_ACCEPTANCE" });
    await expect(service.sign(tenant, "lease-1", { ...acceptance, checksum: "wrong" })).rejects.toMatchObject({ code: "INVALID_LEASE_CHECKSUM" });
  });

  it("does not commit the second signature when final PDF storage fails", async () => {
    const complete = vi.fn();
    const abort = vi.fn(async () => undefined);
    const service = createLeaseSignatureService({ accept: vi.fn(async () => preparation), registerPreparedDocument: vi.fn(), complete, resolveCompletion: vi.fn(), abort } as never, { render: vi.fn(async () => ({ bytes: new Uint8Array([1]), leaseChecksum: checksum, documentChecksum: "d".repeat(64) })) } as never, { put: vi.fn(async () => { throw new Error("storage down"); }), delete: vi.fn() } as never);
    await expect(service.sign(tenant, "lease-1", acceptance)).rejects.toThrow("storage down");
    expect(complete).not.toHaveBeenCalled();
    expect(abort).toHaveBeenCalledWith("lease-1", preparation.evidenceDigest);
  });

  it("stores the prepared PDF before atomically committing the second signature", async () => {
    const order: string[] = [];
    const repository = { accept: vi.fn(async () => preparation), registerPreparedDocument: vi.fn(async () => { order.push("register"); }), complete: vi.fn(async () => { order.push("commit"); return { status: "active", leaseId: "lease-1", documentId: "doc-1" }; }), resolveCompletion: vi.fn(), abort: vi.fn() };
    const service = createLeaseSignatureService(repository as never, { render: vi.fn(async () => ({ bytes: new Uint8Array([1]), leaseChecksum: checksum, documentChecksum: "d".repeat(64) })) } as never, { put: vi.fn(async () => { order.push("store"); }), delete: vi.fn() } as never);
    await expect(service.sign(tenant, "lease-1", acceptance)).resolves.toMatchObject({ status: "active" });
    expect(order).toEqual(["register", "store", "commit"]);
    expect(repository.registerPreparedDocument).toHaveBeenCalledWith(expect.objectContaining({ storageKey: `saraya/property-1/lease/lease-1/v1-final-${"d".repeat(64)}.pdf` }));
  });

  it("keeps a final blob when an ambiguous commit actually finalized", async () => {
    const storage = { put: vi.fn(), delete: vi.fn() };
    const repository = {
      accept: vi.fn(async () => preparation), registerPreparedDocument: vi.fn(),
      complete: vi.fn(async () => { throw new Error("connection lost after commit"); }),
      resolveCompletion: vi.fn(async () => ({ kind: "finalized", result: { status: "active", leaseId: "lease-1", documentId: "doc-1" } })), abort: vi.fn(),
    };
    const service = createLeaseSignatureService(repository as never, { render: vi.fn(async () => ({ bytes: new Uint8Array([1]), leaseChecksum: checksum, documentChecksum: "d".repeat(64) })) } as never, storage as never);
    await expect(service.sign(tenant, "lease-1", acceptance)).resolves.toMatchObject({ status: "active", documentId: "doc-1" });
    expect(storage.delete).not.toHaveBeenCalled();
    expect(repository.abort).not.toHaveBeenCalled();
  });

  it("cleans a final blob only after the database proves it is unreferenced", async () => {
    const storage = { put: vi.fn(), delete: vi.fn() };
    const repository = {
      accept: vi.fn(async () => preparation), registerPreparedDocument: vi.fn(),
      complete: vi.fn(async () => { throw new Error("rollback"); }),
      resolveCompletion: vi.fn(async () => ({ kind: "unreferenced" })), abort: vi.fn(),
    };
    const service = createLeaseSignatureService(repository as never, { render: vi.fn(async () => ({ bytes: new Uint8Array([1]), leaseChecksum: checksum, documentChecksum: "d".repeat(64) })) } as never, storage as never);
    await expect(service.sign(tenant, "lease-1", acceptance)).rejects.toThrow("rollback");
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });

  it("cleans a proven stale prepared blob and retries preparation", async () => {
    const storage = { put: vi.fn(), delete: vi.fn() };
    const repository = {
      accept: vi.fn().mockResolvedValueOnce({ kind: "recover", storageKey: "stale.pdf" }).mockResolvedValueOnce(preparation),
      registerPreparedDocument: vi.fn(async () => "doc-1"), complete: vi.fn(async () => ({ status: "active", leaseId: "lease-1", documentId: "doc-1" })),
      resolveCompletion: vi.fn(), abort: vi.fn(),
    };
    const service = createLeaseSignatureService(repository as never, { render: vi.fn(async () => ({ bytes: new Uint8Array([1]), leaseChecksum: checksum, documentChecksum: "d".repeat(64) })) } as never, storage as never);
    await expect(service.sign(tenant, "lease-1", acceptance)).resolves.toMatchObject({ status: "active" });
    expect(storage.delete).toHaveBeenCalledWith("stale.pdf");
    expect(repository.accept).toHaveBeenCalledTimes(2);
  });
});
