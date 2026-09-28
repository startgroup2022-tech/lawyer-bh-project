import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ApiError } from "../auth/contracts";
import type { CheckoutContext } from "./contracts";
import type { PaymentRepository } from "./service";

const first = <T>(rows: unknown): T | undefined => (rows as T[])[0];
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function notFound() {
  return new ApiError(404, "PAYMENT_NOT_FOUND", "عملية الدفع غير موجودة", "Payment not found");
}

function conflict(code = "PAYMENT_STATE_CONFLICT") {
  return new ApiError(409, code, "تعذر تنفيذ العملية في حالتها الحالية", "The payment cannot be changed in its current state");
}

type OperationInput = { actorUserId: string; action: "offline_proof.submit" | "offline_payment.decide"; idempotencyKey: string; fingerprint: string; demandId?: string };
async function existingOperation(tx: Transaction | typeof db, input: OperationInput) {
  const rows = await tx.execute(sql`
    SELECT payment_demand_id AS "demandId", fingerprint, result
    FROM saraya_payment_operations
    WHERE actor_user_id=${input.actorUserId} AND action=${input.action} AND idempotency_key=${input.idempotencyKey}
  `);
  const value = first<{ demandId: string; fingerprint: string; result: unknown }>(rows);
  if (!value) return null;
  if (value.fingerprint !== input.fingerprint || (input.demandId && value.demandId !== input.demandId)) throw conflict("IDEMPOTENCY_KEY_REUSED");
  return value.result;
}

async function lockOperation(tx: Transaction, input: OperationInput) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.actorUserId}:${input.action}:${input.idempotencyKey}`}, 0))`);
  return existingOperation(tx, input);
}

async function saveOperation(tx: Transaction, input: OperationInput & { demandId: string }, result: unknown) {
  await tx.execute(sql`
    INSERT INTO saraya_payment_operations(actor_user_id, payment_demand_id, action, idempotency_key, fingerprint, result)
    VALUES (${input.actorUserId}, ${input.demandId}, ${input.action}, ${input.idempotencyKey}, ${input.fingerprint}, ${JSON.stringify(result)}::jsonb)
  `);
}

