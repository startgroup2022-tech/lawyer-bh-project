import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createRentalRequestListService, type RentalRequestListRepository, type RentalRequestQueueRow } from "./request-list-service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const row: RentalRequestQueueRow & { propertyId: string; unitId: string } = {
  id: requestId, propertyId, unitId: "55555555-5555-4555-8555-555555555555", unitNumber: "A-01",
  applicantDisplayName: "Tenant Company", startDate: "2030-01-01", endDate: "2030-12-31",
  rentAmount: "500.000", depositAmount: "500.000", feeAmount: "10.000", currency: "BHD",
  resolvedApprovalMode: "owner_review", status: "pending_owner_review", paymentState: "verification_pending",
  identityDocumentPresent: true, paymentProofPresent: true, demandId: "66666666-6666-4666-8666-666666666666",
  sortPriority: 0, sortAt: "2029-12-01T08:00:00.000Z",
  timeline: [{ event: "submitted", occurredAt: "2029-12-01T08:00:00.000Z" }],
};
const principal = (role: SarayaPrincipal["memberships"][number]["role"]): SarayaPrincipal => ({
  userId: "77777777-7777-4777-8777-777777777777", sessionId: "s", propertyIds: [propertyId],
  memberships: [{ propertyId, role, ...(role === "owner" ? { ownerId } : {}) }],
});
const repository = (overrides: Partial<RentalRequestListRepository> = {}): RentalRequestListRepository => ({
  list: vi.fn(async () => [row]),
  findDocument: vi.fn(async () => ({ propertyId, ownerId, storageKey: "private/secret.pdf", originalName: "identity.pdf", contentType: "application/pdf" })),
  ...overrides,
});

describe("management rental request queue", () => {
  it("returns only the safe scoped queue projection and chronological timeline", async () => {
    const repo = repository();
    const result = await createRentalRequestListService(repo).list(principal("property_manager"), propertyId);
    expect(repo.list).toHaveBeenCalledWith({ propertyId, limit: 26 });
    expect(result.items[0]).toMatchObject({
      unitNumber: "A-01", applicantDisplayName: "Tenant Company",
      identityDocumentPresent: true, paymentProofPresent: true,
      canDownloadIdentityDocument: true, canDownloadPaymentProof: true,
      canApprove: false, canVerifyOfflinePayment: true,
    });
    expect(result.items[0]).not.toHaveProperty("documentId");
    expect(result.items[0]).not.toHaveProperty("propertyId");
    expect(result.items[0]).not.toHaveProperty("unitId");
    expect(result.items[0]).not.toHaveProperty("storageKey");
    expect(JSON.stringify(result)).not.toContain("private/secret.pdf");
  });

  it("allows only owner and super admin to approve while managers can only view", async () => {
    await expect(createRentalRequestListService(repository()).list(principal("owner"), propertyId)).resolves.toMatchObject({ items: [{ canApprove: true }] });
    await expect(createRentalRequestListService(repository()).list(principal("super_admin"), propertyId)).resolves.toMatchObject({ items: [{ canApprove: true }] });
    await expect(createRentalRequestListService(repository()).list(principal("property_manager"), propertyId)).resolves.toMatchObject({ items: [{ canApprove: false }] });
  });

  it("does not widen an owner without an owner scope", async () => {
    const unscoped = principal("owner");
    unscoped.memberships[0].ownerId = null;
    await expect(createRentalRequestListService(repository()).list(unscoped, propertyId)).rejects.toMatchObject({ code: "OWNER_SCOPE_REQUIRED" });
  });

  it("separates identity and payment-proof download authorization", async () => {
    const repo = repository();
    const service = createRentalRequestListService(repo);
    await expect(service.document(principal("owner"), propertyId, requestId, "identity")).resolves.toMatchObject({ originalName: "identity.pdf" });
    expect(repo.findDocument).toHaveBeenLastCalledWith({ propertyId, requestId, ownerId, kind: "identity" });
    await expect(service.document(principal("owner"), propertyId, requestId, "payment-proof")).rejects.toMatchObject({ status: 403, code: "RENTAL_DOCUMENT_ACCESS_DENIED" });
    await expect(service.document(principal("accountant"), propertyId, requestId, "identity")).rejects.toMatchObject({ status: 403, code: "RENTAL_DOCUMENT_ACCESS_DENIED" });
    await expect(service.document(principal("accountant"), propertyId, requestId, "payment-proof")).resolves.toMatchObject({ storageKey: "private/secret.pdf" });
    expect(repo.findDocument).toHaveBeenLastCalledWith({ propertyId, requestId, kind: "payment-proof" });
  });

  it("denies document access before querying when an owner has no scoped owner id", async () => {
    const unscoped = principal("owner");
    unscoped.memberships[0].ownerId = null;
    const repo = repository();
    await expect(createRentalRequestListService(repo).document(unscoped, propertyId, requestId, "identity")).rejects.toMatchObject({ status: 403, code: "OWNER_SCOPE_REQUIRED" });
    expect(repo.findDocument).not.toHaveBeenCalled();
  });

  it("allows accountant, manager, and super admin to view offline verification work", async () => {
    for (const role of ["accountant", "property_manager", "super_admin"] as const) {
      await expect(createRentalRequestListService(repository()).list(principal(role), propertyId)).resolves.toMatchObject({ items: [{ canVerifyOfflinePayment: true }] });
    }
  });

  it("returns an opaque next cursor and forwards a validated cursor", async () => {
    const second = { ...row, id: "88888888-8888-4888-8888-888888888888", sortAt: "2029-12-02T08:00:00.000Z" };
    const repo = repository({ list: vi.fn(async () => [row, second]) });
    const service = createRentalRequestListService(repo);
    const first = await service.list(principal("super_admin"), propertyId, { limit: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toEqual(expect.any(String));
    await service.list(principal("super_admin"), propertyId, { limit: 1, cursor: first.nextCursor! });
    expect(repo.list).toHaveBeenLastCalledWith({
      propertyId, limit: 2,
      cursor: { priority: 0, sortAt: "2029-12-01T08:00:00.000Z", id: requestId },
    });
  });

  it("rejects malformed queue cursors and limits before querying", async () => {
    const repo = repository();
    const service = createRentalRequestListService(repo);
    await expect(service.list(principal("super_admin"), propertyId, { cursor: "broken" })).rejects.toMatchObject({ code: "INVALID_CURSOR" });
    await expect(service.list(principal("super_admin"), propertyId, { limit: 101 })).rejects.toMatchObject({ code: "INVALID_LIMIT" });
    expect(repo.list).not.toHaveBeenCalled();
  });
});
