import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";
import type { SarayaPrincipal } from "../auth/contracts";
import { createRentalService, type RentalRepository } from "./service";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db/client", () => ({ db: state.db }));

const configuredUrl = process.env.DATABASE_URL;
const localUrl = (() => {
  if (!configuredUrl) return null;
  const parsed = new URL(configuredUrl);
  return ["127.0.0.1", "localhost"].includes(parsed.hostname) ? configuredUrl : null;
})();

function scopedMigration(path: string, schemaName: string) {
  return readFileSync(path, "utf8")
    .replace(/^BEGIN;$/gm, "")
    .replace(/^COMMIT;$/gm, "")
    .replace(/^SET LOCAL lock_timeout = '5s';$/gm, "")
    .replaceAll("public.", `"${schemaName}".`)
    .replaceAll('"public".', `"${schemaName}".`);
}

const propertyId = "11111111-1111-4111-8111-111111111111";
const instantUnitId = "22222222-2222-4222-8222-222222222222";
const reviewUnitId = "33333333-3333-4333-8333-333333333333";
const contestedUnitId = "44444444-4444-4444-8444-444444444444";
const documentUnitId = "88888888-8888-4888-8888-888888888888";
const manualUnitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const visibilityUnitId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const fingerprintUnitId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const conflictUnitId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ownerRaceUnitId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const uploadQuotaUnitId = "99999999-9999-4999-8999-999999999999";
const tenantOne = "55555555-5555-4555-8555-555555555555";
const tenantTwo = "66666666-6666-4666-8666-666666666666";
const ownerUserOne = "f1111111-1111-4111-8111-111111111111";
const ownerUserTwo = "f2222222-2222-4222-8222-222222222222";
const ownerOne = "f3333333-3333-4333-8333-333333333333";
const ownerTwo = "f4444444-4444-4444-8444-444444444444";
const documents = new Map<string, string>();

const unitIds = [
  instantUnitId,
  reviewUnitId,
  contestedUnitId,
  documentUnitId,
  manualUnitId,
  visibilityUnitId,
  fingerprintUnitId,
  conflictUnitId,
  ownerRaceUnitId,
  uploadQuotaUnitId,
];

function documentFor(unitId: string, tenantUserId: string) {
  const id = documents.get(`${unitId}:${tenantUserId}`);
  if (!id) throw new Error("fixture document missing");
  return id;
}

function submission(unitId: string, tenantUserId: string, idempotencyKey: string) {
  return {
    propertyId,
    unitId,
    tenantUserId,
    applicantType: "company" as const,
    applicantNameAr: "شركة المستأجر",
    applicantNameEn: "Tenant Company",
    registrationNumber: "CR-100",
    startDate: "2030-01-01",
    endDate: "2030-12-31",
    durationMonths: 12,
    idDocumentId: documentFor(unitId, tenantUserId),
    idempotencyKey,
    rentAmount: "1.000",
    depositAmount: "1.000",
    feeAmount: "1.000",
    currency: "BHD" as const,
    resolvedApprovalMode: "owner_review" as const,
  };
}

function publicSubmission(unitId: string, tenantUserId: string, idempotencyKey: string) {
  const input = submission(unitId, tenantUserId, idempotencyKey);
  return {
    propertyId: input.propertyId,
    unitId: input.unitId,
    applicantType: input.applicantType,
    applicantNameAr: input.applicantNameAr,
    applicantNameEn: input.applicantNameEn,
    registrationNumber: input.registrationNumber,
    startDate: input.startDate,
    endDate: input.endDate,
    durationMonths: input.durationMonths,
    idDocumentId: input.idDocumentId,
    idempotencyKey: input.idempotencyKey,
  };
}