async function paidTransition(
  tx: Transaction,
  input: { demandId: string; provider: string; providerReference: string; source: string; actorUserId: string | null },
) {
  const rows = await tx.execute(sql`
    SELECT d.id AS "demandId", d.property_id AS "propertyId", d.invoice_id AS "invoiceId",
           d.rental_request_id AS "requestId", d.status, d.amount::text AS amount, d.currency,
           d.provider, d.provider_reference AS "providerReference", r.status AS "requestStatus",
           i.status AS "invoiceStatus"
    FROM saraya_payment_demands d
    JOIN saraya_rental_requests r ON r.property_id=d.property_id AND r.id=d.rental_request_id
    JOIN saraya_invoices i ON i.property_id=d.property_id AND i.id=d.invoice_id
    WHERE d.id=${input.demandId}
    FOR UPDATE OF d, r, i
  `);
  const demand = first<{
    demandId: string; propertyId: string; invoiceId: string; requestId: string;
    status: string; amount: string; currency: string; provider: string | null;
    providerReference: string | null; requestStatus: string; invoiceStatus: string;
  }>(rows);
  if (!demand) throw notFound();
  if (demand.status === "paid") {
    if (demand.provider !== input.provider || demand.providerReference !== input.providerReference) throw conflict();
    return { status: "paid", requestStatus: demand.requestStatus, propertyId: demand.propertyId, requestId: demand.requestId };
  }
  if (!["pending", "charge_created", "verification_pending", "failed"].includes(demand.status)) throw conflict();
  if (demand.requestStatus !== "approved_awaiting_payment" || !["due", "overdue"].includes(demand.invoiceStatus)) throw conflict();
  if (input.provider === "tap" && (demand.status !== "charge_created" || demand.provider !== "tap" || demand.providerReference !== input.providerReference)) throw conflict();
  if (input.provider === "offline" && (demand.status !== "verification_pending" || demand.provider !== "offline" || demand.providerReference !== input.providerReference)) throw conflict();

  await tx.execute(sql`
    INSERT INTO saraya_payment_provider_events(provider, provider_reference, payment_demand_id, outcome)
    VALUES (${input.provider}, ${input.providerReference}, ${input.demandId}, 'paid')
    ON CONFLICT(provider, provider_reference) DO NOTHING
  `);
  const eventRows = await tx.execute(sql`
    SELECT payment_demand_id AS "demandId", outcome
    FROM saraya_payment_provider_events
    WHERE provider=${input.provider} AND provider_reference=${input.providerReference}
  `);
  const event = first<{ demandId: string; outcome: string }>(eventRows);
  if (!event || event.demandId !== input.demandId || event.outcome !== "paid") throw conflict("PAYMENT_PROVIDER_REFERENCE_CONFLICT");

  await tx.execute(sql`
    UPDATE saraya_payment_demands SET status='paid', payment_method=${input.provider === "tap" ? "online" : "bank_transfer"},
      provider=${input.provider}, provider_reference=${input.providerReference}, verified_by_user_id=${input.actorUserId},
      verified_at=now(), failure_code=NULL, updated_at=now()
    WHERE id=${input.demandId}
  `);
  await tx.execute(sql`
    UPDATE saraya_invoices SET status='paid', paid_amount=total_amount, updated_at=now()
    WHERE property_id=${demand.propertyId} AND id=${demand.invoiceId}
  `);
  await tx.execute(sql`
    UPDATE saraya_rental_requests SET status='paid_awaiting_signature', updated_at=now()
    WHERE property_id=${demand.propertyId} AND id=${demand.requestId}
  `);
  await tx.execute(sql`
    INSERT INTO saraya_audit_logs(property_id, actor_user_id, action, entity_type, entity_id, after)
    VALUES (${demand.propertyId}, ${input.actorUserId}, 'payment.paid', 'payment_demand', ${input.demandId},
      jsonb_build_object('source', ${input.source}::text, 'status', 'paid', 'provider', ${input.provider}::text))
  `);
  return { status: "paid", requestStatus: "paid_awaiting_signature", propertyId: demand.propertyId, requestId: demand.requestId };
}

