import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = () =>
  readFileSync("drizzle/0072_whatsapp_dr_nabih.sql", "utf8");

describe("WhatsApp assistant migration", () => {
  it("creates isolated conversation, event, and confirmation storage", () => {
    const sql = migration();

    expect(sql).toContain("CREATE TABLE public.whatsapp_conversations");
    expect(sql).toContain("CREATE TABLE public.whatsapp_processed_events");
    expect(sql).toContain("CREATE TABLE public.whatsapp_confirmation_snapshots");
    expect(sql).toMatch(/UNIQUE\s*\(phone_number_id, customer_wa_id\)/i);
    expect(sql).toMatch(/message_id text PRIMARY KEY/i);
  });

  it("never stores provider credentials", () => {
    expect(migration()).not.toMatch(
      /access_token|app_secret|openai_api_key/i,
    );
  });
});