describe.skipIf(!localUrl)("Saraya rental repository against actual migrations", () => {
  let admin: ReturnType<typeof postgres>;
  let database: ReturnType<typeof postgres>;
  let repository: RentalRepository;
  let publicInventoryService: typeof import("../public-inventory/runtime")["publicInventoryService"];
  let applicantDocumentRepository: typeof import("../documents/repository")["documentRepository"];
  const schemaName = `saraya_rental_${randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    database = postgres(localUrl!, {
      max: 8,
      connection: { search_path: `${schemaName},public` },
      onnotice: () => {},
    });
    for (const migration of [
      "drizzle/0062_saraya_core.sql",
      "drizzle/0063_saraya_auth.sql",
      "drizzle/0064_saraya_leases.sql",
      "drizzle/0066_saraya_shared_office_parts.sql",
      "drizzle/0070_saraya_public_catalog.sql",
      "drizzle/0075_saraya_rental_finance.sql",
      "drizzle/0118_saraya_documents.sql",
      "drizzle/0122_saraya_public_rental_checkout.sql",
    ]) {
      await database.unsafe(scopedMigration(migration, schemaName));
    }

    await database`
      INSERT INTO saraya_users(id, normalized_email, display_name_ar, display_name_en)
      VALUES (${tenantOne}, 'tenant-one@example.test', 'مستأجر أول', 'Tenant One'),
             (${tenantTwo}, 'tenant-two@example.test', 'مستأجر ثان', 'Tenant Two'),
             (${ownerUserOne}, 'owner-one@example.test', 'مالك أول', 'Owner One'),
             (${ownerUserTwo}, 'owner-two@example.test', 'مالك ثان', 'Owner Two')
    `;
    await database`
      INSERT INTO saraya_properties(id, code, name_ar, name_en, rental_approval_mode)
      VALUES (${propertyId}, 'TASK5-TEST', 'عقار الاختبار', 'Task 5 Test', 'instant')
    `;
    await database`
      INSERT INTO saraya_owners(id, property_id, user_id, name_ar, name_en)
      VALUES (${ownerOne}, ${propertyId}, ${ownerUserOne}, 'مالك أول', 'Owner One'),
             (${ownerTwo}, ${propertyId}, ${ownerUserTwo}, 'مالك ثان', 'Owner Two')
    `;
    const unitTypeId = randomUUID();
    await database`
      INSERT INTO saraya_unit_types(id, property_id, name_ar, name_en, catalog_kind, default_rent)
      VALUES (${unitTypeId}, ${propertyId}, 'مكتب اختبار', 'Test Office', 'office', '100.000')
    `;
    for (const unitId of unitIds) {
      await database`
        INSERT INTO saraya_units(
          id, property_id, unit_type_id, owner_id, unit_number, display_name_ar, display_name_en,
          description_ar, description_en, image_key, market_rent, is_rentable, is_public_listing,
          rental_approval_override
        ) VALUES (
          ${unitId}, ${propertyId}, ${unitTypeId}, ${ownerOne}, ${unitId.slice(0, 8)},
          'مكتب اختبار', 'Test Office', 'وحدة عامة', 'Public unit', 'office_101',
          '100.000', true, true, ${unitId === instantUnitId ? null : "owner_review"}
        )
      `;
      for (const tenantUserId of [tenantOne, tenantTwo]) {
        const documentId = randomUUID();
        documents.set(`${unitId}:${tenantUserId}`, documentId);
        await database`
          INSERT INTO saraya_documents(
            id, property_id, unit_id, uploaded_by_user_id, category, title, original_name,
            content_type, size_bytes, storage_key, status
          ) VALUES (
            ${documentId}, ${propertyId}, ${unitId}, ${tenantUserId}, 'commercial_registration',
            'Commercial registration', 'cr.pdf', 'application/pdf', 4,
            ${`saraya/${propertyId}/commercial_registration/${documentId}/cr.pdf`}, 'active'
          )
        `;
      }
    }

    state.db = drizzle(database, { schema });
    repository = (await import("./repository")).rentalRepository;
    publicInventoryService = (await import("../public-inventory/runtime")).publicInventoryService;
    applicantDocumentRepository = (await import("../documents/repository")).documentRepository;
  }, 30_000);

  afterAll(async () => {
    await database?.end();
    if (admin) {
      await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`;
      await admin.end();
    }
  });

  it("inherits instant policy and atomically creates one request, invoice, demand, and system audit", async () => {
    const result = await repository.createRequest(submission(instantUnitId, tenantOne, "instant-submit"));
    expect(result).toMatchObject({ status: "approved_awaiting_payment", resolvedApprovalMode: "instant", totalAmount: "100.000" });
    expect(await database`SELECT count(*)::int AS count FROM saraya_rental_requests WHERE unit_id=${instantUnitId}`).toEqual([{ count: 1 }]);
    expect(await database`SELECT count(*)::int AS count FROM saraya_invoices`).toEqual([{ count: 1 }]);
    expect(await database`SELECT count(*)::int AS count FROM saraya_payment_demands`).toEqual([{ count: 1 }]);
    const [request] = await database`SELECT decided_by_user_id, resolved_approval_mode FROM saraya_rental_requests WHERE unit_id=${instantUnitId}`;
    expect(request).toEqual({ decided_by_user_id: null, resolved_approval_mode: "instant" });
    const [audit] = await database`SELECT actor_user_id, after FROM saraya_audit_logs WHERE action='rental_request.approved'`;
    expect(audit).toMatchObject({ actor_user_id: null, after: { actorSource: "system", status: "approved_awaiting_payment" } });

    const replay = await repository.createRequest(submission(instantUnitId, tenantOne, "instant-submit"));
    expect(replay).toMatchObject({ requestId: (result as { requestId: string }).requestId, status: "approved_awaiting_payment" });
    expect(await database`SELECT count(*)::int AS count FROM saraya_invoices`).toEqual([{ count: 1 }]);
  });

  it("honors a unit owner-review override without creating finance records", async () => {
    const result = await repository.createRequest(submission(reviewUnitId, tenantOne, "review-submit"));
    expect(result).toMatchObject({ status: "pending_owner_review", resolvedApprovalMode: "owner_review" });
    expect(await database`SELECT count(*)::int AS count FROM saraya_invoices WHERE rental_request_id=${(result as { id: string }).id}`).toEqual([{ count: 0 }]);
  });

  it("serializes competing applications and preserves the partial unique reservation", async () => {
    const results = await Promise.allSettled([
      repository.createRequest(submission(contestedUnitId, tenantOne, "contest-one")),
      repository.createRequest(submission(contestedUnitId, tenantTwo, "contest-two")),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await database`SELECT count(*)::int AS count FROM saraya_rental_requests WHERE unit_id=${contestedUnitId}`).toEqual([{ count: 1 }]);
  });

  it("rejects a document that is not owned by the authenticated applicant", async () => {
    const input = submission(documentUnitId, tenantOne, "foreign-document");
    input.idDocumentId = documentFor(documentUnitId, tenantTwo);

    await expect(repository.createRequest(input)).rejects.toMatchObject({ status: 422, code: "INVALID_ID_DOCUMENT" });
    expect(await database`SELECT count(*)::int AS count FROM saraya_rental_requests WHERE unit_id=${documentUnitId}`).toEqual([{ count: 0 }]);
  });

  it("reuses the same approval transaction for a manual decision and duplicate retry", async () => {
    const request = await repository.createRequest(submission(manualUnitId, tenantOne, "manual-submit")) as {
      id: string;
      rentAmount: string;
      depositAmount: string;
      feeAmount: string;
      currency: "BHD";
    };
    const approval = {
      propertyId,
      requestId: request.id,
      actorUserId: ownerUserOne,
      actorRole: "owner" as const,
      actorOwnerId: ownerOne,
      idempotencyKey: "manual-approve",
      rentAmount: request.rentAmount,
      depositAmount: request.depositAmount,
      feeAmount: request.feeAmount,
      totalAmount: "100.000",
      currency: request.currency,
    };

    const first = await repository.approveWithInvoice(approval);
    const replay = await repository.approveWithInvoice(approval);

    expect(replay).toEqual(first);
    expect(await database`SELECT count(*)::int AS count FROM saraya_invoices WHERE rental_request_id=${request.id}`).toEqual([{ count: 1 }]);
    const [audit] = await database`SELECT actor_user_id, after FROM saraya_audit_logs WHERE action='rental_request.approved' AND entity_id=${request.id}`;
    expect(audit).toMatchObject({ actor_user_id: ownerUserOne, after: { actorSource: "user" } });
  });

  it("hides active rental reservations from public list and detail while submit remains serialized", async () => {
    await expect(publicInventoryService.detail(visibilityUnitId)).resolves.toMatchObject({ id: visibilityUnitId });
    await expect(applicantDocumentRepository.resolvePublicApplicantUnit(visibilityUnitId)).resolves.toEqual({ propertyId, unitId: visibilityUnitId });
    await repository.createRequest(submission(visibilityUnitId, tenantOne, "visibility-submit"));

    await expect(publicInventoryService.detail(visibilityUnitId)).rejects.toMatchObject({ status: 404, code: "PUBLIC_UNIT_NOT_FOUND" });
    await expect(applicantDocumentRepository.resolvePublicApplicantUnit(visibilityUnitId)).resolves.toBeNull();
    const page = await publicInventoryService.list(50);
    expect(page.items.map((item) => item.id)).not.toContain(visibilityUnitId);
  });

  it("returns 409 when the same idempotency key is reused with a different canonical payload", async () => {
    const principal: SarayaPrincipal = { userId: tenantOne, sessionId: "tenant-session", propertyIds: [], memberships: [] };
    const service = createRentalService(repository);
    const first = publicSubmission(fingerprintUnitId, tenantOne, "fingerprint-submit");
    const created = await service.submit(principal, first);

    await expect(service.submit(principal, {
      ...first,
      propertyId: first.propertyId.toUpperCase(),
      unitId: first.unitId.toUpperCase(),
      idDocumentId: first.idDocumentId.toUpperCase(),
    })).resolves.toMatchObject({ id: (created as { id: string }).id });

    await expect(service.submit(principal, { ...first, applicantNameEn: "Different Company" })).rejects.toMatchObject({
      status: 409,
      code: "IDEMPOTENCY_KEY_REUSED",
    });
  });

  it("returns ApiError 409 for concurrent conflicting approve and reject decisions", async () => {
    const request = await repository.createRequest(submission(conflictUnitId, tenantOne, "conflict-submit")) as {
      id: string;
      rentAmount: string;
      depositAmount: string;
      feeAmount: string;
      currency: "BHD";
    };
    const results = await Promise.allSettled([
      repository.approveWithInvoice({
        propertyId,
        requestId: request.id,
        actorUserId: ownerUserOne,
        actorRole: "owner",
        actorOwnerId: ownerOne,
        idempotencyKey: "conflict-approve",
        rentAmount: request.rentAmount,
        depositAmount: request.depositAmount,
        feeAmount: request.feeAmount,
        totalAmount: "100.000",
        currency: request.currency,
      }),
      repository.reject({
        propertyId,
        requestId: request.id,
        actorUserId: ownerUserOne,
        actorRole: "owner",
        actorOwnerId: ownerOne,
        idempotencyKey: "conflict-reject",
        reason: "Rejected concurrently",
      }),
    ]);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({ status: "rejected", reason: { status: 409, code: "RENTAL_REQUEST_ALREADY_DECIDED" } });
  });

  it("rechecks owner authorization under the decision lock after reassignment", async () => {
    const request = await repository.createRequest(submission(ownerRaceUnitId, tenantOne, "owner-race-submit")) as {
      id: string;
      rentAmount: string;
      depositAmount: string;
      feeAmount: string;
      currency: "BHD";
    };
    const staleRepository: RentalRepository = {
      ...repository,
      async getForDecision(property, requestId) {
        const stale = await repository.getForDecision(property, requestId);
        await database`UPDATE saraya_units SET owner_id=${ownerTwo} WHERE id=${ownerRaceUnitId}`;
        return stale;
      },
    };
    const oldOwner: SarayaPrincipal = {
      userId: ownerUserOne,
      sessionId: "owner-session",
      propertyIds: [propertyId],
      memberships: [{ propertyId, role: "owner", ownerId: ownerOne }],
    };

    await expect(createRentalService(staleRepository).decide(oldOwner, propertyId, request.id, {
      type: "approve",
      idempotencyKey: "stale-owner-approve",
    })).rejects.toMatchObject({ status: 404, code: "RENTAL_REQUEST_NOT_FOUND" });
    expect(await database`SELECT status FROM saraya_rental_requests WHERE id=${request.id}`).toEqual([{ status: "pending_owner_review" }]);

    await expect(repository.approveWithInvoice({
      propertyId,
      requestId: request.id,
      actorUserId: ownerUserOne,
      actorRole: "super_admin",
      actorOwnerId: null,
      idempotencyKey: "super-admin-after-reassignment",
      rentAmount: request.rentAmount,
      depositAmount: request.depositAmount,
      feeAmount: request.feeAmount,
      totalAmount: "100.000",
      currency: request.currency,
    })).resolves.toMatchObject({ status: "approved_awaiting_payment" });
  });

  it("atomically caps concurrent applicant upload attempts per authenticated user and unit", async () => {
    const quotaRepository = applicantDocumentRepository as unknown as {
      reserveApplicantUpload(input: { actorUserId: string; unitId: string; ip: string; now: Date }): Promise<unknown>;
    };
    const [before] = await database`SELECT count(*)::int AS count FROM saraya_documents WHERE unit_id=${uploadQuotaUnitId}`;
    const results = await Promise.allSettled(Array.from({ length: 7 }, () => quotaRepository.reserveApplicantUpload({
      actorUserId: tenantOne,
      unitId: uploadQuotaUnitId,
      ip: "203.0.113.20",
      now: new Date("2030-01-01T00:00:00.000Z"),
    })));

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(2);
    for (const result of results.filter((item) => item.status === "rejected")) {
      expect(result).toMatchObject({ reason: { status: 429, code: "APPLICANT_UPLOAD_RATE_LIMITED" } });
    }
    expect(await database`SELECT count(*)::int AS count FROM saraya_documents WHERE unit_id=${uploadQuotaUnitId}`).toEqual([before]);

    const sharedIpResults = await Promise.allSettled(Array.from({ length: 21 }, () => quotaRepository.reserveApplicantUpload({
      actorUserId: randomUUID(),
      unitId: uploadQuotaUnitId,
      ip: "203.0.113.21",
      now: new Date("2030-01-01T00:00:00.000Z"),
    })));
    expect(sharedIpResults.filter((result) => result.status === "fulfilled")).toHaveLength(20);
    expect(sharedIpResults.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});
