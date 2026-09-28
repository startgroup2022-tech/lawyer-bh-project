import { describe, expect, it } from "vitest";

import { createEscalationPushStore } from "./escalation-push-store";

describe("admin escalation push store", () => {
  it("claims only due rows and returns the incremented attempt count", async () => {
    const queries: string[] = [];
    const sql = async (parts: TemplateStringsArray) => {
      const query = parts.join("?");
      queries.push(query);
      return [{ id: "outbox-1", request_id: "request-1", report_id: null, event_type: "admin_request_escalated", attempt_count: 2, created_at: new Date("2026-09-20T10:00:00Z") }];
    };
    const store = createEscalationPushStore(sql as never);
    expect(await store.claim(50, new Date("2026-09-20T10:01:00Z"))).toEqual([
      { id: "outbox-1", requestId: "request-1", reportId: null, eventType: "admin_request_escalated", attemptCount: 2, createdAt: new Date("2026-09-20T10:00:00Z") },
    ]);
    expect(queries[0]).toContain("FOR UPDATE SKIP LOCKED");
    expect(queries[0]).toContain("lease_expires_at");
  });

  it("filters inactive and unpermitted admins before delivery", async () => {
    const queries: string[] = [];
    const sql = async (parts: TemplateStringsArray) => {
      queries.push(parts.join("?"));
      return [
      { fcm_token: "allowed", locale: "ar", role: "admin", is_active: true, permissions: { manage_requests: true } },
      { fcm_token: "disabled", locale: "ar", role: "super_admin", is_active: false, permissions: {} },
      { fcm_token: "unpermitted", locale: "en", role: "admin", is_active: true, permissions: {} },
      { fcm_token: "super", locale: "en", role: "super_admin", is_active: true, permissions: {} },
      ];
    };
    const store = createEscalationPushStore(sql as never);
    expect(await store.recipients({ id: "outbox-1", requestId: "request-1", eventType: "admin_request_escalated", attemptCount: 1, createdAt: new Date() })).toEqual([
      { token: "allowed", locale: "ar" }, { token: "super", locale: "en" },
    ]);
    expect(queries[0]).toContain("session.expires_at > now()");
  });
});
