import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";

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

describe.skipIf(!localUrl)("Task 9 queue against actual migrations", () => {
  const schemaName = `saraya_task9_${randomUUID().replaceAll("-", "")}`;
  const propertyId = randomUUID();
  const ownerId = randomUUID();
  const ownerUserId = randomUUID();
  const tenantId = randomUUID();
  const unitId = randomUUID();
  const verificationUnitId = randomUUID();
  const completedUnitId = randomUUID();
  const requestId = randomUUID();
  const documentId = randomUUID();
  const proofDocumentId = randomUUID();
  const proofId = randomUUID();
  const demandId = randomUUID();
  const verificationRequestId = randomUUID();
  const completedRequestId = randomUUID();
  const verificationDemandId = randomUUID();
  let admin: ReturnType<typeof postgres>;
  let database: ReturnType<typeof postgres>;
  let service: ReturnType<(typeof import("./request-list-service"))["createRentalRequestListService"]>;
  let management: ReturnType<(typeof import("../property-management/service"))["createPropertyManagementService"]>;

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    database = postgres(localUrl!, { max: 2, connection: { search_path: `${schemaName},public` }, onnotice: () => {} });
    for (const migration of ["0062_saraya_core", "0063_saraya_auth", "0064_saraya_leases", "0066_saraya_shared_office_parts", "0070_saraya_public_catalog", "0075_saraya_rental_finance", "0118_saraya_documents", "0122_saraya_public_rental_checkout", "0123_saraya_public_onboarding_audit", "0124_saraya_rental_payments", "0125_saraya_payment_hardening", "0126_saraya_offline_payment_reference", "0127_saraya_lease_checkout_signing", "0128_saraya_applicant_document_idempotency"]) {
      await database.unsafe(scopedMigration(`drizzle/${migration}.sql`, schemaName));
    }
    state.db = drizzle(database, { schema });
    const { rentalRequestListRepository } = await import("./request-list-repository");
    const { createRentalRequestListService } = await import("./request-list-service");
    service = createRentalRequestListService(rentalRequestListRepository);
    const { propertyManagementRepository } = await import("../property-management/repository");
    const { createPropertyManagementService } = await import("../property-management/service");
    management = createPropertyManagementService(propertyManagementRepository);

    const unitTypeId = randomUUID();
    const invoiceId = randomUUID();
    const verificationInvoiceId = randomUUID();
    await database`INSERT INTO saraya_users(id,normalized_email,display_name_ar,display_name_en) VALUES (${ownerUserId},'owner@task9.test','المالك','Owner'),(${tenantId},'tenant@task9.test','المستأجر','Tenant')`;
    await database`INSERT INTO saraya_properties(id,code,name_ar,name_en,rental_approval_mode) VALUES (${propertyId},'T9','عقار','Property','owner_review')`;
    await database`INSERT INTO saraya_owners(id,property_id,user_id,name_ar,name_en) VALUES (${ownerId},${propertyId},${ownerUserId},'المالك','Owner')`;
    await database`INSERT INTO saraya_unit_types(id,property_id,name_ar,name_en) VALUES (${unitTypeId},${propertyId},'مكتب','Office')`;
    await database`INSERT INTO saraya_units(id,property_id,unit_type_id,owner_id,unit_number,status,rental_approval_override) VALUES (${unitId},${propertyId},${unitTypeId},${ownerId},'A-01','vacant',NULL),(${verificationUnitId},${propertyId},${unitTypeId},${ownerId},'A-02','vacant',NULL),(${completedUnitId},${propertyId},${unitTypeId},${ownerId},'A-03','vacant',NULL)`;
    await database`INSERT INTO saraya_documents(id,property_id,unit_id,uploaded_by_user_id,category,title,original_name,content_type,size_bytes,storage_key,status) VALUES (${documentId},${propertyId},${unitId},${tenantId},'identity','Identity','identity.pdf','application/pdf',4,'private/task9/identity.pdf','active'),(${proofDocumentId},${propertyId},${unitId},${tenantId},'receipt','Payment proof','proof.pdf','application/pdf',4,'private/task9/proof.pdf','active')`;
    await database`INSERT INTO saraya_rental_requests(id,property_id,unit_id,tenant_user_id,status,start_date,end_date,duration_months,rent_amount,deposit_amount,fee_amount,id_document_id,idempotency_key,resolved_approval_mode,applicant_type,applicant_name_ar,applicant_name_en,created_at,updated_at) VALUES (${requestId},${propertyId},${unitId},${tenantId},'pending_owner_review','2030-01-01','2030-12-31',12,'500.000','500.000','10.000',${documentId},'task9-request','owner_review','individual','المستأجر','Tenant','2029-12-01T08:00:00Z','2029-12-01T08:00:00Z'),(${verificationRequestId},${propertyId},${verificationUnitId},${tenantId},'approved_awaiting_payment','2031-01-01','2031-12-31',12,'600.000','600.000','10.000',${documentId},'task9-verification','owner_review','individual','المستأجر','Tenant','2029-11-01T08:00:00Z','2029-11-01T08:00:00Z'),(${completedRequestId},${propertyId},${completedUnitId},${tenantId},'rejected','2032-01-01','2032-12-31',12,'700.000','700.000','10.000',${documentId},'task9-completed','owner_review','individual','المستأجر','Tenant','2029-10-01T08:00:00Z','2029-10-01T08:00:00Z')`;
    await database`INSERT INTO saraya_invoices(id,property_id,rental_request_id,tenant_user_id,status,number,issue_date,due_date,subtotal_amount,total_amount,currency) VALUES (${invoiceId},${propertyId},${requestId},${tenantId},'due','T9-1','2029-12-01','2029-12-15','1010.000','1010.000','BHD'),(${verificationInvoiceId},${propertyId},${verificationRequestId},${tenantId},'due','T9-2','2029-11-01','2029-11-15','1210.000','1210.000','BHD')`;
    await database`INSERT INTO saraya_payment_demands(id,property_id,invoice_id,rental_request_id,status,amount,currency,idempotency_key,provider,receipt_document_id,updated_at) VALUES (${demandId},${propertyId},${invoiceId},${requestId},'verification_pending','1010.000','BHD','task9-demand','offline',${proofDocumentId},'2029-12-02T08:00:00Z'),(${verificationDemandId},${propertyId},${verificationInvoiceId},${verificationRequestId},'verification_pending','1210.000','BHD','task9-verification-demand','offline',${proofDocumentId},'2029-11-02T08:00:00Z')`;
    await database`INSERT INTO saraya_payment_proofs(id,property_id,payment_demand_id,rental_request_id,document_id,submitted_by_user_id,reference,status) VALUES (${proofId},${propertyId},${demandId},${requestId},${proofDocumentId},${tenantId},'BANK-1','verification_pending')`;
    await database`INSERT INTO saraya_audit_logs(property_id,action,entity_type,entity_id,after,created_at) VALUES (${propertyId},'rental_request.created','rental_request',${requestId},'{}','2029-12-01T08:00:00Z'),(${propertyId},'offline_proof.submitted','payment_demand',${demandId},'{}','2029-12-02T08:00:00Z')`;
  });

  afterAll(async () => {
    await database?.end();
    if (admin) { await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`; await admin.end(); }
  });

  it("returns resolved policy, safe fields, property scope, and chronological events", async () => {
    const principal = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner" as const, ownerId }] };
    const result = await service.list(principal, propertyId);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ unitNumber: "A-01", resolvedApprovalMode: "owner_review", paymentState: "verification_pending", identityDocumentPresent: true, paymentProofPresent: true, canApprove: true, canDownloadIdentityDocument: true, canDownloadPaymentProof: false });
    expect(result.items[0].timeline.map((event) => event.event)).toEqual(["rental_request.created", "offline_proof.submitted"]);
    expect(result.items[0]).not.toHaveProperty("documentId");
    expect(JSON.stringify(result)).not.toContain("private/task9");
  });

  it("paginates pending owner review, then payment verification, before completed requests", async () => {
    const principal = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "super_admin" as const }] };
    const first = await service.list(principal, propertyId, { limit: 1 });
    const second = await service.list(principal, propertyId, { limit: 1, cursor: first.nextCursor! });
    const third = await service.list(principal, propertyId, { limit: 1, cursor: second.nextCursor! });
    expect([first.items[0].id, second.items[0].id, third.items[0].id]).toEqual([requestId, verificationRequestId, completedRequestId]);
    expect(third.nextCursor).toBeNull();
  });

  it("separates identity from payment-proof access against real rows", async () => {
    const ownerPrincipal = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner" as const, ownerId }] };
    const accountant = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "accountant" as const }] };
    await expect(service.document(ownerPrincipal, propertyId, requestId, "identity")).resolves.toMatchObject({ storageKey: "private/task9/identity.pdf" });
    await expect(service.document(ownerPrincipal, propertyId, requestId, "payment-proof")).rejects.toMatchObject({ status: 403 });
    await expect(service.document(accountant, propertyId, requestId, "identity")).rejects.toMatchObject({ status: 403 });
    await expect(service.document(accountant, propertyId, requestId, "payment-proof")).resolves.toMatchObject({ storageKey: "private/task9/proof.pdf" });
  });

  it("checks current locked ownership before an owner document download", async () => {
    const otherOwnerId = randomUUID();
    await database`INSERT INTO saraya_owners(id,property_id,name_ar,name_en) VALUES (${otherOwnerId},${propertyId},'مالك آخر','Other owner')`;
    const ownerPrincipal = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner" as const, ownerId }] };
    let release!: () => void;
    let started!: () => void;
    const releasePromise = new Promise<void>((resolve) => { release = resolve; });
    const startedPromise = new Promise<void>((resolve) => { started = resolve; });
    const reassignment = database.begin(async (tx) => {
      await tx`UPDATE saraya_units SET owner_id=${otherOwnerId} WHERE id=${unitId}`;
      started();
      await releasePromise;
    });
    await startedPromise;
    const download = service.document(ownerPrincipal, propertyId, requestId, "identity");
    release();
    await reassignment;
    await expect(download).rejects.toMatchObject({ status: 404, code: "RENTAL_DOCUMENT_NOT_FOUND" });
    await database`UPDATE saraya_units SET owner_id=${ownerId} WHERE id=${unitId}`;
  });

  it("atomically rejects an owner update after concurrent reassignment", async () => {
    const otherOwnerId = randomUUID();
    await database`INSERT INTO saraya_owners(id,property_id,name_ar,name_en) VALUES (${otherOwnerId},${propertyId},'مالك سباق','Race owner')`;
    const ownerPrincipal = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner" as const, ownerId }] };
    let release!: () => void;
    let started!: () => void;
    const releasePromise = new Promise<void>((resolve) => { release = resolve; });
    const startedPromise = new Promise<void>((resolve) => { started = resolve; });
    const reassignment = database.begin(async (tx) => {
      await tx`UPDATE saraya_units SET owner_id=${otherOwnerId} WHERE id=${unitId}`;
      started();
      await releasePromise;
    });
    await startedPromise;
    const update = management.update(ownerPrincipal, "units", propertyId, unitId, { rentalApprovalOverride: "instant" });
    release();
    await reassignment;
    await expect(update).rejects.toMatchObject({ status: 409, code: "UNIT_OWNER_CHANGED" });
    await expect(database`SELECT owner_id,rental_approval_override FROM saraya_units WHERE id=${unitId}`).resolves.toEqual([{ owner_id: otherOwnerId, rental_approval_override: null }]);
    await database`UPDATE saraya_units SET owner_id=${ownerId} WHERE id=${unitId}`;
  });

  it("persists property defaults and nullable unit overrides with a resolved list policy", async () => {
    const principal = { userId: ownerUserId, sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "super_admin" as const }] };
    await management.update(principal, "properties", propertyId, propertyId, { rentalApprovalMode: "instant" });
    await management.update(principal, "units", propertyId, unitId, { rentalApprovalOverride: null });
    const units = await management.list(principal, "units", propertyId, {}) as { items: Array<{ id: string; resolvedRentalApprovalMode: string }> };
    expect(units.items.find((unit) => unit.id === unitId)).toMatchObject({ resolvedRentalApprovalMode: "instant" });
  });
});
