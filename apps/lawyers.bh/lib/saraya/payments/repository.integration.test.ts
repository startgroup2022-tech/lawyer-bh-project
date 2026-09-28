import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";
import type { PaymentRepository } from "./service";

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
const unitId = "22222222-2222-4222-8222-222222222222";
const tenantId = "33333333-3333-4333-8333-333333333333";
const managerId = "44444444-4444-4444-8444-444444444444";
const outsiderId = "55555555-5555-4555-8555-555555555555";
const requestId = "66666666-6666-4666-8666-666666666666";
const invoiceId = "77777777-7777-4777-8777-777777777777";
const demandId = "88888888-8888-4888-8888-888888888888";
const receiptOne = "99999999-9999-4999-8999-999999999999";
const receiptTwo = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tapUnitId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const tapRequestId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const tapInvoiceId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const tapDemandId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe.skipIf(!localUrl)("Saraya payment repository against current migrations", () => {
  let admin: ReturnType<typeof postgres>;
  let database: ReturnType<typeof postgres>;
  let repository: PaymentRepository;
  let uploadProof: ReturnType<typeof import("./proof-upload")["createPaymentProofUploader"]>;
  const storedProofs = new Map<string, Uint8Array>();
  const schemaName = `saraya_payment_${randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    database = postgres(localUrl!, { max: 8, connection: { search_path: `${schemaName},public` }, onnotice: () => {} });
    for (const migration of [
      "drizzle/0062_saraya_core.sql",
      "drizzle/0063_saraya_auth.sql",
      "drizzle/0064_saraya_leases.sql",
      "drizzle/0066_saraya_shared_office_parts.sql",
      "drizzle/0070_saraya_public_catalog.sql",
      "drizzle/0075_saraya_rental_finance.sql",
      "drizzle/0118_saraya_documents.sql",
      "drizzle/0122_saraya_public_rental_checkout.sql",
      "drizzle/0124_saraya_rental_payments.sql",
      "drizzle/0125_saraya_payment_hardening.sql",
      "drizzle/0126_saraya_offline_payment_reference.sql",
    ]) await database.unsafe(scopedMigration(migration, schemaName));

    state.db = drizzle(database, { schema });
    ({ paymentRepository: repository } = await import("./repository"));
    const { createPaymentProofUploader } = await import("./proof-upload");
    uploadProof = createPaymentProofUploader(repository, {
      async put(input) { storedProofs.set(input.key, input.body); },
      async delete(key) { storedProofs.delete(key); },
      async signedReadUrl() { return "https://example.test/private"; },
    });
    await database`
      INSERT INTO saraya_users(id, normalized_email, normalized_phone, display_name_ar, display_name_en)
      VALUES (${tenantId}, 'tenant@example.test', '+97339000000', 'مستأجر', 'Tenant'),
             (${managerId}, 'manager@example.test', '+97339000001', 'مدير', 'Manager'),
             (${outsiderId}, 'other@example.test', '+97339000002', 'آخر', 'Other')
    `;
    await database`INSERT INTO saraya_properties(id, code, name_ar, name_en) VALUES (${propertyId}, 'PAY', 'الدفع', 'Payment')`;
    await database`INSERT INTO saraya_property_memberships(property_id, user_id, role) VALUES (${propertyId}, ${managerId}, 'property_manager')`;
    const unitTypeId = randomUUID();
    await database`INSERT INTO saraya_unit_types(id, property_id, name_ar, name_en) VALUES (${unitTypeId}, ${propertyId}, 'مكتب', 'Office')`;
    await database`INSERT INTO saraya_units(id, property_id, unit_type_id, unit_number) VALUES (${unitId}, ${propertyId}, ${unitTypeId}, '101')`;
    await database`INSERT INTO saraya_units(id, property_id, unit_type_id, unit_number) VALUES (${tapUnitId}, ${propertyId}, ${unitTypeId}, '102')`;
    await database`
      INSERT INTO saraya_documents(id, property_id, unit_id, uploaded_by_user_id, category, title, original_name, content_type, size_bytes, storage_key)
      VALUES (${receiptOne}, ${propertyId}, ${unitId}, ${tenantId}, 'receipt', 'Receipt 1', 'r1.pdf', 'application/pdf', 4, 'private/r1'),
             (${receiptTwo}, ${propertyId}, ${unitId}, ${tenantId}, 'receipt', 'Receipt 2', 'r2.pdf', 'application/pdf', 4, 'private/r2')
    `;
    const identityId = randomUUID();
    await database`
      INSERT INTO saraya_documents(id, property_id, unit_id, uploaded_by_user_id, category, title, original_name, content_type, size_bytes, storage_key)
      VALUES (${identityId}, ${propertyId}, ${unitId}, ${tenantId}, 'identity', 'ID', 'id.pdf', 'application/pdf', 4, 'private/id')
    `;
    await database`
      INSERT INTO saraya_rental_requests(id, property_id, unit_id, tenant_user_id, status, start_date, end_date, duration_months,
        rent_amount, deposit_amount, fee_amount, id_document_id, idempotency_key, resolved_approval_mode, applicant_type, applicant_name_ar, applicant_name_en)
      VALUES (${requestId}, ${propertyId}, ${unitId}, ${tenantId}, 'approved_awaiting_payment', '2030-01-01', '2030-12-31', 12,
        '550.000', '0.000', '0.000', ${identityId}, 'rental-key', 'instant', 'individual', 'مستأجر', 'Tenant')
    `;
    await database`
      INSERT INTO saraya_rental_requests(id, property_id, unit_id, tenant_user_id, status, start_date, end_date, duration_months,
        rent_amount, deposit_amount, fee_amount, id_document_id, idempotency_key, resolved_approval_mode, applicant_type, applicant_name_ar, applicant_name_en)
      VALUES (${tapRequestId}, ${propertyId}, ${tapUnitId}, ${tenantId}, 'approved_awaiting_payment', '2031-01-01', '2031-12-31', 12,
        '10.000', '0.000', '0.000', ${identityId}, 'tap-rental-key', 'instant', 'individual', 'مستأجر', 'Tenant')
    `;
    await database`
      INSERT INTO saraya_invoices(id, property_id, rental_request_id, tenant_user_id, status, number, issue_date, due_date, subtotal_amount, total_amount)
      VALUES (${invoiceId}, ${propertyId}, ${requestId}, ${tenantId}, 'due', 'INV-1', CURRENT_DATE, CURRENT_DATE, '550.000', '550.000')
    `;
    await database`
      INSERT INTO saraya_payment_demands(id, property_id, invoice_id, rental_request_id, status, amount, idempotency_key)
      VALUES (${demandId}, ${propertyId}, ${invoiceId}, ${requestId}, 'pending', '550.000', 'demand-key')
    `;
    await database`
      INSERT INTO saraya_invoices(id, property_id, rental_request_id, tenant_user_id, status, number, issue_date, due_date, subtotal_amount, total_amount)
      VALUES (${tapInvoiceId}, ${propertyId}, ${tapRequestId}, ${tenantId}, 'due', 'INV-2', CURRENT_DATE, CURRENT_DATE, '10.000', '10.000')
    `;
    await database`
      INSERT INTO saraya_payment_demands(id, property_id, invoice_id, rental_request_id, status, amount, idempotency_key)
      VALUES (${tapDemandId}, ${propertyId}, ${tapInvoiceId}, ${tapRequestId}, 'pending', '10.000', 'tap-demand-key')
    `;
  });

  afterAll(async () => {
    if (database) await database.end();
    if (admin) {
      await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`;
      await admin.end();
    }
  });

  it("creates one checkout command and rejects a conflicting payload", async () => {
    const base = { tenantUserId: tenantId, requestId, idempotencyKey: "checkout-key", fingerprint: "a".repeat(64) };
    const created = await repository.beginOnlineCheckout(base);
    expect(created).toMatchObject({ kind: "create", demandId, amount: "550.000", currency: "BHD" });
    await expect(repository.beginOnlineCheckout(base)).resolves.toMatchObject({ kind: "create", commandId: (created as { commandId: string }).commandId });
    await expect(repository.beginOnlineCheckout({ ...base, fingerprint: "b".repeat(64) })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    if (created.kind !== "create") throw new Error("expected create");
    await repository.completeOnlineCheckout(created.commandId, "chg_1", "https://tap.example/pay");
    await expect(repository.beginOnlineCheckout(base)).resolves.toMatchObject({ kind: "existing", providerReference: "chg_1" });
  });

  it("keeps payment state unchanged for the wrong tenant", async () => {
    await expect(repository.beginOnlineCheckout({
      tenantUserId: outsiderId, requestId, idempotencyKey: "outsider", fingerprint: "c".repeat(64),
    })).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });
  });

  it("rejects a receipt that belongs to another unit", async () => {
    await expect(repository.submitOfflineProof({
      tenantUserId: tenantId, demandId: tapDemandId, documentId: receiptOne, reference: "wrong-unit",
      idempotencyKey: "wrong-unit-proof", fingerprint: "9".repeat(64),
    })).rejects.toMatchObject({ code: "INVALID_PAYMENT_PROOF" });
  });

  it("replays a canonical proof upload before consuming quota again", async () => {
    await database`DELETE FROM saraya_payment_operations WHERE payment_demand_id=${demandId}`;
    await database`DELETE FROM saraya_payment_proofs WHERE payment_demand_id=${demandId}`;
    await database`UPDATE saraya_payment_demands SET status='pending', provider=NULL, provider_reference=NULL, receipt_document_id=NULL WHERE id=${demandId}`;
    const invalid = new FormData();
    invalid.set("title", "Missing reference");
    invalid.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "invalid.pdf", { type: "application/pdf" }));
    await expect(uploadProof(new Request("https://example.test", { method: "POST", body: invalid }), { userId: tenantId, sessionId: "s", propertyIds: [], memberships: [] }, demandId, "invalid-upload"))
      .rejects.toMatchObject({ code: "PAYMENT_PROOF_REQUIRED" });
    expect(await database`SELECT count(*)::int AS count FROM saraya_auth_rate_limits WHERE bucket LIKE 'payment-proof:%'`).toEqual([{ count: 0 }]);
    const request = () => {
      const form = new FormData();
      form.set("title", "Bank proof");
      form.set("reference", "BANK-REPLAY");
      form.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "proof.pdf", { type: "application/pdf" }));
      return new Request("https://example.test", { method: "POST", body: form });
    };
    const principal = { userId: tenantId, sessionId: "s", propertyIds: [], memberships: [] };
    const first = await uploadProof(request(), principal, demandId, "upload-replay-key");
    const replay = await uploadProof(request(), principal, demandId, "upload-replay-key");
    expect(replay).toEqual(first);
    expect(await database`SELECT count::int AS count FROM saraya_auth_rate_limits WHERE bucket LIKE 'payment-proof:%'`).toEqual([{ count: 1 }]);
    await database`UPDATE saraya_payment_demands SET status='pending', provider=NULL, provider_reference=NULL, receipt_document_id=NULL WHERE id=${demandId}`;
    await database`DELETE FROM saraya_payment_operations WHERE payment_demand_id=${demandId}`;
    await database`DELETE FROM saraya_payment_proofs WHERE payment_demand_id=${demandId}`;
    await database`DELETE FROM saraya_documents WHERE property_id=${propertyId} AND category='receipt' AND id NOT IN (${receiptOne}, ${receiptTwo})`;
    await database`DELETE FROM saraya_auth_rate_limits WHERE bucket LIKE 'payment-proof:%'`;
  });

  it("durably rate limits repeated provider verification calls", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) await repository.reserveTapVerification("chg_rate_limited", "203.0.113.77");
    await expect(repository.reserveTapVerification("chg_rate_limited", "203.0.113.77"))
      .rejects.toMatchObject({ code: "PAYMENT_WEBHOOK_RATE_LIMITED" });
  });

  it("serializes concurrent checkout commands and applies a Tap capture exactly once", async () => {
    const input = { tenantUserId: tenantId, requestId: tapRequestId, idempotencyKey: "concurrent-key-a", fingerprint: "d".repeat(64) };
    const attempts = await Promise.allSettled([
      repository.beginOnlineCheckout(input),
      repository.beginOnlineCheckout({ ...input, idempotencyKey: "concurrent-key-b" }),
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((item) => item.status === "rejected")).toHaveLength(1);
    const firstAttempt = attempts.find((item): item is PromiseFulfilledResult<Awaited<ReturnType<PaymentRepository["beginOnlineCheckout"]>>> => item.status === "fulfilled")!.value;
    if (firstAttempt.kind !== "create") throw new Error("expected create");
    await repository.completeOnlineCheckout(firstAttempt.commandId, "chg_failed", "https://tap.example/failed");
    await repository.markTapFailed({ demandId: tapDemandId, providerReference: "chg_failed", failureCode: "TAP_DECLINED" });
    const retry = await repository.beginOnlineCheckout({ ...input, idempotencyKey: "retry-after-terminal" });
    expect(retry).toMatchObject({ kind: "create" });
    if (retry.kind !== "create") throw new Error("expected retry create");
    await repository.completeOnlineCheckout(retry.commandId, "chg_concurrent", "https://tap.example/retry");

    await Promise.all([
      repository.markPaid({ demandId: tapDemandId, provider: "tap", providerReference: "chg_concurrent", source: "tap_webhook", actorUserId: null }),
      repository.markPaid({ demandId: tapDemandId, provider: "tap", providerReference: "chg_concurrent", source: "tap_webhook", actorUserId: null }),
    ]);
    expect(await database`SELECT status FROM saraya_payment_demands WHERE id=${tapDemandId}`).toEqual([{ status: "paid" }]);
    expect(await database`SELECT count(*)::int AS count FROM saraya_payment_provider_events WHERE payment_demand_id=${tapDemandId} AND outcome='paid'`)
      .toEqual([{ count: 1 }]);
  });

  it("replays offline proof and decision operations and rejects payload conflicts", async () => {
    await database`UPDATE saraya_payment_demands SET status='pending', provider=NULL, provider_reference=NULL, receipt_document_id=NULL WHERE id=${demandId}`;
    const proof = { tenantUserId: tenantId, demandId, documentId: receiptOne, reference: "bank-idem", idempotencyKey: "proof-idem", fingerprint: "e".repeat(64) };
    await expect(repository.submitOfflineProof(proof)).resolves.toMatchObject({ status: "verification_pending" });
    await expect(repository.submitOfflineProof(proof)).resolves.toMatchObject({ status: "verification_pending" });
    await expect(repository.submitOfflineProof({ ...proof, reference: "changed", fingerprint: "f".repeat(64) })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    const decision = { actorUserId: managerId, demandId, decision: { type: "reject" as const, failureCode: "UNREADABLE" }, allowedRoles: ["accountant", "property_manager", "super_admin"] as const, idempotencyKey: "decision-idem", fingerprint: "a".repeat(64) };
    await repository.decideOfflinePayment(decision);
    await expect(repository.decideOfflinePayment(decision)).resolves.toMatchObject({ status: "failed" });
  });

  it("preserves a rejected receipt, accepts a replacement, and pays exactly once", async () => {
    await database`DELETE FROM saraya_payment_operations WHERE payment_demand_id=${demandId}`;
    await database`DELETE FROM saraya_payment_proofs WHERE payment_demand_id=${demandId}`;
    await database`
      UPDATE saraya_payment_demands SET status='pending', payment_method=NULL, provider=NULL,
        provider_reference=NULL, tap_charge_id=NULL, payment_url=NULL WHERE id=${demandId}
    `;
    await repository.submitOfflineProof({ tenantUserId: tenantId, demandId, documentId: receiptOne, reference: "bank-one", idempotencyKey: "proof-one", fingerprint: "1".repeat(64) });
    await expect(repository.decideOfflinePayment({
      actorUserId: outsiderId, demandId, decision: { type: "approve" }, allowedRoles: ["accountant", "property_manager", "super_admin"], idempotencyKey: "outsider-decision", fingerprint: "2".repeat(64),
    })).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });
    await repository.decideOfflinePayment({
      actorUserId: managerId, demandId, decision: { type: "reject", failureCode: "UNREADABLE" }, allowedRoles: ["accountant", "property_manager", "super_admin"], idempotencyKey: "reject-one", fingerprint: "3".repeat(64),
    });
    await repository.submitOfflineProof({ tenantUserId: tenantId, demandId, documentId: receiptTwo, reference: "bank-two", idempotencyKey: "proof-two", fingerprint: "4".repeat(64) });
    await repository.decideOfflinePayment({
      actorUserId: managerId, demandId, decision: { type: "approve" }, allowedRoles: ["accountant", "property_manager", "super_admin"], idempotencyKey: "approve-two", fingerprint: "5".repeat(64),
    });
    const [paidDemand] = await database`SELECT provider_reference FROM saraya_payment_demands WHERE id=${demandId}`;
    await repository.markPaid({ demandId, provider: "offline", providerReference: paidDemand.provider_reference, source: "offline_approval", actorUserId: managerId });

    expect(await database`SELECT status, receipt_document_id, failure_code FROM saraya_payment_demands WHERE id=${demandId}`)
      .toEqual([{ status: "paid", receipt_document_id: receiptTwo, failure_code: null }]);
    const [offlineDemand] = await database`SELECT provider_reference FROM saraya_payment_demands WHERE id=${demandId}`;
    const [approvedProof] = await database`SELECT id, reference FROM saraya_payment_proofs WHERE payment_demand_id=${demandId} AND status='approved'`;
    expect(offlineDemand.provider_reference).toBe(approvedProof.id);
    expect(approvedProof.reference).toBe("bank-two");
    expect(await database`SELECT status FROM saraya_invoices WHERE id=${invoiceId}`).toEqual([{ status: "paid" }]);
    expect(await database`SELECT status FROM saraya_rental_requests WHERE id=${requestId}`).toEqual([{ status: "paid_awaiting_signature" }]);
    expect(await database`SELECT document_id, status FROM saraya_payment_proofs WHERE payment_demand_id=${demandId} ORDER BY created_at`)
      .toEqual([{ document_id: receiptOne, status: "rejected" }, { document_id: receiptTwo, status: "approved" }]);
    expect(await database`SELECT count(*)::int AS count FROM saraya_payment_provider_events WHERE payment_demand_id=${demandId}`)
      .toEqual([{ count: 1 }]);
  });
});
