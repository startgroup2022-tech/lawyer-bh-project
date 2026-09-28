import "server-only";
import { sqlClient } from "@/lib/db/client";
import { DiscountError, evaluateDiscount, type DiscountQuote, type DiscountRecord } from "./service";
import { normalizeDiscountCode } from "./pricing";

type DiscountRow = {
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
}): Promise<DiscountQuote> {
  const code = normalizeDiscountCode(input.code);
  const userKey = normalizeUserKey(input.email);
  if (!code || !userKey) throw new DiscountError("invalid");

  const rows = await sqlClient<DiscountRow[]>`
    SELECT dc.*,
      (SELECT count(*)::int FROM discount_redemptions dr
       WHERE dr.discount_code_id = dc.id AND (dr.status = 'redeemed' OR (${Boolean(input.includeReservations)} AND dr.status = 'reserved' AND dr.reserved_until > NOW()))) AS total_used,
      (SELECT count(*)::int FROM discount_redemptions dr
       WHERE dr.discount_code_id = dc.id AND (dr.status = 'redeemed' OR (${Boolean(input.includeReservations)} AND dr.status = 'reserved' AND dr.reserved_until > NOW())) AND dr.user_key = ${userKey}) AS user_used
    FROM discount_codes dc
    WHERE dc.code = ${code}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new DiscountError("invalid");

  const record: DiscountRecord = {
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
    code: record,
    originalFils: input.originalFils,
    totalUsed: Number(row.total_used),
    userUsed: Number(row.user_used),
    now: new Date(),
  });
}

export async function reserveDiscount(input: { quote: DiscountQuote; email: unknown; flow: string; bookingId?: string | null }) {
  const userKey = normalizeUserKey(input.email);
  const rows = await sqlClient<{ id: string }[]>`
    INSERT INTO discount_redemptions (discount_code_id, booking_request_id, user_key, flow, original_amount_bd, discount_amount_bd, final_amount_bd, status, reserved_until)
    VALUES (${input.quote.codeId}::uuid, ${input.bookingId ?? null}::uuid, ${userKey}, ${input.flow}, ${input.quote.originalAmountBd}, ${input.quote.discountAmountBd}, ${input.quote.finalAmountBd}, 'reserved', NOW() + INTERVAL '30 minutes')
    ON CONFLICT (booking_request_id, discount_code_id) DO UPDATE SET
      user_key = EXCLUDED.user_key, original_amount_bd = EXCLUDED.original_amount_bd,
      discount_amount_bd = EXCLUDED.discount_amount_bd, final_amount_bd = EXCLUDED.final_amount_bd,
      status = 'reserved', reserved_until = NOW() + INTERVAL '30 minutes', updated_at = NOW()
    RETURNING id
  `;
  return rows[0]?.id ?? null;
}

export async function attachDiscountToCharge(redemptionId: string | null, chargeId: string | null, failed = false) {
  if (!redemptionId) return;
  await sqlClient`UPDATE discount_redemptions SET tap_charge_id = ${chargeId}, status = ${failed ? "released" : "reserved"}, updated_at = NOW() WHERE id = ${redemptionId}::uuid`;
}
