import { describe, expect, it } from "vitest";

import {
  registerAdminInstallation,
  removeAdminInstallation,
  type AdminInstallationStore,
} from "./push-installations-core";

function memoryStore() {
  const owners = new Map<string, string>();
  const store: AdminInstallationStore = {
    async upsert(input) { owners.set(input.token, input.adminId); },
    async remove(input) {
      if (owners.get(input.token) === input.adminId) owners.delete(input.token);
    },
  };
  return { owners, store };
}

describe("admin push installations", () => {
  it("moves a device token to the newly signed-in admin", async () => {
    const { owners, store } = memoryStore();
    await registerAdminInstallation({ adminId: "admin-a", sessionDigest: "session-a", token: "fcm-token-123", platform: "ios", locale: "ar" }, store);
    await registerAdminInstallation({ adminId: "admin-b", sessionDigest: "session-b", token: "fcm-token-123", platform: "android", locale: "en" }, store);
    expect(owners.get("fcm-token-123")).toBe("admin-b");
  });

  it("does not remove another admin's current binding on stale logout", async () => {
    const { owners, store } = memoryStore();
    await registerAdminInstallation({ adminId: "admin-a", sessionDigest: "session-a", token: "fcm-token-123", platform: "ios", locale: "ar" }, store);
    await registerAdminInstallation({ adminId: "admin-b", sessionDigest: "session-b", token: "fcm-token-123", platform: "ios", locale: "ar" }, store);
    await removeAdminInstallation({ adminId: "admin-a", token: "fcm-token-123" }, store);
    expect(owners.get("fcm-token-123")).toBe("admin-b");
  });

  it("rejects malformed tokens and unsupported platforms before persistence", async () => {
    const { owners, store } = memoryStore();
    await expect(registerAdminInstallation({ adminId: "admin-a", sessionDigest: "session-a", token: " ", platform: "ios", locale: "ar" }, store))
      .rejects.toThrow("invalid_admin_push_installation");
    await expect(registerAdminInstallation({ adminId: "admin-a", sessionDigest: "session-a", token: "fcm-token-123", platform: "web" as "ios", locale: "ar" }, store))
      .rejects.toThrow("invalid_admin_push_installation");
    expect(owners.size).toBe(0);
  });
});
