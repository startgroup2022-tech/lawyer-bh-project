import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("lib/saraya/viewings/repository.ts", "utf8");

describe("Saraya viewing repository concurrency contract", () => {
  it("locks slots before capacity claims and guards confirmed status transitions", () => {
    expect(source).toContain("FOR UPDATE OF slot");
    expect(source).toContain('eq(sarayaViewingAppointments.status, "confirmed")');
    expect(source).toContain("FOR UPDATE OF appointment, slot");
    expect(source).toContain("bookedCount: sql`${sarayaViewingSlots.bookedCount} - 1`");
  });

  it("orders unit-specific availability before property-wide availability then by time", () => {
    expect(source).toContain("CASE WHEN ${sarayaViewingSlots.unitId} IS NULL THEN 1 ELSE 0 END");
    expect(source).toMatch(/CASE WHEN[\s\S]*asc\(sarayaViewingSlots\.startAt\)/);
  });

  it("locks administrative slot updates before checking capacity and time", () => {
    expect(source).toContain("FOR UPDATE OF slot");
    expect(source).toContain("SlotCapacityConflictError");
    expect(source).toContain("SlotTimeConflictError");
  });

  it("persists and replays management commands instead of relying on the latest entity key", () => {
    expect(source).toContain("sarayaViewingCommands");
    expect(source).toContain("normalizedInputHash");
    expect(source).toContain("result:");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).not.toContain("lastCommandKey");
    expect(source).not.toContain("createIdempotencyKey");
  });

  it("looks up public retries by the globally unique key and compares the full payload", () => {
    expect(source).toContain("appointment.idempotency_key = ${idempotencyKey}");
    expect(source).not.toContain("lower(appointment.visitor_email::text) = ${visitorEmail}");
    for (const field of ["visitorName", "visitorPhone", "visitorEmail", "locale"]) {
      expect(source).toContain(`appointment.${field} === input.${field}`);
    }
  });
});
