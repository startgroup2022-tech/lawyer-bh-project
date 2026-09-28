import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";
import type { SarayaPrincipal } from "../auth/contracts";

const state = vi.hoisted(() => ({ db: null as unknown, files: new Map<string, Uint8Array>(), failPuts: 0 }));
vi.mock("@/lib/db/client", () => ({ db: state.db }));
vi.mock("../documents/storage", () => ({ documentStorage: {
  async put(input: { key: string; body: Uint8Array; allowOverwrite?: boolean }) { if (state.failPuts-- > 0) throw new Error("storage down"); if (state.files.has(input.key) && !input.allowOverwrite) throw new Error("duplicate"); state.files.set(input.key, input.body); },
  async delete(key: string) { state.files.delete(key); },
  async signedReadUrl(key: string) { return `https://private.test/${encodeURIComponent(key)}`; },
}, readDocumentBytes: async (key: string) => state.files.get(key) ?? new Uint8Array() }));

const configuredUrl = process.env.DATABASE_URL;
const localUrl = configuredUrl && ["127.0.0.1", "localhost"].includes(new URL(configuredUrl).hostname) ? configuredUrl : null;
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });
const scopedMigration = (path: string, schemaName: string) => readFileSync(path, "utf8").replace(/^BEGIN;$/gm, "").replace(/^COMMIT;$/gm, "").replace(/^SET LOCAL lock_timeout = '5s';$/gm, "").replace(/^CREATE EXTENSION .*;$/gm, "").replaceAll("citext", "text").replaceAll("public.", `"${schemaName}".`).replaceAll('"public".', `"${schemaName}".`);

