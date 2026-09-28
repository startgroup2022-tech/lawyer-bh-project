import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import type { AccountProjection } from "./account";
import { createAccountHandlers } from "./handlers";

const principal: SarayaPrincipal = {
  userId: "user-1",
  sessionId: "session-1",
  propertyIds: ["property-1"],
  memberships: [{ propertyId: "property-1", role: "property_manager" }],
};

const profile: AccountProjection = {
  id: "user-1",
  displayNameAr: "أحمد",
  displayNameEn: "Ahmed",
  email: "ahmed@example.com",
  phone: "+97333333333",
  memberships: [{
    propertyId: "property-1",
    propertyNameAr: "سرايا سكوير",
    propertyNameEn: "Saraya Square",
    role: "property_manager",
  }],
};

function fixture() {
  const service = {
    get: vi.fn(async () => profile),
    update: vi.fn(async () => ({ ...profile, displayNameEn: "Ahmed Ali" })),
    changePassword: vi.fn(async () => undefined),
  };
  return {
    service,
    handlers: createAccountHandlers({
      authenticate: async () => principal,
      service,
    }),
  };
}

describe("Saraya account handlers", () => {
  it("returns the authenticated account projection", async () => {
    const { handlers } = fixture();
    const response = await handlers.get(
      new Request("http://localhost/api/saraya/v1/account"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(profile);
  });

  it("uses the authenticated user for profile updates", async () => {
    const { handlers, service } = fixture();
    const response = await handlers.update(
      new Request("http://localhost/api/saraya/v1/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayNameAr: "أحمد علي",
          displayNameEn: "Ahmed Ali",
          email: "ahmed@example.com",
          phone: "+97333333333",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith("user-1", {
      displayNameAr: "أحمد علي",
      displayNameEn: "Ahmed Ali",
      email: "ahmed@example.com",
      phone: "+97333333333",
      currentPassword: undefined,
    });
  });

  it("passes the current session when changing the password", async () => {
    const { handlers, service } = fixture();
    const response = await handlers.changePassword(
      new Request("http://localhost/api/saraya/v1/account/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "current-password",
          newPassword: "new-password-123",
        }),
      }),
    );
    expect(response.status).toBe(204);
    expect(service.changePassword).toHaveBeenCalledWith(
      "user-1",
      "session-1",
      {
        currentPassword: "current-password",
        newPassword: "new-password-123",
      },
    );
  });
});
