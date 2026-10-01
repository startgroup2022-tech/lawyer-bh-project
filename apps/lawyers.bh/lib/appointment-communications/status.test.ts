import { describe, expect, it } from "vitest";

import {
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  canTransition,
  isActive,
  isTerminal,
  type AppointmentActorRole,
  type AppointmentStatus,
} from "./status";

const roles: AppointmentActorRole[] = ["client", "lawyer", "admin"];
const statuses: AppointmentStatus[] = [
  "pending_review",
  "approved",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
];

describe("appointment lifecycle state machine", () => {
  it("lets either party cancel an active appointment", () => {
    for (const from of ["pending_review", "approved", "confirmed", "in_progress"] as AppointmentStatus[]) {
      expect(canTransition(from, "cancelled", "client")).toBe(true);
      expect(canTransition(from, "cancelled", "lawyer")).toBe(true);
    }
  });

  it("only the lawyer or an admin starts and completes a consultation", () => {
    expect(canTransition("confirmed", "in_progress", "client")).toBe(false);
    expect(canTransition("confirmed", "in_progress", "lawyer")).toBe(true);
    expect(canTransition("in_progress", "completed", "client")).toBe(false);
    expect(canTransition("in_progress", "completed", "lawyer")).toBe(true);
    expect(canTransition("in_progress", "completed", "admin")).toBe(true);
  });

  it("never moves an appointment out of a terminal state", () => {
    for (const from of TERMINAL_STATUSES) {
      for (const to of statuses) {
        if (to === from) continue;
        for (const role of roles) {
          expect(canTransition(from, to, role)).toBe(false);
        }
      }
    }
  });

  it("only an admin rejects a pending request", () => {
    expect(canTransition("pending_review", "rejected", "client")).toBe(false);
    expect(canTransition("pending_review", "rejected", "lawyer")).toBe(false);
    expect(canTransition("pending_review", "rejected", "admin")).toBe(true);
  });

  it("treats a same-status transition as a no-op for every role", () => {
    for (const status of statuses) {
      for (const role of roles) {
        expect(canTransition(status, status, role)).toBe(true);
      }
    }
  });

  it("classifies active and terminal statuses consistently", () => {
    for (const status of ACTIVE_STATUSES) {
      expect(isActive(status)).toBe(true);
      expect(isTerminal(status)).toBe(false);
    }
    for (const status of TERMINAL_STATUSES) {
      expect(isTerminal(status)).toBe(true);
      expect(isActive(status)).toBe(false);
    }
    expect(isActive("not-a-status")).toBe(false);
    expect(isTerminal("not-a-status")).toBe(false);
  });
});
