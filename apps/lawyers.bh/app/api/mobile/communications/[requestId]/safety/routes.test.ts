import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  participant: null as null | {
    requestId: string;
    actor: { role: "client" | "lawyer"; id: string };
    peer: { role: "client" | "lawyer"; id: string; displayName: string; phone: string | null };
    capabilities: { read: true; send: boolean; call: boolean };
  },
  safety: {
    blockedByMe: false,
    blockedByPeer: false,
    chatSuspendedUntil: null as string | null,
  },
  lastReport: null as null | Record<string, unknown>,
}));

vi.mock("@/lib/communications/server-access", () => ({
  resolveRequestCommunicationAccess: vi.fn(async () => state.participant),
}));

vi.mock("@/lib/communications/safety/store", () => ({
  getCommunicationSafetyState: vi.fn(async () => state.safety),
  blockCommunicationPeer: vi.fn(async () => ({ ...state.safety, blockedByMe: true })),
  unblockCommunicationPeer: vi.fn(async () => ({ ...state.safety, blockedByMe: false })),
  createCommunicationReport: vi.fn(async (input: Record<string, unknown>) => {
    state.lastReport = input;
    return { id: "report-1", status: "open", createdAt: "2026-09-22T10:00:00.000Z" };
  }),
}));

import { DELETE, GET, POST } from "./route";
import { POST as REPORT } from "./report/route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const context = { params: Promise.resolve({ requestId }) };

describe("communication safety routes", () => {
  beforeEach(() => {
    state.participant = {
      requestId,
      actor: { role: "client", id: `client:${requestId}` },
      peer: {
        role: "lawyer",
        id: "11111111-1111-4111-8111-111111111111",
        displayName: "Lawyer",
        phone: null,
      },
      capabilities: { read: true, send: true, call: true },
    };
    state.safety = {
      blockedByMe: false,
      blockedByPeer: false,
      chatSuspendedUntil: null,
    };
    state.lastReport = null;
  });

  it("denies safety data to a non-participant", async () => {
    state.participant = null;

    const response = await GET(new Request("https://example.test"), context);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "communication_forbidden" });
  });

  it("returns server-derived safety capabilities", async () => {
    state.safety.blockedByMe = true;

    const response = await GET(new Request("https://example.test"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      safety: {
        blockedByMe: true,
        blockedByPeer: false,
        chatSuspendedUntil: null,
        capabilities: {
          read: true,
          send: false,
          attach: false,
          call: false,
          canReport: true,
          canBlock: false,
          canUnblock: true,
        },
      },
    });
  });

  it("blocks and unblocks only the authenticated peer pair", async () => {
    const blocked = await POST(new Request("https://example.test", { method: "POST" }), context);
    const unblocked = await DELETE(new Request("https://example.test", { method: "DELETE" }), context);

    expect(blocked.status).toBe(200);
    expect((await blocked.json()).safety.blockedByMe).toBe(true);
    expect(unblocked.status).toBe(200);
    expect((await unblocked.json()).safety.blockedByMe).toBe(false);
  });

  it("creates a report independently without trusting actor IDs from the body", async () => {
    const response = await REPORT(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: "harassment",
          description: "Repeated abuse",
          idempotencyKey: "4dc4659a-8b87-4e8a-b123-495727e11111",
          reporterId: "spoofed",
          reportedId: "spoofed",
        }),
      }),
      context,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      report: {
        id: "report-1",
        status: "open",
        createdAt: "2026-09-22T10:00:00.000Z",
      },
    });
    expect(state.lastReport).toEqual({
      requestId,
      reporter: state.participant!.actor,
      reported: {
        role: state.participant!.peer.role,
        id: state.participant!.peer.id,
      },
      category: "harassment",
      description: "Repeated abuse",
      idempotencyKey: "4dc4659a-8b87-4e8a-b123-495727e11111",
    });
    expect(state.safety.blockedByMe).toBe(false);
  });

  it("rejects an unsupported report category", async () => {
    const response = await REPORT(
      new Request("https://example.test", {
        method: "POST",
        body: JSON.stringify({
          category: "made_up",
          idempotencyKey: "4dc4659a-8b87-4e8a-b123-495727e11111",
        }),
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_report_category" });
  });
});
