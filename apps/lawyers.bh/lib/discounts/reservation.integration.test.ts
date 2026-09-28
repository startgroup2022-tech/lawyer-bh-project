import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db/client", () => ({ sqlClient: null }));
import { loadDiscountQuote, reserveMobileDiscount, reserveDiscount } from "./repository";
const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url && url !== "postgres://127.0.0.1:57583/legalsos_lifecycle_test") throw new Error("Local test database only");
describe.skipIf(!url)("discount reservation transaction", () => {
  const namespace = `discount_${randomUUID().replaceAll("-", "")}`;
  const sql = postgres(url ?? "postgres://127.0.0.1:57583/legalsos_lifecycle_test", { connection: { search_path: namespace } });
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    await sql`CREATE TABLE discount_codes(id uuid PRIMARY KEY, code text UNIQUE, discount_type text, discount_value numeric,
      is_active boolean DEFAULT true, starts_at timestamptz, ends_at timestamptz, total_usage_limit int, per_user_usage_limit int)`;
    await sql`CREATE TYPE payment_status AS ENUM ('pending','success','failed','refunded')`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY, payment_status payment_status, tap_status text, tap_charge_id text)`;
    await sql`CREATE TABLE discount_redemptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),discount_code_id uuid REFERENCES discount_codes(id),
      booking_request_id uuid,user_key text,flow text, original_amount_bd numeric,discount_amount_bd numeric,final_amount_bd numeric,
      status text,reserved_until timestamptz,tap_charge_id text,redeemed_at timestamptz,updated_at timestamptz DEFAULT now(),
      UNIQUE(booking_request_id,discount_code_id))`;
    await sql.unsafe(await readFile("drizzle/0097_discount_channels.sql", "utf8"));
  });
  afterAll(async () => { try { await sql.unsafe(`DROP SCHEMA ${namespace} CASCADE`); } finally { await sql.end(); } });
  beforeEach(async () => {
    await sql`TRUNCATE discount_redemptions,bahrain_emergency_requests,discount_codes CASCADE`;
    await sql`INSERT INTO discount_codes(id,code,discount_type,discount_value,scope,total_usage_limit) VALUES(${randomUUID()},'SAVE20','percentage',20,'both',1)`;
  });
  async function reserve(id: string) {
    return sql.begin(async tx => {
      const quote = await loadDiscountQuote({ code: "SAVE20", email: "synthetic@example.invalid", originalFils: 12345, channel: "app", includeReservations: true, lock: true }, tx);
      await tx`INSERT INTO bahrain_emergency_requests(id,payment_status,tap_status) VALUES(${id},'pending','SDK_PENDING')`;
      await reserveMobileDiscount(tx, { quote, userKey: "synthetic@example.invalid", requestId: id });
      return quote;
    });
  }
  it("only grants the last use to one simultaneous request", async () => {
    const results = await Promise.allSettled([reserve(randomUUID()),reserve(randomUUID())]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await sql`SELECT id FROM bahrain_emergency_requests`).toHaveLength(1);
    expect((await sql`SELECT final_amount_bd FROM discount_redemptions`)[0].final_amount_bd).toBe("9.876");
  });
  it("counts captured callbacks once and never reopens redeemed capacity", async () => {
    const id=randomUUID(); await reserve(id);
    await sql`UPDATE bahrain_emergency_requests SET payment_status='success',tap_status='CAPTURED',tap_charge_id='synthetic' WHERE id=${id}`;
    await sql`UPDATE bahrain_emergency_requests SET payment_status='success' WHERE id=${id}`;
    expect((await sql`SELECT status FROM discount_redemptions`)[0].status).toBe("redeemed");
    await expect(reserve(randomUUID())).rejects.toThrow("total_limit");
  });
  it("retains pending SDK capacity beyond the preview window", async () => {
    await reserve(randomUUID());
    await expect(loadDiscountQuote({ code:"SAVE20", email:"another@example.invalid", originalFils:12345, channel:"website", includeReservations:true },sql)).rejects.toThrow("total_limit");
  });
  it("rechecks capacity when a website quote races a mobile payment", async () => {
    const quote=await loadDiscountQuote({code:'SAVE20',email:'web@example.invalid',originalFils:12345},sql);
    await reserve(randomUUID());
    await expect(reserveDiscount({quote,email:'web@example.invalid',flow:'sos'},sql)).rejects.toThrow('total_limit');
    expect(await sql`SELECT id FROM discount_redemptions`).toHaveLength(1);
  });
});
