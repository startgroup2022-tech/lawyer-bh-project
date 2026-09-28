import { describe, expect, it } from "vitest";

import { createPaidRequestNotificationStore } from "./paid-request-notification-store";

describe("paid request notification store", () => {
  it("returns only active request administrators with live registered devices", async () => {
    const queries: string[] = [];
    const sql = async (parts: TemplateStringsArray) => {
      queries.push(parts.join("?"));
      return [
        { fcm_token: "admin-token", locale: "ar", role: "admin", is_active: true, permissions: { manage_requests: true } },
        { fcm_token: "reviewer-token", locale: "en", role: "reviewer", is_active: true, permissions: [] },
        { fcm_token: "inactive-token", locale: "ar", role: "admin", is_active: false, permissions: ["manage_requests"] },
      ];
    };
    const recipients = await createPaidRequestNotificationStore(sql as never).recipients();
    expect(recipients).toEqual([{ token: "admin-token", locale: "ar" }]);
    expect(queries[0]).toContain("session.expires_at > now()");
    expect(queries[0]).toContain("admin.is_active = true");
  });
});