export const paymentRepository: PaymentRepository = {
  async beginOnlineCheckout(input) {
    return db.transaction(async (tx) => {
      const commandRows = await tx.execute(sql`
        SELECT command.id AS "commandId", command.fingerprint, command.status,
               command.payment_demand_id AS "demandId", command.rental_request_id AS "requestId",
               command.provider_reference AS "providerReference", command.payment_url AS "paymentUrl",
               demand.status AS "demandStatus"
        FROM saraya_payment_commands command
        JOIN saraya_payment_demands demand ON demand.id=command.payment_demand_id
        WHERE command.tenant_user_id=${input.tenantUserId} AND command.idempotency_key=${input.idempotencyKey}
        FOR UPDATE OF command
      `);
      const command = first<{ commandId: string; fingerprint: string; status: string; demandId: string; requestId: string; providerReference: string | null; paymentUrl: string | null; demandStatus: string }>(commandRows);
      if (command) {
        if (command.fingerprint !== input.fingerprint) throw conflict("IDEMPOTENCY_KEY_REUSED");
        if (command.status === "ready" && command.demandStatus === "charge_created" && command.providerReference && command.paymentUrl) {
          return { kind: "existing" as const, demandId: command.demandId, requestId: command.requestId, providerReference: command.providerReference, paymentUrl: command.paymentUrl };
        }
        if (command.status === "failed") throw conflict("PAYMENT_ATTEMPT_FAILED");
      }
      const rows = await tx.execute(sql`
        SELECT d.id AS "demandId", d.property_id AS "propertyId", d.amount::text AS amount, d.currency,
               r.id AS "requestId", r.tenant_user_id AS "tenantUserId",
               COALESCE(NULLIF(u.display_name_en,''), NULLIF(u.display_name_ar,''), 'Saraya tenant') AS name,
               u.normalized_email AS email, u.normalized_phone AS phone
        FROM saraya_rental_requests r
        JOIN saraya_payment_demands d ON d.property_id=r.property_id AND d.rental_request_id=r.id
        JOIN saraya_users u ON u.id=r.tenant_user_id
        WHERE r.id=${input.requestId} AND r.tenant_user_id=${input.tenantUserId}
          AND r.status='approved_awaiting_payment' AND d.status IN ('pending','failed')
        FOR UPDATE OF r, d
      `);
      const checkout = first<CheckoutContext & { name: string; email: string | null; phone: string | null }>(rows);
      if (!checkout) throw notFound();
      const activeRows = await tx.execute(sql`
        SELECT id FROM saraya_payment_commands
        WHERE payment_demand_id=${checkout.demandId} AND status IN ('creating','ready')
          AND (${command?.commandId ?? null}::uuid IS NULL OR id<>${command?.commandId ?? null}::uuid)
        LIMIT 1
      `);
      if (first(activeRows)) throw conflict("ACTIVE_PAYMENT_SESSION_EXISTS");
      if (command?.status === "creating") {
        return {
          kind: "create" as const,
          commandId: command.commandId,
          demandId: checkout.demandId,
          requestId: checkout.requestId,
          propertyId: checkout.propertyId,
          tenantUserId: checkout.tenantUserId,
          amount: checkout.amount,
          currency: checkout.currency,
          customer: { name: checkout.name, email: checkout.email, phone: checkout.phone },
        };
      }
      const inserted = await tx.execute(sql`
        INSERT INTO saraya_payment_commands(tenant_user_id, rental_request_id, payment_demand_id, idempotency_key, fingerprint)
        VALUES (${input.tenantUserId}, ${checkout.requestId}, ${checkout.demandId}, ${input.idempotencyKey}, ${input.fingerprint})
        RETURNING id AS "commandId"
      `);
      return {
        kind: "create" as const,
        commandId: first<{ commandId: string }>(inserted)!.commandId,
        demandId: checkout.demandId,
        requestId: checkout.requestId,
        propertyId: checkout.propertyId,
        tenantUserId: checkout.tenantUserId,
        amount: checkout.amount,
        currency: checkout.currency,
        customer: { name: checkout.name, email: checkout.email, phone: checkout.phone },
      };
    });
  },

  async completeOnlineCheckout(commandId, providerReference, paymentUrl) {
    return db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT id, status, payment_demand_id AS "demandId", rental_request_id AS "requestId",
               provider_reference AS "providerReference", payment_url AS "paymentUrl"
        FROM saraya_payment_commands WHERE id=${commandId} FOR UPDATE
      `);
      const command = first<{ status: string; demandId: string; requestId: string; providerReference: string | null; paymentUrl: string | null }>(rows);
      if (!command) throw notFound();
      if (command.status === "ready") {
        if (command.providerReference !== providerReference) throw conflict("PAYMENT_PROVIDER_REFERENCE_CONFLICT");
        return { demandId: command.demandId, requestId: command.requestId, providerReference: command.providerReference!, paymentUrl: command.paymentUrl! };
      }
      const demandUpdate = await tx.execute(sql`
        UPDATE saraya_payment_demands SET status='charge_created', payment_method='online', provider='tap',
          provider_reference=${providerReference}, tap_charge_id=${providerReference}, payment_url=${paymentUrl}, failure_code=NULL, updated_at=now()
        WHERE id=${command.demandId} AND status IN ('pending','failed')
        RETURNING id
      `);
      if (!first(demandUpdate)) throw conflict();
      const commandUpdate = await tx.execute(sql`
        UPDATE saraya_payment_commands SET status='ready', provider_reference=${providerReference}, payment_url=${paymentUrl}, updated_at=now()
        WHERE id=${commandId} AND status='creating'
        RETURNING id
      `);
      if (!first(commandUpdate)) throw conflict();
      return { demandId: command.demandId, requestId: command.requestId, providerReference, paymentUrl };
    });
  },

  async failOnlineCheckout(commandId, failureCode) {
    await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT payment_demand_id AS "demandId" FROM saraya_payment_commands
        WHERE id=${commandId} AND status='creating' FOR UPDATE
      `);
      const command = first<{ demandId: string }>(rows);
      if (!command) return;
      await tx.execute(sql`
        UPDATE saraya_payment_commands SET status='failed', failure_code=${failureCode}, updated_at=now() WHERE id=${commandId}
      `);
      await tx.execute(sql`
        UPDATE saraya_payment_demands SET status='failed', failure_code=${failureCode}, updated_at=now()
        WHERE id=${command.demandId} AND status='pending'
      `);
    });
  },

  async reserveTapVerification(chargeId, ip) {
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    await db.transaction(async (tx) => {
      for (const item of [
        { key: `tap-webhook:charge:${hash(chargeId)}`, limit: 10 },
        { key: `tap-webhook:ip:${hash(ip)}`, limit: 100 },
      ]) {
        const rows = await tx.execute(sql`
          INSERT INTO saraya_auth_rate_limits(bucket, window_started_at, count, updated_at)
          VALUES (${item.key}, now(), 1, now())
          ON CONFLICT(bucket) DO UPDATE SET
            window_started_at=CASE WHEN saraya_auth_rate_limits.window_started_at < now() - interval '5 minutes' THEN now() ELSE saraya_auth_rate_limits.window_started_at END,
            count=CASE WHEN saraya_auth_rate_limits.window_started_at < now() - interval '5 minutes' THEN 1 ELSE saraya_auth_rate_limits.count + 1 END,
            updated_at=now()
          RETURNING count
        `);
        if (Number(first<{ count: number }>(rows)?.count) > item.limit) {
          throw new ApiError(429, "PAYMENT_WEBHOOK_RATE_LIMITED", "تم تجاوز حد التحقق من الدفع", "Payment verification rate limit exceeded");
        }
      }
    });
  },

  async getDemandForProviderVerification(demandId) {
    const rows = await db.execute(sql`
      SELECT d.id AS "demandId", d.property_id AS "propertyId", d.rental_request_id AS "requestId",
             r.tenant_user_id AS "tenantUserId", d.amount::text AS amount, d.currency,
             d.provider_reference AS "providerReference",
             COALESCE(NULLIF(u.display_name_en,''), NULLIF(u.display_name_ar,''), 'Saraya tenant') AS name,
             u.normalized_email AS email, u.normalized_phone AS phone
      FROM saraya_payment_demands d
      JOIN saraya_rental_requests r ON r.property_id=d.property_id AND r.id=d.rental_request_id
      JOIN saraya_users u ON u.id=r.tenant_user_id
      WHERE d.id=${demandId}
    `);
    const value = first<CheckoutContext & { name: string; email: string | null; phone: string | null }>(rows);
    return value ? { ...value, customer: { name: value.name, email: value.email, phone: value.phone } } : null;
  },

  markPaid(input) {
    return db.transaction((tx) => paidTransition(tx, input));
  },

  async markTapFailed(input) {
    return db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT d.property_id AS "propertyId", d.status, d.provider, d.provider_reference AS "providerReference"
        FROM saraya_payment_demands d WHERE d.id=${input.demandId} FOR UPDATE
      `);
      const demand = first<{ propertyId: string; status: string; provider: string | null; providerReference: string | null }>(rows);
      if (!demand) throw notFound();
      if (demand.status === "failed" && demand.providerReference === input.providerReference) return { status: "failed", failureCode: input.failureCode };
      if (demand.status !== "charge_created" || demand.provider !== "tap" || demand.providerReference !== input.providerReference) throw conflict();
      await tx.execute(sql`
        INSERT INTO saraya_payment_provider_events(provider, provider_reference, payment_demand_id, outcome)
        VALUES ('tap', ${input.providerReference}, ${input.demandId}, 'failed')
        ON CONFLICT(provider, provider_reference) DO NOTHING
      `);
      await tx.execute(sql`
        UPDATE saraya_payment_demands SET status='failed', payment_url=NULL, failure_code=${input.failureCode}, updated_at=now()
        WHERE id=${input.demandId}
      `);
      await tx.execute(sql`
        UPDATE saraya_payment_commands SET status='failed', failure_code=${input.failureCode}, payment_url=NULL, updated_at=now()
        WHERE payment_demand_id=${input.demandId} AND provider_reference=${input.providerReference} AND status='ready'
      `);
      await tx.execute(sql`
        INSERT INTO saraya_audit_logs(property_id, action, entity_type, entity_id, after)
        VALUES (${demand.propertyId}, 'payment.tap_failed', 'payment_demand', ${input.demandId},
          jsonb_build_object('source','tap_webhook','status','failed','failureCode',${input.failureCode}::text))
      `);
      return { status: "failed", failureCode: input.failureCode };
    });
  },

  async submitOfflineProof(input) {
    return db.transaction(async (tx) => {
      const operation = { actorUserId: input.tenantUserId, action: "offline_proof.submit" as const, idempotencyKey: input.idempotencyKey, fingerprint: input.fingerprint, demandId: input.demandId };
      const replay = await lockOperation(tx, operation);
      if (replay) return replay;
      const rows = await tx.execute(sql`
        SELECT d.id, d.property_id AS "propertyId", d.status, r.id AS "requestId", r.unit_id AS "unitId", r.tenant_user_id AS "tenantUserId",
               doc.id AS "documentId", doc.category, doc.status AS "documentStatus",
               used.payment_demand_id AS "documentDemandId"
        FROM saraya_payment_demands d
        JOIN saraya_rental_requests r ON r.property_id=d.property_id AND r.id=d.rental_request_id
        LEFT JOIN saraya_documents doc ON doc.property_id=d.property_id AND doc.id=${input.documentId}
          AND doc.uploaded_by_user_id=r.tenant_user_id AND doc.unit_id=r.unit_id
        LEFT JOIN saraya_payment_proofs used ON used.document_id=doc.id
        WHERE d.id=${input.demandId} AND r.tenant_user_id=${input.tenantUserId}
        FOR UPDATE OF d
      `);
      const demand = first<{ propertyId: string; requestId: string; unitId: string; status: string; documentId: string | null; category: string | null; documentStatus: string | null; documentDemandId: string | null }>(rows);
      if (!demand) throw notFound();
      if (!demand.documentId || demand.category !== "receipt" || demand.documentStatus !== "active") {
        throw new ApiError(422, "INVALID_PAYMENT_PROOF", "إثبات الدفع غير صالح", "Invalid payment proof");
      }
      if (demand.documentDemandId) throw conflict("PAYMENT_PROOF_DOCUMENT_REUSED");
      if (!["pending", "failed", "verification_pending"].includes(demand.status)) throw conflict();
      await tx.execute(sql`
        UPDATE saraya_payment_proofs SET status='rejected', failure_code='REPLACED', decided_at=now()
        WHERE payment_demand_id=${input.demandId} AND status='verification_pending'
      `);
      const proofRows = await tx.execute(sql`
        INSERT INTO saraya_payment_proofs(property_id, payment_demand_id, rental_request_id, document_id, submitted_by_user_id, reference)
        VALUES (${demand.propertyId}, ${input.demandId}, ${demand.requestId}, ${input.documentId}, ${input.tenantUserId}, ${input.reference})
        RETURNING id
      `);
      const proofId = first<{ id: string }>(proofRows)!.id;
      await tx.execute(sql`
        UPDATE saraya_payment_demands SET status='verification_pending', payment_method='bank_transfer',
          provider='offline', receipt_document_id=${input.documentId}, provider_reference=${proofId},
          failure_code=NULL, updated_at=now() WHERE id=${input.demandId}
      `);
      await tx.execute(sql`
        INSERT INTO saraya_audit_logs(property_id, actor_user_id, action, entity_type, entity_id, after)
        VALUES (${demand.propertyId}, ${input.tenantUserId}, 'payment.proof_submitted', 'payment_demand', ${input.demandId},
          jsonb_build_object('source','tenant','status','verification_pending'))
      `);
      const result = { status: "verification_pending", documentId: input.documentId, proofId };
      await saveOperation(tx, operation, result);
      return result;
    });
  },

  async decideOfflinePayment(input) {
    return db.transaction(async (tx) => {
      const operation = { actorUserId: input.actorUserId, action: "offline_payment.decide" as const, idempotencyKey: input.idempotencyKey, fingerprint: input.fingerprint, demandId: input.demandId };
      const replay = await lockOperation(tx, operation);
      if (replay) return replay;
      const rows = await tx.execute(sql`
        SELECT d.property_id AS "propertyId", d.status, d.provider_reference AS "providerReference",
               p.id AS "proofId"
        FROM saraya_payment_demands d
        JOIN saraya_payment_proofs p ON p.payment_demand_id=d.id AND p.status='verification_pending'
        WHERE d.id=${input.demandId}
        FOR UPDATE OF d, p
      `);
      const demand = first<{ propertyId: string; status: string; providerReference: string | null; proofId: string }>(rows);
      if (!demand) throw notFound();
      const membershipRows = await tx.execute(sql`
        SELECT role FROM saraya_property_memberships
        WHERE property_id=${demand.propertyId} AND user_id=${input.actorUserId} AND is_active=true
        FOR SHARE
      `);
      const role = first<{ role: string }>(membershipRows)?.role;
      if (!role || !input.allowedRoles.includes(role as never)) throw notFound();
      if (demand.status !== "verification_pending") throw conflict();
      if (input.decision.type === "reject") {
        const failureCode = input.decision.failureCode.trim().slice(0, 96);
        if (!failureCode) throw new ApiError(422, "FAILURE_CODE_REQUIRED", "سبب الرفض مطلوب", "A rejection reason is required");
        await tx.execute(sql`
          UPDATE saraya_payment_proofs SET status='rejected', failure_code=${failureCode},
            decided_by_user_id=${input.actorUserId}, decided_at=now() WHERE id=${demand.proofId}
        `);
        await tx.execute(sql`
          UPDATE saraya_payment_demands SET status='failed', failure_code=${failureCode},
            verified_by_user_id=${input.actorUserId}, verified_at=now(), updated_at=now()
          WHERE id=${input.demandId}
        `);
        await tx.execute(sql`
          INSERT INTO saraya_audit_logs(property_id, actor_user_id, action, entity_type, entity_id, after)
          VALUES (${demand.propertyId}, ${input.actorUserId}, 'payment.proof_rejected', 'payment_demand', ${input.demandId},
            jsonb_build_object('source','offline_review','status','failed','failureCode',${failureCode}::text))
        `);
        const result = { status: "failed", failureCode };
        await saveOperation(tx, operation, result);
        return result;
      }
      await tx.execute(sql`
        UPDATE saraya_payment_proofs SET status='approved', decided_by_user_id=${input.actorUserId}, decided_at=now()
        WHERE id=${demand.proofId}
      `);
      const result = await paidTransition(tx, {
        demandId: input.demandId,
        provider: "offline",
        providerReference: demand.providerReference ?? demand.proofId,
        source: "offline_approval",
        actorUserId: input.actorUserId,
      });
      await saveOperation(tx, operation, result);
      return result;
    });
  },

  findOperation(input) {
    return existingOperation(db, input);
  },

  async readTenantPaymentStatus(tenantUserId, requestId) {
    const rows = await db.execute(sql`
      SELECT d.status, r.status AS "requestStatus"
      FROM saraya_rental_requests r
      JOIN saraya_payment_demands d ON d.property_id=r.property_id AND d.rental_request_id=r.id
      WHERE r.id=${requestId} AND r.tenant_user_id=${tenantUserId}
    `);
    const value = first(rows);
    if (!value) throw notFound();
    return value;
  },
};
