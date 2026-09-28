import { describe, expect, it } from "vitest";

import { buildAdminEscalationMessage, buildAdminModerationMessage, drainAdminEscalationPush, type EscalationPushDependencies } from "./escalation-push";

const event = { id: "outbox-1", requestId: "request-1", attemptCount: 1, createdAt: new Date("2026-09-20T10:00:00Z") };

describe("admin escalation push", () => {
  it("contains only a safe request pointer, never case or payment details", () => {
    const message = buildAdminEscalationMessage("request-1", "ar");
    expect(message.data).toEqual({ eventType: "admin_request_escalated", requestId: "request-1" });
    expect(JSON.stringify(message)).not.toMatch(/phone|address|payment|customer|description/i);
  });

  it("notifies moderation admins without report text or chat excerpts", () => {
    const message = buildAdminModerationMessage("request-1", "report-1", "en");
    expect(message.notification).toEqual({ title: "New chat safety report", body: "Open moderation to review the report." });
    expect(message.data).toEqual({ eventType: "moderation_report", requestId: "request-1", reportId: "report-1" });
    expect(JSON.stringify(message)).not.toMatch(/description|message|excerpt|phone|address/i);
  });

  it("delivers to active permitted admin devices and records completion", async () => {
    const completed: string[] = [];
    const sent: string[][] = [];
    const deps: EscalationPushDependencies = {
      claim: async () => [event],
      recipients: async () => [{ token: "device-a", locale: "ar" }, { token: "device-b", locale: "en" }],
      send: async (tokens) => { sent.push(tokens); return { successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) }; },
      markDelivered: async (id) => { completed.push(id); },
      markRetry: async () => { throw new Error("must not retry"); },
      prune: async () => undefined,
    };
    const result = await drainAdminEscalationPush(deps, new Date("2026-09-20T10:01:00Z"), 50);
    expect(result).toEqual({ claimed: 1, delivered: 1, retried: 0 });
    expect(completed).toEqual(["outbox-1"]);
    expect(sent).toEqual([["device-a"], ["device-b"]]);
  });

  it("retries an event when Firebase fails without changing the request", async () => {
    const retries: Array<{ id: string; terminal: boolean }> = [];
    const deps: EscalationPushDependencies = {
      claim: async () => [event],
      recipients: async () => [{ token: "device-a", locale: "ar" }],
      send: async () => { throw new Error("firebase offline"); },
      markDelivered: async () => { throw new Error("must not complete"); },
      markRetry: async (input) => { retries.push({ id: input.id, terminal: input.terminal }); },
      prune: async () => undefined,
    };
    expect(await drainAdminEscalationPush(deps, new Date("2026-09-20T10:01:00Z"), 50))
      .toEqual({ claimed: 1, delivered: 0, retried: 1 });
    expect(retries).toEqual([{ id: "outbox-1", terminal: false }]);
  });
});
