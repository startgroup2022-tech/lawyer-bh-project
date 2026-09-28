import "server-only";
import type { Sql, TransactionSql } from "postgres";
import { sqlClient } from "@/lib/db/client";
import { DiscountError, evaluateDiscount, type DiscountQuote, type DiscountRecord } from "./service";
import { normalizeDiscountCode, parseBhdToFils } from "./pricing";

type DiscountRow = {
  scope: "website" | "app" | "both";
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  is_active: boolean;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  total_usage_limit: number | null;
  per_user_usage_limit: number | null;
  total_used: number | string;
  user_used: number | string;
};

export function normalizeUserKey(email: unknown) {
  return String(email ?? "").trim().toLowerCase().slice(0, 254);
}

export async function loadDiscountQuote(input: {
  code: unknown;
  email: unknown;
  originalFils: number;
  includeReservations?: boolean;
  channel?: "website" | "app";
  lock?: boolean;
}, connection: Sql | TransactionSql = sqlClient): Promise<DiscountQuote> {
  const code = normalizeDiscountCode(input.code);
  const userKey = normalizeUserKey(input.email);
  if (!code || !userKey) throw new DiscountError("invalid");

  if (input.lock) await connection`SELECT id FROM discount_codes WHERE code = ${code} FOR UPDATE`;
  const rows = await connection<DiscountRow[]>`
    SELECT dc.*,
      (SELECT count(*)::int FROM discount_redemptions dr
       WHERE dr.discount_code_id = dc.id AND (dr.status = 'redeemed' OR (${Boolean(input.includeReservations)} AND dr.status = 'reserved' AND (dr.reserved_until IS NULL OR dr.reserved_until > NOW())))) AS total_used,
      (SELECT count(*)::int FROM discount_redemptions dr
       WHERE dr.discount_code_id = dc.id AND (dr.status = 'redeemed' OR (${Boolean(input.includeReservations)} AND dr.status = 'reserved' AND (dr.reserved_until IS NULL OR dr.reserved_until > NOW()))) AND dr.user_key = ${userKey}) AS user_used
    FROM discount_codes dc
    WHERE dc.code = ${code}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new DiscountError("invalid");

  const record: DiscountRecord = {
    scope: row.scope,
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    isActive: row.is_active,
    startsAt: row.starts_at ? new Date(row.starts_at) : null,
    endsAt: row.ends_at ? new Date(row.ends_at) : null,
    totalUsageLimit: row.total_usage_limit,
    perUserUsageLimit: row.per_user_usage_limit,
  };
  return evaluateDiscount({
    channel: input.channel,
    code: record,
    originalFils: input.originalFils,
    totalUsed: Number(row.total_used),
    userUsed: Number(row.user_used),
    now: new Date(),
  });
}

// Called within the same transaction as the locked quote and emergency request.
// SDK sessions remain payable; their reservation cannot expire independently.
export async function reserveMobileDiscount(tx: TransactionSql, input: { quote: DiscountQuote; userKey: string; requestId: string }) {
  await tx`INSERT INTO discount_redemptions(discount_code_id, emergency_request_id, user_key, flow,
    original_amount_bd, discount_amount_bd, final_amount_bd, status, reserved_until)
    VALUES(${input.quote.codeId}::uuid,${input.requestId}::uuid,${normalizeUserKey(input.userKey)},'mobile_sos',
      ${input.quote.originalAmountBd},${input.quote.discountAmountBd},${input.quote.finalAmountBd},'reserved',NULL)`;
}

export async function reserveDiscount(input: { quote: DiscountQuote; email: unknown; flow: string; bookingId?: string | null }, connection: Sql = sqlClient) {
  return connection.begin(async tx => {
  const userKey = normalizeUserKey(input.email);
  // Lock before the fresh count, also shared with mobile reservations.
  await tx`SELECT id FROM discount_codes WHERE id=${input.quote.codeId}::uuid FOR UPDATE`;
  if (input.bookingId) {
    const [existing] = await tx`SELECT id,status,final_amount_bd FROM discount_redemptions
      WHERE booking_request_id=${input.bookingId}::uuid AND discount_code_id=${input.quote.codeId}::uuid
        AND (status='redeemed' OR (status='reserved' AND reserved_until>now()))`;
    if (existing) {
      if(existing.status==='redeemed' || Number(existing.final_amount_bd)!==Number(input.quote.finalAmountBd)) throw new DiscountError('invalid');
      return String(existing.id);
    }
  }
  const fresh=await loadDiscountQuote({code:input.quote.code,email:input.email,
    originalFils:parseBhdToFils(input.quote.originalAmountBd),channel:'website',includeReservations:true},tx);
  if(fresh.codeId!==input.quote.codeId||fresh.finalAmountBd!==input.quote.finalAmountBd) throw new DiscountError('invalid');
  const rows = await tx<{ id: string }[]>`
    INSERT INTO discount_redemptions (discount_code_id, booking_request_id, user_key, flow, original_amount_bd, discount_amount_bd, final_amount_bd, status, reserved_until)
    VALUES (${input.quote.codeId}::uuid, ${input.bookingId ?? null}::uuid, ${userKey}, ${input.flow}, ${input.quote.originalAmountBd}, ${input.quote.discountAmountBd}, ${input.quote.finalAmountBd}, 'reserved', NOW() + INTERVAL '30 minutes')
    ON CONFLICT (booking_request_id, discount_code_id) DO UPDATE SET
      user_key = EXCLUDED.user_key, original_amount_bd = EXCLUDED.original_amount_bd,
      discount_amount_bd = EXCLUDED.discount_amount_bd, final_amount_bd = EXCLUDED.final_amount_bd,
      status = 'reserved', reserved_until = NOW() + INTERVAL '30 minutes', updated_at = NOW()
    RETURNING id
  `;
  return rows[0]?.id ?? null;
  });
}

export async function attachDiscountToCharge(redemptionId: string | null, chargeId: string | null, failed = false) {
  if (!redemptionId) return;
  await sqlClient`UPDATE discount_redemptions SET tap_charge_id = ${chargeId}, status = ${failed ? "released" : "reserved"}, updated_at = NOW() WHERE id = ${redemptionId}::uuid`;
}
