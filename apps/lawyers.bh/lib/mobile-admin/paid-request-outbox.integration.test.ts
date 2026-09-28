import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const url = process.env.PAID_REQUEST_NOTIFICATION_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    parsed.port !== "5433" ||
    parsed.pathname !== "/lawyers_bh"
  ) {
    throw new Error("Use only the isolated local Lawyers.bh test database");
  }
}

describe.skipIf(!url)("paid request notification transition trigger", () => {
  const schema = `paid_notice_${randomUUID().replaceAll("-", "")}`;
  const sql = postgres(url ?? "postgres://127.0.0.1:5433/lawyers_bh", {
    connection: { search_path: schema, timezone: "UTC" },
    max: 2,
  });

  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(`
      CREATE TABLE ${schema}.bahrain_emergency_requests (
        id uuid PRIMARY KEY,
        payment_status text NOT NULL DEFAULT 'pending',
        tap_status text,
        service_status text NOT NULL DEFAULT 'pending'
      )
    `);
    const migration = await readFile(
      "drizzle/0108_paid_request_admin_notifications.sql",
      "utf8",
    );
    await sql.unsafe(migration.replaceAll("public.", `${schema}.`));
  });

  beforeEach(async () => {
    await sql`DELETE FROM mobile_admin_paid_request_outbox`;
    await sql`DELETE FROM bahrain_emergency_requests`;
  });

  afterAll(async () => {
    try {
      await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await sql.end();
    }
  });

  it("enqueues exactly once on the first paid and captured transition", async () => {
    const id = randomUUID();
    await sql`INSERT INTO bahrain_emergency_requests (id) VALUES (${id})`;

    await sql`UPDATE bahrain_emergency_requests SET payment_status='success', tap_status='INITIATED' WHERE id=${id}`;
    expect(await sql`SELECT * FROM mobile_admin_paid_request_outbox`).toHaveLength(0);

    await sql`UPDATE bahrain_emergency_requests SET tap_status='CAPTURED' WHERE id=${id}`;
    await sql`UPDATE bahrain_emergency_requests SET tap_status='CAPTURED' WHERE id=${id}`;

    const rows = await sql`SELECT request_id, email_status, push_status FROM mobile_admin_paid_request_outbox`;
    expect(rows).toEqual([{ request_id: id, email_status: "pending", push_status: "pending" }]);
  });

  it("does not enqueue cancelled, failed, pending, or historical paid requests", async () => {
    const cancelled = randomUUID();
    const failed = randomUUID();
    const pending = randomUUID();
    await sql`INSERT INTO bahrain_emergency_requests (id, service_status) VALUES (${cancelled}, 'cancelled')`;
    await sql`INSERT INTO bahrain_emergency_requests (id) VALUES (${failed}), (${pending})`;
    await sql`UPDATE bahrain_emergency_requests SET payment_status='success', tap_status='CAPTURED' WHERE id=${cancelled}`;
    await sql`UPDATE bahrain_emergency_requests SET payment_status='failed', tap_status='CAPTURED' WHERE id=${failed}`;
    await sql`UPDATE bahrain_emergency_requests SET payment_status='success', tap_status='PENDING' WHERE id=${pending}`;

    expect(await sql`SELECT request_id FROM mobile_admin_paid_request_outbox`).toEqual([]);
  });
});
