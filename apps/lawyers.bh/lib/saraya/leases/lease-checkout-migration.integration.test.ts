import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const configuredUrl = process.env.DATABASE_URL;
const localUrl = configuredUrl && ["127.0.0.1", "localhost"].includes(new URL(configuredUrl).hostname) ? configuredUrl : null;
const migrations = ["0062_saraya_core", "0063_saraya_auth", "0064_saraya_leases", "0066_saraya_shared_office_parts", "0070_saraya_public_catalog", "0075_saraya_rental_finance", "0118_saraya_documents", "0122_saraya_public_rental_checkout", "0124_saraya_rental_payments", "0125_saraya_payment_hardening", "0126_saraya_offline_payment_reference"];
const scopedMigration = (name: string, schemaName: string) => readFileSync(`drizzle/${name}.sql`, "utf8").replace(/^BEGIN;$/gm, "").replace(/^COMMIT;$/gm, "").replace(/^SET LOCAL lock_timeout = '5s';$/gm, "").replace(/^CREATE EXTENSION .*;$/gm, "").replaceAll("citext", "text").replaceAll("public.", `"${schemaName}".`).replaceAll('"public".', `"${schemaName}".`);

describe.skipIf(!localUrl)("0126 identity preflight against PostgreSQL", () => {
  let admin: ReturnType<typeof postgres>;
  const schemas: string[] = [];

  beforeAll(() => { admin = postgres(localUrl!, { max: 1, onnotice: () => {} }); });
  afterAll(async () => {
    for (const schemaName of schemas) await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`;
    await admin.end();
  });

  async function databaseBefore0126() {
    const schemaName = `saraya_0126_${randomUUID().replaceAll("-", "")}`;
    schemas.push(schemaName);
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    const database = postgres(localUrl!, { max: 1, connection: { search_path: `${schemaName},public` }, onnotice: () => {} });
    for (const migration of migrations) await database.unsafe(scopedMigration(migration, schemaName));
    return { database, schemaName };
  }

  it("fails actionably before indexing duplicate normalized registrations", async () => {
    const { database, schemaName } = await databaseBefore0126();
    const propertyId = randomUUID();
    await database`INSERT INTO saraya_properties(id,code,name_ar,name_en) VALUES (${propertyId},'DUPREG','عقار','Property')`;
    await database`INSERT INTO saraya_tenant_organizations(property_id,name_ar,name_en,registration_number) VALUES (${propertyId},'أ','A','CR 100'),(${propertyId},'ب','B',' cr100 ')`;
    await expect(database.unsafe(scopedMigration("0127_saraya_lease_checkout_signing", schemaName))).rejects.toMatchObject({ message: expect.stringContaining("duplicate normalized tenant registration") });
    await database.end();
  });

  it("fails actionably when one verified user is linked to different organizations", async () => {
    const { database, schemaName } = await databaseBefore0126();
    const propertyId = randomUUID(), userId = randomUUID(), firstOrg = randomUUID(), secondOrg = randomUUID();
    await database`INSERT INTO saraya_properties(id,code,name_ar,name_en) VALUES (${propertyId},'DUPUSER','عقار','Property')`;
    await database`INSERT INTO saraya_users(id,normalized_email,display_name_ar,display_name_en) VALUES (${userId},'duplicate@example.test','مستخدم','User')`;
    await database`INSERT INTO saraya_tenant_organizations(id,property_id,name_ar,name_en,registration_number) VALUES (${firstOrg},${propertyId},'أ','A','CR-A'),(${secondOrg},${propertyId},'ب','B','CR-B')`;
    await database`INSERT INTO saraya_contacts(property_id,tenant_organization_id,user_id,name) VALUES (${propertyId},${firstOrg},${userId},'User'),(${propertyId},${secondOrg},${userId},'User')`;
    await expect(database.unsafe(scopedMigration("0127_saraya_lease_checkout_signing", schemaName))).rejects.toMatchObject({ message: expect.stringContaining("verified user is linked to multiple tenant organizations") });
    await database.end();
  });
});