describe.skipIf(!localUrl)("lease checkout against current PostgreSQL migrations", () => {
  let admin: ReturnType<typeof postgres>;
  let database: ReturnType<typeof postgres>;
  const schemaName = `saraya_lease_${randomUUID().replaceAll("-", "")}`;
  const propertyId = randomUUID(), unitId = randomUUID(), tenantId = randomUUID(), ownerUserId = randomUUID(), ownerId = randomUUID(), nextOwnerUserId = randomUUID(), nextOwnerId = randomUUID(), tenantOrganizationId = randomUUID(), requestId = randomUUID(), invoiceId = randomUUID(), demandId = randomUUID(), identityId = randomUUID();

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    database = postgres(localUrl!, { max: 8, connection: { search_path: `${schemaName},public` }, onnotice: () => {} });
    for (const migration of ["0062_saraya_core", "0063_saraya_auth", "0064_saraya_leases", "0066_saraya_shared_office_parts", "0070_saraya_public_catalog", "0075_saraya_rental_finance", "0118_saraya_documents", "0122_saraya_public_rental_checkout", "0124_saraya_rental_payments", "0125_saraya_payment_hardening", "0126_saraya_offline_payment_reference", "0127_saraya_lease_checkout_signing"]) {
      await database.unsafe(scopedMigration(`drizzle/${migration}.sql`, schemaName));
    }
    state.db = drizzle(database, { schema });
    await database`INSERT INTO saraya_users(id,normalized_email,display_name_ar,display_name_en) VALUES (${tenantId},'tenant@lease.test','المستأجر','Tenant'),(${ownerUserId},'owner@lease.test','المالك','Owner'),(${nextOwnerUserId},'next-owner@lease.test','المالك الجديد','Next Owner')`;
    await database`INSERT INTO saraya_properties(id,code,name_ar,name_en) VALUES (${propertyId},'LEASE','سرايا سكوير','Saraya Square')`;
    await database`INSERT INTO saraya_owners(id,property_id,user_id,name_ar,name_en) VALUES (${ownerId},${propertyId},${ownerUserId},'المالك','Owner'),(${nextOwnerId},${propertyId},${nextOwnerUserId},'المالك الجديد','Next Owner')`;
    await database`INSERT INTO saraya_property_memberships(property_id,user_id,role) VALUES (${propertyId},${ownerUserId},'owner'),(${propertyId},${nextOwnerUserId},'owner')`;
    await database`INSERT INTO saraya_tenant_organizations(id,property_id,name_ar,name_en,registration_number) VALUES (${tenantOrganizationId},${propertyId},'شركة المستأجر','Tenant Company','CR 100')`;
    await database`INSERT INTO saraya_contacts(property_id,tenant_organization_id,user_id,name,email,is_primary) VALUES (${propertyId},${tenantOrganizationId},${tenantId},'Tenant','tenant@lease.test',true)`;
    const typeId = randomUUID();
    await database`INSERT INTO saraya_unit_types(id,property_id,name_ar,name_en) VALUES (${typeId},${propertyId},'مكتب','Office')`;
    await database`INSERT INTO saraya_units(id,property_id,unit_type_id,owner_id,unit_number,status) VALUES (${unitId},${propertyId},${typeId},${ownerId},'101','vacant')`;
    await database`INSERT INTO saraya_documents(id,property_id,unit_id,uploaded_by_user_id,category,title,original_name,content_type,size_bytes,storage_key) VALUES (${identityId},${propertyId},${unitId},${tenantId},'identity','ID','id.pdf','application/pdf',4,'private/id')`;
    await database`INSERT INTO saraya_rental_requests(id,property_id,unit_id,tenant_user_id,status,start_date,end_date,duration_months,rent_amount,deposit_amount,fee_amount,id_document_id,idempotency_key,resolved_approval_mode,applicant_type,applicant_name_ar,applicant_name_en,registration_number,decided_by_user_id,decided_at) VALUES (${requestId},${propertyId},${unitId},${tenantId},'paid_awaiting_signature','2030-01-01','2030-12-31',12,'500.000','500.000','10.000',${identityId},'lease-request','owner_review','company','شركة المستأجر','Tenant Company',' cr100 ',${ownerUserId},now())`;
    await database`INSERT INTO saraya_invoices(id,property_id,rental_request_id,tenant_user_id,status,number,issue_date,due_date,subtotal_amount,total_amount,paid_amount) VALUES (${invoiceId},${propertyId},${requestId},${tenantId},'paid','INV-L',CURRENT_DATE,CURRENT_DATE,'1010.000','1010.000','1010.000')`;
    await database`INSERT INTO saraya_payment_demands(id,property_id,invoice_id,rental_request_id,status,amount,idempotency_key,provider,provider_reference,verified_at) VALUES (${demandId},${propertyId},${invoiceId},${requestId},'paid','1010.000','lease-demand','tap','chg_verified',now())`;
  });

  afterAll(async () => { if (admin) { await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`; await admin.end(); } if (database) await database.end(); });

  it("creates one package under concurrent retries and atomically activates after both signatures", async () => {
    const { leaseCheckoutService } = await import("./checkout-runtime");
    const [one, two] = await Promise.all([leaseCheckoutService.createForPaidRequest(propertyId, requestId), leaseCheckoutService.createForPaidRequest(propertyId, requestId)]);
    expect(two.leaseId).toBe(one.leaseId);
    expect(await database`SELECT count(*)::int AS count FROM saraya_lease_packages WHERE rental_request_id=${requestId}`).toEqual([{ count: 1 }]);
    expect(await database`SELECT count(*)::int AS count FROM saraya_lease_signature_requests WHERE lease_id=${one.leaseId}`).toEqual([{ count: 2 }]);
    expect(await database`SELECT tenant_organization_id FROM saraya_rental_requests WHERE id=${requestId}`).toEqual([{ tenant_organization_id: tenantOrganizationId }]);

    const { leaseSignatureService } = await import("./signature-runtime");
    const tenant: SarayaPrincipal = { userId: tenantId, sessionId: "tenant", propertyIds: [], memberships: [] };
    const owner: SarayaPrincipal = { userId: ownerUserId, sessionId: "owner", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner", ownerId }] };
    expect(await leaseSignatureService.sign(tenant, one.leaseId, { acceptedName: "Tenant", checksum: one.checksum, ip: "10.1.2.3", userAgent: "test" })).toMatchObject({ status: "pending" });
    const { leaseSignatureRepository } = await import("./signature-repository");
    const prepared = await leaseSignatureRepository.accept({ principal: owner, leaseId: one.leaseId, acceptedName: "Owner", checksum: one.checksum, evidenceDigest: "e".repeat(64), ipAddress: "2001:db8::/64", userAgent: "test" });
    expect(prepared.kind).toBe("prepare");
    await database`UPDATE saraya_units SET owner_id=${nextOwnerId} WHERE id=${unitId}`;
    await expect(leaseSignatureRepository.complete({ ...(prepared as Extract<typeof prepared, { kind: "prepare" }>), principal: owner, documentId: randomUUID(), storageKey: "private/reassigned.pdf", documentChecksum: "f".repeat(64), sizeBytes: 10 })).rejects.toMatchObject({ code: "LEASE_NOT_FOUND" });
    await leaseSignatureRepository.abort(one.leaseId, "e".repeat(64));
    expect(await database`SELECT count(*)::int AS count FROM saraya_lease_signature_requests WHERE lease_id=${one.leaseId} AND status='signed'`).toEqual([{ count: 1 }]);
    await database`UPDATE saraya_units SET owner_id=${ownerId} WHERE id=${unitId}`;
    state.failPuts = 1;
    await expect(leaseSignatureService.sign(owner, one.leaseId, { acceptedName: "Owner", checksum: one.checksum, ip: "2001:db8::1", userAgent: "test" })).rejects.toThrow("storage down");
    expect(await database`SELECT l.status,p.finalization_state,p.final_document_id,(SELECT count(*)::int FROM saraya_lease_signature_requests s WHERE s.lease_id=l.id AND s.status='signed') AS signed_count FROM saraya_leases l JOIN saraya_lease_packages p ON p.lease_id=l.id WHERE l.id=${one.leaseId}`).toEqual([{ status: "pending_approval", finalization_state: "pending", final_document_id: null, signed_count: 1 }]);
    await database`UPDATE saraya_units SET status='maintenance' WHERE id=${unitId}`;
    await expect(leaseSignatureService.sign(owner, one.leaseId, { acceptedName: "Owner", checksum: one.checksum, ip: "2001:db8::1", userAgent: "test" })).rejects.toMatchObject({ code: "LEASE_FINALIZATION_CONFLICT" });
    expect(await database`SELECT finalization_state,final_document_id FROM saraya_lease_packages WHERE lease_id=${one.leaseId}`).toEqual([{ finalization_state: "pending", final_document_id: null }]);
    await database`UPDATE saraya_units SET status='vacant' WHERE id=${unitId}`;
    const concurrent = await Promise.all([
      leaseSignatureService.sign(owner, one.leaseId, { acceptedName: "Owner", checksum: one.checksum, ip: "2001:db8::1", userAgent: "test" }),
      leaseSignatureService.sign(owner, one.leaseId, { acceptedName: "Owner", checksum: one.checksum, ip: "2001:db8::1", userAgent: "test" }),
    ]);
    expect(concurrent).toEqual([expect.objectContaining({ status: "active" }), expect.objectContaining({ status: "active" })]);
    expect(await leaseSignatureService.sign(owner, one.leaseId, { acceptedName: "Owner", checksum: one.checksum, ip: "2001:db8::1", userAgent: "test" })).toMatchObject({ status: "active" });
    expect(await database`SELECT l.status,r.status AS request_status,u.status AS unit_status FROM saraya_leases l JOIN saraya_rental_requests r ON r.lease_id=l.id JOIN saraya_units u ON u.id=l.unit_id WHERE l.id=${one.leaseId}`).toEqual([{ status: "active", request_status: "completed", unit_status: "occupied" }]);
    const [finalDocument] = await database`SELECT p.final_document_checksum,d.storage_key FROM saraya_lease_packages p JOIN saraya_documents d ON d.id=p.final_document_id WHERE p.lease_id=${one.leaseId}`;
    expect(finalDocument.final_document_checksum).toBe(createHash("sha256").update(state.files.get(finalDocument.storage_key)!).digest("hex"));
    const { rentalStatusRepository } = await import("../rentals/status-repository");
    const { createRentalStatusService } = await import("../rentals/status-service");
    const { createRentalStatusHandler } = await import("../rentals/status-http");
    const statusRoute = createRentalStatusHandler({ authenticate: async () => tenant, read: createRentalStatusService(rentalStatusRepository).read });
    const statusResponse = await statusRoute(new Request("https://sq.lawyers.bh/api/saraya/v1/rental-requests/status"), requestId);
    expect(statusResponse.status).toBe(200);
    const status = await statusResponse.json() as { timeline: Array<{ code: string; occurredAt: string }>; lease: { active: boolean } };
    expect(status.lease.active).toBe(true);
    expect(status.timeline.at(-1)?.code).toBe("activated");
    expect(status.timeline.map((item) => item.occurredAt)).toEqual([...status.timeline.map((item) => item.occurredAt)].sort());

    const { createGetLeaseDocumentRoute } = await import("./document-http");
    const { leaseDocument } = await import("./document-service");
    const documentRoute = createGetLeaseDocumentRoute({ authenticate: async () => tenant, download: leaseDocument });
    const documentResponse = await documentRoute(new Request("https://sq.lawyers.bh/api/saraya/v1/leases/document?version=final"), { params: Promise.resolve({ id: one.leaseId }) });
    expect(documentResponse.status).toBe(200);
    expect(documentResponse.headers.get("content-type")).toBe("application/pdf");
    expect(new Uint8Array(await documentResponse.arrayBuffer())).toEqual(state.files.get(finalDocument.storage_key));
    await expect(database`UPDATE saraya_lease_packages SET final_document_id=${randomUUID()} WHERE lease_id=${one.leaseId}`).rejects.toMatchObject({ message: expect.stringContaining("immutable") });
  });

  it("rejects a new registration that conflicts with the verified user organization", async () => {
    const conflictUser = randomUUID(), conflictUnit = randomUUID(), conflictIdentity = randomUUID(), conflictRequest = randomUUID(), conflictInvoice = randomUUID();
    const [unitType] = await database`SELECT id FROM saraya_unit_types WHERE property_id=${propertyId} LIMIT 1`;
    await database`INSERT INTO saraya_users(id,normalized_email,display_name_ar,display_name_en) VALUES (${conflictUser},'identity-conflict@test','متعارض','Conflict')`;
    await database`INSERT INTO saraya_contacts(property_id,tenant_organization_id,user_id,name,is_primary) VALUES (${propertyId},${tenantOrganizationId},${conflictUser},'Conflict',true)`;
    await database`INSERT INTO saraya_units(id,property_id,unit_type_id,owner_id,unit_number,status) VALUES (${conflictUnit},${propertyId},${unitType.id},${ownerId},'102','vacant')`;
    await database`INSERT INTO saraya_documents(id,property_id,unit_id,uploaded_by_user_id,category,title,original_name,content_type,size_bytes,storage_key) VALUES (${conflictIdentity},${propertyId},${conflictUnit},${conflictUser},'identity','ID','id.pdf','application/pdf',4,'private/conflict-id')`;
    await database`INSERT INTO saraya_rental_requests(id,property_id,unit_id,tenant_user_id,status,start_date,end_date,duration_months,rent_amount,deposit_amount,fee_amount,id_document_id,idempotency_key,resolved_approval_mode,applicant_type,applicant_name_ar,applicant_name_en,registration_number,decided_by_user_id,decided_at) VALUES (${conflictRequest},${propertyId},${conflictUnit},${conflictUser},'paid_awaiting_signature','2031-01-01','2031-12-31',12,'500.000','500.000','10.000',${conflictIdentity},'identity-conflict','owner_review','company','شركة أخرى','Other Company','CR-B',${ownerUserId},now())`;
    await database`INSERT INTO saraya_invoices(id,property_id,rental_request_id,tenant_user_id,status,number,issue_date,due_date,subtotal_amount,total_amount,paid_amount) VALUES (${conflictInvoice},${propertyId},${conflictRequest},${conflictUser},'paid','INV-C',CURRENT_DATE,CURRENT_DATE,'1010.000','1010.000','1010.000')`;
    await database`INSERT INTO saraya_payment_demands(property_id,invoice_id,rental_request_id,status,amount,idempotency_key,provider,provider_reference,verified_at) VALUES (${propertyId},${conflictInvoice},${conflictRequest},'paid','1010.000','identity-conflict-demand','tap','chg_conflict',now())`;
    const { leaseCheckoutService } = await import("./checkout-runtime");
    await expect(leaseCheckoutService.createForPaidRequest(propertyId, conflictRequest)).rejects.toMatchObject({ code: "TENANT_IDENTITY_CONFLICT" });
    expect(await database`SELECT tenant_organization_id,lease_id FROM saraya_rental_requests WHERE id=${conflictRequest}`).toEqual([{ tenant_organization_id: null, lease_id: null }]);
  });

  it("invalidates a stale signed owner and lets the current owner sign", async () => {
    const tenantTwo = randomUUID(), unitTwo = randomUUID(), identityTwo = randomUUID(), requestTwo = randomUUID(), invoiceTwo = randomUUID();
    const [unitType] = await database`SELECT id FROM saraya_unit_types WHERE property_id=${propertyId} LIMIT 1`;
    await database`INSERT INTO saraya_users(id,normalized_email,display_name_ar,display_name_en) VALUES (${tenantTwo},'tenant-two@test','المستأجر الثاني','Tenant Two')`;
    await database`INSERT INTO saraya_units(id,property_id,unit_type_id,owner_id,unit_number,status) VALUES (${unitTwo},${propertyId},${unitType.id},${ownerId},'103','vacant')`;
    await database`INSERT INTO saraya_documents(id,property_id,unit_id,uploaded_by_user_id,category,title,original_name,content_type,size_bytes,storage_key) VALUES (${identityTwo},${propertyId},${unitTwo},${tenantTwo},'identity','ID','id.pdf','application/pdf',4,'private/id-two')`;
    await database`INSERT INTO saraya_rental_requests(id,property_id,unit_id,tenant_user_id,status,start_date,end_date,duration_months,rent_amount,deposit_amount,fee_amount,id_document_id,idempotency_key,resolved_approval_mode,applicant_type,applicant_name_ar,applicant_name_en,registration_number,decided_by_user_id,decided_at) VALUES (${requestTwo},${propertyId},${unitTwo},${tenantTwo},'paid_awaiting_signature','2032-01-01','2032-12-31',12,'500.000','500.000','10.000',${identityTwo},'owner-reassign','owner_review','individual','المستأجر الثاني','Tenant Two',NULL,${ownerUserId},now())`;
    await database`INSERT INTO saraya_invoices(id,property_id,rental_request_id,tenant_user_id,status,number,issue_date,due_date,subtotal_amount,total_amount,paid_amount) VALUES (${invoiceTwo},${propertyId},${requestTwo},${tenantTwo},'paid','INV-R',CURRENT_DATE,CURRENT_DATE,'1010.000','1010.000','1010.000')`;
    await database`INSERT INTO saraya_payment_demands(property_id,invoice_id,rental_request_id,status,amount,idempotency_key,provider,provider_reference,verified_at) VALUES (${propertyId},${invoiceTwo},${requestTwo},'paid','1010.000','owner-reassign-demand','tap','chg_reassign',now())`;
    const { leaseCheckoutService } = await import("./checkout-runtime");
    const created = await leaseCheckoutService.createForPaidRequest(propertyId, requestTwo);
    const { leaseSignatureService } = await import("./signature-runtime");
    const owner: SarayaPrincipal = { userId: ownerUserId, sessionId: "owner", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner", ownerId }] };
    const nextOwner: SarayaPrincipal = { userId: nextOwnerUserId, sessionId: "next-owner", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner", ownerId: nextOwnerId }] };
    const tenant: SarayaPrincipal = { userId: tenantTwo, sessionId: "tenant-two", propertyIds: [], memberships: [] };
    await expect(leaseSignatureService.sign(owner, created.leaseId, { acceptedName: "Owner", checksum: created.checksum, ip: "10.0.0.1", userAgent: "test" })).resolves.toMatchObject({ status: "pending" });
    await database`UPDATE saraya_units SET owner_id=${nextOwnerId} WHERE id=${unitTwo}`;
    await expect(leaseSignatureService.sign(tenant, created.leaseId, { acceptedName: "Tenant Two", checksum: created.checksum, ip: "10.0.0.2", userAgent: "test" })).resolves.toMatchObject({ status: "pending" });
    expect(await database`SELECT status,signer_user_id,actor_role FROM saraya_lease_signature_requests WHERE lease_id=${created.leaseId} AND signer_role='owner'`).toEqual([{ status: "pending", signer_user_id: nextOwnerUserId, actor_role: null }]);
    expect(await database`SELECT reason,previous_signer_user_id FROM saraya_lease_signature_events WHERE lease_id=${created.leaseId}`).toEqual([{ reason: "owner_reassigned", previous_signer_user_id: ownerUserId }]);
    await expect(leaseSignatureService.sign(nextOwner, created.leaseId, { acceptedName: "Next Owner", checksum: created.checksum, ip: "10.0.0.3", userAgent: "test" })).resolves.toMatchObject({ status: "active" });
  });
});
