import { describe, expect, it } from "vitest";
import { transitionLease } from "./state-machine";

const context = { now: new Date("2026-09-06T10:00:00Z"), actorUserId: "actor" };
const renewalTerms = { startDate: "2027-01-01", endDate: "2027-12-31", rentAmount: "1200.000", depositAmount: "500.000", frequency: "annual" as const, dueDay: 1, graceDays: 5, discountAmount: "0.000", feeAmount: "0.000" };

describe("transitionLease", () => {
  it.each([
    ["draft", "submit", "pending_approval"],
    ["pending_approval", "approve", "active"],
    ["pending_approval", "reject", "rejected"],
    ["active", "request_renewal", "renewal_requested"],
    ["renewal_requested", "approve_renewal", "active"],
    ["renewal_requested", "reject_renewal", "active"],
    ["active", "terminate", "terminated"],
    ["terminated", "close", "closed"],
  ] as const)("allows %s -> %s -> %s", (current, command, expected) => {
    const input = command === "approve_renewal" ? { type: command, terms: renewalTerms } as const : { type: command } as Parameters<typeof transitionLease>[1];
    expect(transitionLease(current, input, context).status).toBe(expected);
  });

  it.each([
    ["draft", "approve"], ["draft", "close"], ["pending_approval", "terminate"],
    ["active", "approve"], ["renewal_requested", "close"], ["rejected", "submit"],
    ["terminated", "terminate"], ["closed", "request_renewal"],
  ] as const)("forbids %s -> %s", (current, command) => {
    expect(() => transitionLease(current, { type: command } as unknown as Parameters<typeof transitionLease>[1], context)).toThrowError(
      expect.objectContaining({ code: "LEASE_TRANSITION_DENIED" }),
    );
  });

  it("requires renewal terms on approval and returns an immutable version payload", () => {
    const result = transitionLease("renewal_requested", { type: "approve_renewal", terms: renewalTerms }, context);
    expect(result.version).toMatchObject({ version: 2, terms: renewalTerms, createdByUserId: "actor" });
    expect(Object.isFrozen(result.version)).toBe(true);
  });
});
