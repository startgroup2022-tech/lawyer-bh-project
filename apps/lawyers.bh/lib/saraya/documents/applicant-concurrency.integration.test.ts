import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";
import type { SarayaPrincipal } from "../auth/contracts";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db/client", () => ({ db: state.db }));

const configuredUrl = process.env.DATABASE_URL;
const localUrl = configuredUrl && ["127.0.0.1", "localhost"].includes(new URL(configuredUrl).hostname) ? configuredUrl : null;
const scopedMigration = (path: string, schemaName: string) => readFileSync(path, "utf8")
  .replace(/^BEGIN;$/gm, "").replace(/^COMMIT;$/gm, "").replace(/^SET LOCAL lock_timeout = '5s';$/gm, "")
  .replace(/^CREATE EXTENSION .*;$/gm, "").replaceAll("citext", "text").replaceAll("public.", `"${schemaName}".`).replaceAll('"public".', `"${schemaName}".`);

describe.skipIf(!localUrl)("applicant document idempotency against PostgreSQL", () => {
  let admin: ReturnType<typeof postgres>;
  let database: ReturnType<typeof postgres>;
  const schemaName = `saraya_upload_${randomUUID().replaceAll("-", "")}`;
  const propertyId = randomUUID(), unitId = randomUUID(), userId = randomUUID();
  const files = new Map<string, Uint8Array>();

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    database = postgres(localUrl!, { max: 8, connection: { search_path: `${schemaName},public` }, onnotice: () => {} });
    for (const migration of ["0062_saraya_core", "0063_saraya_auth", "0064_saraya_leases", "0066_saraya_shared_office_parts", "0070_saraya_public_catalog", "0075_saraya_rental_finance", "0118_saraya_documents", "0122_saraya_public_rental_checkout", "0128_saraya_applicant_document_idempotency"]) {
      await database.unsafe(scopedMigration(`drizzle/${migration}.sql`, schemaName));
    }
    state.db = drizzle(database, { schema });
    await database`INSERT INTO saraya_users(id,normalized_email,display_name_ar,display_name_en) VALUES (${userId},'upload@test','مستأجر','Tenant')`;
    await database`INSERT INTO saraya_properties(id,code,name_ar,name_en) VALUES (${propertyId},'UP','سرايا','Saraya')`;
    const typeId = randomUUID();
    await database`INSERT INTO saraya_unit_types(id,property_id,name_ar,name_en) VALUES (${typeId},${propertyId},'مكتب','Office')`;
    await database`INSERT INTO saraya_units(id,property_id,unit_type_id,unit_number,status,is_public_listing,is_rentable,market_rent) VALUES (${unitId},${propertyId},${typeId},'101','vacant',true,true,'1.000')`;
  });

  afterAll(async () => { await database?.end(); if (admin) { await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`; await admin.end(); } });

  it("returns the winning record for concurrent identical keys and cleans loser blob", async () => {
    const { createApplicantDocumentHandler } = await import("./applicant-http");
    const { documentRepository } = await import("./repository");
    const { createDocumentService } = await import("./service");
    const storage = {
      async put(input: { key: string; body: Uint8Array }) { files.set(input.key, input.body); },
      async delete(key: string) { files.delete(key); },
      async signedReadUrl() { return "https://private.test"; },
    };
    const service = createDocumentService(documentRepository, storage);
    const principal: SarayaPrincipal = { userId, sessionId: "s", propertyIds: [], memberships: [] };
    const handler = createApplicantDocumentHandler({
      authenticate: async () => principal, clientIp: () => "203.0.113.8",
      findReplay: service.findApplicantReplay,
      reserveApplicantUpload: service.reserveApplicantUpload,
      createApplicant: service.createApplicant,
    });
    const request = (key: string, bytes: number[]) => {
      const form = new FormData();
      form.set("category", "identity"); form.set("title", "Identity");
      form.set("file", new File([new Uint8Array(bytes)], "id.pdf", { type: "application/pdf" }));
      return new Request("https://sq.lawyers.bh/api/saraya/v1/public/upload", { method: "POST", headers: { "idempotency-key": key }, body: form });
    };
    const [first, second] = await Promise.all([
      handler(request("same-key", [37, 80, 68, 70]), unitId),
      handler(request("same-key", [37, 80, 68, 70]), unitId),
    ]);
    expect(await first.json()).toEqual(await second.json());
    expect(await database`SELECT count(*)::int AS count FROM saraya_documents WHERE applicant_idempotency_key='same-key'`).toEqual([{ count: 1 }]);
    expect(files.size).toBe(1);

    const conflict = await Promise.all([
      handler(request("conflict-key", [37, 80, 68, 70]), unitId),
      handler(request("conflict-key", [37, 80, 68, 70, 49]), unitId),
    ]);
    expect(conflict.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(files.size).toBe(2);
  });
});
