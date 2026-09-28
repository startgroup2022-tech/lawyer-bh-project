import { describe, expect, it } from "vitest";

import { createAdminInstallationStore } from "./push-installations-store";

describe("admin push installation persistence", () => {
  it("stores one token for the authenticated admin and removes only its owner", async () => {
    const owners = new Map<string, string>();
    const sql = async (parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("?");
      if (query.includes("INSERT INTO public.mobile_admin_push_installations")) {
        owners.set(String(values[0]), String(values[1]));
      } else if (query.includes("DELETE FROM public.mobile_admin_push_installations")) {
        if (owners.get(String(values[0])) === String(values[1])) owners.delete(String(values[0]));
      }
      return [];
    };
    const store = createAdminInstallationStore(sql as never);
    await store.upsert({ adminId: "admin-a", sessionDigest: "session-a", token: "fcm-token-123", platform: "ios", locale: "ar" });
    await store.upsert({ adminId: "admin-b", sessionDigest: "session-b", token: "fcm-token-123", platform: "ios", locale: "ar" });
    await store.remove({ adminId: "admin-a", token: "fcm-token-123" });
    expect(owners.get("fcm-token-123")).toBe("admin-b");
    await store.remove({ adminId: "admin-b", token: "fcm-token-123" });
    expect(owners.size).toBe(0);
  });
});
