import { describe, expect, it, vi } from "vitest";
import { CallTransitionError, createCallStore } from "./call-store";

const call = { id: "call-1", requestId: "request-1", initiatorRole: "client" as const, initiatorId: "client-1", mediaKind: "video" as const, status: "ringing" as const, ringingAt: new Date("2026-08-25T10:00:00Z"), acceptedAt: null, connectedAt: null, endedAt: null, durationSeconds: null, endReason: null, endedByRole: null };

describe("communication call store", () => {
  it.each([
    ["ringing", "accepted"], ["ringing", "rejected"], ["ringing", "missed"], ["ringing", "cancelled"],
    ["accepted", "connected"], ["accepted", "ended"], ["accepted", "failed"],
    ["connected", "ended"], ["connected", "failed"],
  ] as const)("allows %s to transition to %s", async (from, to) => {
    const transition = vi.fn(async () => ({ ...call, status: to }));
    const store = createCallStore({ create: vi.fn(), get: vi.fn(async () => ({ ...call, status: from })), transition });
    await store.transitionCall({ callId: call.id, to, actorRole: "client", at: new Date("2026-08-25T10:01:00Z") });
    expect(transition).toHaveBeenCalledOnce();
  });

  it.each([["ended", "connected"], ["rejected", "accepted"], ["ringing", "connected"], ["connected", "accepted"]] as const)("rejects %s to %s", async (from, to) => {
    const transition = vi.fn();
    const store = createCallStore({ create: vi.fn(), get: vi.fn(async () => ({ ...call, status: from })), transition });
    await expect(store.transitionCall({ callId: call.id, to, actorRole: "lawyer", at: new Date() })).rejects.toBeInstanceOf(CallTransitionError);
    expect(transition).not.toHaveBeenCalled();
  });

  it("treats an already reached state as idempotent", async () => {
    const current = { ...call, status: "ended" as const };
    const transition = vi.fn();
    const store = createCallStore({ create: vi.fn(), get: vi.fn(async () => current), transition });
    await expect(store.transitionCall({ callId: call.id, to: "ended", actorRole: "client", at: new Date() })).resolves.toBe(current);
    expect(transition).not.toHaveBeenCalled();
  });
});
