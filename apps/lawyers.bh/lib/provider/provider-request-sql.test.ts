import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { emergencyRequests } from "@/lib/db/schema";
import { confirmedProviderPaymentSql } from "./provider-request-sql";

describe("confirmedProviderPaymentSql", () => {
  it("casts enum-compatible payment fields to text before trimming", () => {
    const dialect = new PgDialect();
    const query = dialect.sqlToQuery(
      confirmedProviderPaymentSql(
        emergencyRequests.paymentStatus,
        emergencyRequests.tapStatus,
      ),
    );

    expect(query.sql).toContain('"payment_status"::text');
    expect(query.sql).toContain('"tap_status"::text');
    expect(query.sql).toContain("trim");
  });
});
