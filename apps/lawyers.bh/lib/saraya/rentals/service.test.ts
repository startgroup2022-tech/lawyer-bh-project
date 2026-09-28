import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createRentalService, type RentalRepository } from "./service";

const PROPERTY = "11111111-1111-4111-8111-111111111111";
const UNIT = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const OWNER = "44444444-4444-4444-8444-444444444444";
const REQUEST = "55555555-5555-4555-8555-555555555555";
const DOCUMENT = "66666666-6666-4666-8666-666666666666";

const tenant: SarayaPrincipal = { userId: USER, sessionId: "s", propertyIds: [], memberships: [] };
const owner: SarayaPrincipal = {
  userId: USER,
  sessionId: "s",
  propertyIds: [PROPERTY],
  memberships: [{ propertyId: PROPERTY, role: "owner", ownerId: OWNER }],
};

const repository = (overrides: Partial<RentalRepository> = {}): RentalRepository => ({
  findByIdempotency: async () => null,
  getAvailableUnit: async () => ({ id: UNIT, propertyId: PROPERTY, ownerId: OWNER, rentAmount: "100.000", depositAmount: "50.000", feeAmount: "5.000", currency: "BHD", isRentable: true, status: "vacant", propertyApprovalMode: "owner_review", unitApprovalOverride: null }),
  createRequest: async (input) => ({ id: REQUEST, status: "pending_owner_review", ...input }),
  getForDecision: async () => ({ id: REQUEST, propertyId: PROPERTY, unitId: UNIT, tenantUserId: USER, ownerId: OWNER, status: "pending_owner_review", rentAmount: "100.000", depositAmount: "50.000", feeAmount: "5.000", currency: "BHD" }),
  approveWithInvoice: async (input) => ({ requestId: input.requestId, status: "approved_awaiting_payment", invoiceId: "invoice-1", paymentDemandId: "demand-1", totalAmount: input.totalAmount, currency: input.currency }),
  reject: async (input) => ({ requestId: input.requestId, status: "rejected", reason: input.reason }),
  ...overrides,
});

const validInput = {
  propertyId: PROPERTY,
  unitId: UNIT,
  applicantType: "company" as const,
  applicantNameAr: "شركة المستأجر",
  applicantNameEn: "Tenant Company",
  registrationNumber: "CR-100",
  startDate: "2026-10-01",
  endDate: "2027-09-30",
  durationMonths: 12,
  idDocumentId: DOCUMENT,
  idempotencyKey: "rent-request-001",
};

