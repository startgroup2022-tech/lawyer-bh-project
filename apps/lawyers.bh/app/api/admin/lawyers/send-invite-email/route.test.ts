import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ allowed: false }));

vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: vi.fn(async () => auth.allowed),
}));

import { POST } from "./route";

describe("admin lawyer invitation email route", () => {
  beforeEach(() => {
    auth.allowed = false;
  });

  it("rejects email sending without manage_lawyers permission", async () => {
    const response = await POST(new Request("https://lawyers.bh/api/admin/lawyers/send-invite-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "lawyer@example.com",
        subject: "Invitation",
        html: "<p>Invitation</p>",
      }),
    }));

    expect(response.status).toBe(403);
  });
});
