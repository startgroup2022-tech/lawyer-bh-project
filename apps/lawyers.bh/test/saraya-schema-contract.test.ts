import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  sarayaAuditLogs,
  sarayaContacts,
  sarayaOwners,
  sarayaProperties,
  sarayaPropertyMemberships,
  sarayaTenantOrganizations,
  sarayaUnitTypes,
  sarayaUnits,
  sarayaUsers,
} from "@/lib/db/saraya-schema";

const coreTables = [
  sarayaUsers,
  sarayaProperties,
  sarayaPropertyMemberships,
  sarayaOwners,
  sarayaTenantOrganizations,
  sarayaContacts,
  sarayaUnitTypes,
  sarayaUnits,
  sarayaAuditLogs,
];

describe("Saraya schema isolation contract", () => {
  const foreignKeySignatures = (table: (typeof coreTables)[number]) =>
    getTableConfig(table).foreignKeys.map((foreignKey) => {
      const reference = foreignKey.reference();
      return {
        columns: reference.columns.map(({ name }) => name),
        foreignColumns: reference.foreignColumns.map(({ name }) => name),
        foreignTable: getTableName(reference.foreignTable),
        onDelete: foreignKey.onDelete,
      };
    });

  it("uses the saraya_ namespace for every core table", () => {
    expect(coreTables.map(getTableName).every((name) => name.startsWith("saraya_"))).toBe(true);
  });

  it("keeps Saraya users independent from Lawyers identities", () => {
    expect(getTableConfig(sarayaUsers).foreignKeys).toHaveLength(0);
  });

  it("never references a Lawyers table", () => {
    for (const table of coreTables) {
      for (const foreignKey of getTableConfig(table).foreignKeys) {
        expect(getTableName(foreignKey.reference().foreignTable)).toMatch(/^saraya_/);
      }
    }
  });

  it("allows only one membership per property and user", () => {
    const config = getTableConfig(sarayaPropertyMemberships);
    const uniqueColumnSets = config.uniqueConstraints.map((constraint) =>
      constraint.columns.map((column) => column.name).sort(),
    );

    expect(uniqueColumnSets).toContainEqual(["property_id", "user_id"]);
  });

  it("exposes property scope on tenant organizations and units", () => {
    expect(sarayaTenantOrganizations.propertyId.name).toBe("property_id");
    expect(sarayaTenantOrganizations.propertyId.notNull).toBe(true);
    expect(sarayaUnits.propertyId.name).toBe("property_id");
    expect(sarayaUnits.propertyId.notNull).toBe(true);
  });

  it("enforces same-property parties and unit references in the database", () => {
    expect(foreignKeySignatures(sarayaContacts)).toEqual(
      expect.arrayContaining([
        {
          columns: ["property_id", "tenant_organization_id"],
          foreignColumns: ["property_id", "id"],
          foreignTable: "saraya_tenant_organizations",
          onDelete: "cascade",
        },
        {
          columns: ["property_id", "owner_id"],
          foreignColumns: ["property_id", "id"],
          foreignTable: "saraya_owners",
          onDelete: "cascade",
        },
      ]),
    );
    expect(foreignKeySignatures(sarayaUnits)).toEqual(
      expect.arrayContaining([
        {
          columns: ["property_id", "unit_type_id"],
          foreignColumns: ["property_id", "id"],
          foreignTable: "saraya_unit_types",
          onDelete: "restrict",
        },
        {
          columns: ["property_id", "owner_id"],
          foreignColumns: ["property_id", "id"],
          foreignTable: "saraya_owners",
          onDelete: "restrict",
        },
      ]),
    );
  });

  it("provides property-leading indexes for scoped foreign-key lookups", () => {
    const indexSignatures = [sarayaContacts, sarayaUnits].flatMap((table) =>
      getTableConfig(table).indexes.map((tableIndex) =>
        tableIndex.config.columns.map((column) =>
          "name" in column ? column.name : undefined,
        ),
      ),
    );

    expect(indexSignatures).toEqual(
      expect.arrayContaining([
        ["property_id", "tenant_organization_id"],
        ["property_id", "owner_id"],
        ["property_id", "unit_type_id"],
      ]),
    );
  });

  it("registers the forward-only migration and verification script", () => {
    const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const journal = JSON.parse(
      readFileSync(resolve(appRoot, "drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ tag: string }> };
    const matchingEntries = journal.entries.filter(
      ({ tag }) => tag === "0062_saraya_core",
    );

    expect(matchingEntries).toHaveLength(1);
    expect(() =>
      readFileSync(resolve(appRoot, "drizzle/0062_saraya_core.sql"), "utf8"),
    ).not.toThrow();
    expect(() =>
      readFileSync(resolve(appRoot, "drizzle/verify_0062_saraya_core.sql"), "utf8"),
    ).not.toThrow();
    const verification = readFileSync(
      resolve(appRoot, "drizzle/verify_0062_saraya_core.sql"),
      "utf8",
    );
    expect(verification).toContain("saraya_contacts_property_tenant_fk");
    expect(verification).toContain("saraya_units_property_unit_type_fk");
    expect(verification).toContain("numeric_precision");
    expect(verification).toContain("delete_rule");
    expect(verification).toContain("source_columns");
    expect(verification).toContain("target_columns");
    expect(verification).toContain("saraya_property_memberships', ARRAY['property_id']");
    expect(verification).toContain("saraya_units', ARRAY['property_id', 'unit_type_id']");
    expect(verification).toContain("source_attribute.attname::text");
    expect(verification).toContain("target_attribute.attname::text");
  });
});