describe("Saraya rental request service", () => {
  it("inherits instant approval from the property and snapshots the resolved policy", async () => {
    let captured: Record<string, unknown> | undefined;
    const offer = {
      id: UNIT,
      propertyId: PROPERTY,
      ownerId: OWNER,
      rentAmount: "100.000",
      depositAmount: "50.000",
      feeAmount: "5.000",
      currency: "BHD" as const,
      isRentable: true,
      status: "vacant",
      propertyApprovalMode: "instant" as const,
      unitApprovalOverride: null,
    };
    const service = createRentalService(repository({
      getAvailableUnit: async () => offer,
      createRequest: async (input) => {
        captured = input as unknown as Record<string, unknown>;
        return { status: captured.resolvedApprovalMode === "instant" ? "approved_awaiting_payment" : "pending_owner_review" };
      },
    }));

    await expect(service.submit(tenant, validInput)).resolves.toMatchObject({
      status: "approved_awaiting_payment",
    });
    expect(captured).toMatchObject({
      resolvedApprovalMode: "instant",
      applicantType: "company",
      applicantNameAr: "شركة المستأجر",
      applicantNameEn: "Tenant Company",
      registrationNumber: "CR-100",
    });
  });

  it("lets a unit override instant property approval with owner review", async () => {
    let captured: Record<string, unknown> | undefined;
    const service = createRentalService(repository({
      getAvailableUnit: async () => ({
        id: UNIT,
        propertyId: PROPERTY,
        ownerId: OWNER,
        rentAmount: "100.000",
        depositAmount: "50.000",
        feeAmount: "5.000",
        currency: "BHD",
        isRentable: true,
        status: "vacant",
        propertyApprovalMode: "instant",
        unitApprovalOverride: "owner_review",
      } as never),
      createRequest: async (input) => {
        captured = input as unknown as Record<string, unknown>;
        return { status: "pending_owner_review" };
      },
    }));

    await expect(service.submit(tenant, validInput)).resolves.toMatchObject({
      status: "pending_owner_review",
    });
    expect(captured).toMatchObject({ resolvedApprovalMode: "owner_review" });
  });

  it("allows an authenticated user without property membership to submit for a vacant unit", async () => {
    const result = await createRentalService(repository()).submit(tenant, validInput);
    expect(result).toMatchObject({ status: "pending_owner_review", tenantUserId: USER, propertyId: PROPERTY, unitId: UNIT, rentAmount: "100.000" });
  });

  it("returns the original request when the tenant retries the same command", async () => {
    let created = false;
    const existing = { id: REQUEST, status: "pending_owner_review" as const, tenantUserId: USER, propertyId: PROPERTY, unitId: UNIT };
    const result = await createRentalService(repository({ findByIdempotency: async () => existing, createRequest: async () => { created = true; return existing; } })).submit(tenant, validInput);
    expect(result).toMatchObject({ ...existing, requestId: REQUEST, timeline: [] });
    expect(created).toBe(false);
  });

  it("rejects unavailable units before creating a request", async () => {
    let created = false;
    const service = createRentalService(repository({ getAvailableUnit: async () => null, createRequest: async (input) => { created = true; return input; } }));
    await expect(service.submit(tenant, validInput)).rejects.toMatchObject({ status: 409, code: "UNIT_NOT_AVAILABLE" });
    expect(created).toBe(false);
  });

  it("prevents an owner from deciding a request for another owner", async () => {
    const otherOwner = "77777777-7777-4777-8777-777777777777";
    const service = createRentalService(repository({ getForDecision: async () => ({ id: REQUEST, propertyId: PROPERTY, unitId: UNIT, tenantUserId: USER, ownerId: otherOwner, status: "pending_owner_review", rentAmount: "100.000", depositAmount: "0.000", feeAmount: "0.000", currency: "BHD" }) }));
    await expect(service.decide(owner, PROPERTY, REQUEST, { type: "approve", idempotencyKey: "approve-1" })).rejects.toMatchObject({ status: 404, code: "RENTAL_REQUEST_NOT_FOUND" });
  });

  it("approves atomically with one invoice and payment demand without activating the lease", async () => {
    let captured: Parameters<RentalRepository["approveWithInvoice"]>[0] | undefined;
    const result = await createRentalService(repository({ approveWithInvoice: async (input) => { captured = input; return { requestId: input.requestId, status: "approved_awaiting_payment", invoiceId: "invoice-1", paymentDemandId: "demand-1", totalAmount: input.totalAmount, currency: input.currency }; } })).decide(owner, PROPERTY, REQUEST, { type: "approve", idempotencyKey: "approve-1" });
    expect(result).toMatchObject({ status: "approved_awaiting_payment", totalAmount: "155.000", currency: "BHD" });
    expect(captured).toMatchObject({ requestId: REQUEST, actorUserId: USER, totalAmount: "155.000" });
    expect(captured).not.toHaveProperty("leaseStatus");
  });

  it("stores a trimmed rejection reason", async () => {
    const result = await createRentalService(repository()).decide(owner, PROPERTY, REQUEST, { type: "reject", reason: "  البيانات ناقصة  ", idempotencyKey: "reject-1" });
    expect(result).toEqual({ requestId: REQUEST, status: "rejected", reason: "البيانات ناقصة" });
  });

  it("requires a rejection reason", async () => {
    await expect(createRentalService(repository()).decide(
      owner,
      PROPERTY,
      REQUEST,
      { type: "reject", reason: "   ", idempotencyKey: "reject-empty" },
    )).rejects.toMatchObject({ status: 422, code: "REJECTION_REASON_REQUIRED" });
  });

  it("keeps property managers view-only for rental decisions", async () => {
    const manager: SarayaPrincipal = {
      userId: USER,
      sessionId: "s",
      propertyIds: [PROPERTY],
      memberships: [{ propertyId: PROPERTY, role: "property_manager" }],
    };
    await expect(createRentalService(repository()).decide(
      manager,
      PROPERTY,
      REQUEST,
      { type: "approve", idempotencyKey: "manager-approve" },
    )).rejects.toMatchObject({ status: 403, code: "RENTAL_DECISION_DENIED" });
  });

  it("delegates a repeated rejection to the locked idempotent transaction", async () => {
    let rejectionCalls = 0;
    const result = await createRentalService(repository({
      getForDecision: async () => ({
        id: REQUEST,
        propertyId: PROPERTY,
        unitId: UNIT,
        tenantUserId: USER,
        ownerId: OWNER,
        status: "rejected",
        rentAmount: "100.000",
        depositAmount: "50.000",
        feeAmount: "5.000",
        currency: "BHD",
        decisionReason: "البيانات ناقصة",
      } as never),
      reject: async () => {
        rejectionCalls += 1;
        return { requestId: REQUEST, status: "rejected", reason: "البيانات ناقصة" };
      },
    })).decide(owner, PROPERTY, REQUEST, {
      type: "reject",
      reason: "البيانات ناقصة",
      idempotencyKey: "reject-replay",
    });

    expect(result).toEqual({
      requestId: REQUEST,
      status: "rejected",
      reason: "البيانات ناقصة",
    });
    expect(rejectionCalls).toBe(1);
  });

  it("delegates a repeated approval to the locked idempotent transaction", async () => {
    let approvalCalls = 0;
    const existing = {
      requestId: REQUEST,
      status: "approved_awaiting_payment" as const,
      invoiceId: "invoice-1",
      paymentDemandId: "demand-1",
      totalAmount: "155.000",
      currency: "BHD" as const,
    };
    const result = await createRentalService(repository({
      getForDecision: async () => ({
        id: REQUEST,
        propertyId: PROPERTY,
        unitId: UNIT,
        tenantUserId: USER,
        ownerId: OWNER,
        status: "approved_awaiting_payment",
        rentAmount: "100.000",
        depositAmount: "50.000",
        feeAmount: "5.000",
        currency: "BHD",
      }),
      approveWithInvoice: async () => {
        approvalCalls += 1;
        return existing;
      },
    })).decide(owner, PROPERTY, REQUEST, {
      type: "approve",
      idempotencyKey: "approve-replay",
    });

    expect(result).toBe(existing);
    expect(approvalCalls).toBe(1);
  });
});
