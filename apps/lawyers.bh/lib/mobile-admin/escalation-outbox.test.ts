import { describe, expect, it } from "vitest";

import { markEscalatedAndEnqueue } from "./escalation-outbox";

function fakeDatabase(updated: boolean) {
  const statements: string[] = [];
  const sql = Object.assign(
    async (parts: TemplateStringsArray) => {
      const statement = parts.join("?");
      statements.push(statement);
      return statement.includes("UPDATE public.bahrain_emergency_requests")
        ? (updated ? [{ id: "request-1" }] : []) : [];
    },
    { begin: async (callback: (transaction: unknown) => Promise<boolean>) => callback(sql) },
  );
  return { sql, statements };
}

describe("escalation transition and notification outbox", () => {
  it("enqueues exactly when a paid unassigned request is newly escalated", async () => {
    const db = fakeDatabase(true);
    expect(await markEscalatedAndEnqueue(db.sql as never, "request-1")).toBe(true);
    expect(db.statements).toHaveLength(2);
    expect(db.statements[0]).toContain("payment_status = 'success'");
    expect(db.statements[0]).toContain("tap_status = 'CAPTURED'");
    expect(db.statements[0]).toContain("service_status = 'pending'");
    expect(db.statements[1]).toContain("INSERT INTO public.mobile_admin_escalation_outbox");
  });

  it("does not enqueue when the transition loses a race", async () => {
    const db = fakeDatabase(false);
    expect(await markEscalatedAndEnqueue(db.sql as never, "request-1")).toBe(false);
    expect(db.statements).toHaveLength(1);
  });
});
