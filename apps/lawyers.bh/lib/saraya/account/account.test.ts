import { describe, expect, it } from "vitest";
import { ApiError } from "../auth/contracts";
import {
  createAccountService,
  type AccountDependencies,
  type AccountRecord,
} from "./account";

const account: AccountRecord = {
  id: "user-1",
  displayNameAr: "أحمد",
  displayNameEn: "Ahmed",
  email: "ahmed@example.com",
  phone: "+97333333333",
  passwordHash: "current-hash",
  memberships: [{
    propertyId: "property-1",
    propertyNameAr: "سرايا سكوير",
    propertyNameEn: "Saraya Square",
    role: "property_manager",
    propertyCode: "INTERNAL-CODE",
    isActive: true,
  } as AccountRecord["memberships"][number]],
};

function fixture(overrides: Partial<AccountDependencies> = {}) {
  let stored = { ...account };
  const revokedExcept: Array<[string, string]> = [];
  const deps: AccountDependencies = {
    find: async () => stored,
    update: async (_userId, input) => {
      stored = { ...stored, ...input };
      return stored;
    },
    verify: async (plain, hash) =>
      plain === "current-password" && hash === "current-hash",
    hash: async (plain) => `hashed:${plain}`,
    changePasswordAndRevokeOthers: async (userId, sessionId, passwordHash) => {
      stored = { ...stored, passwordHash };
      revokedExcept.push([userId, sessionId]);
    },
    ...overrides,
  };
  return { service: createAccountService(deps), revokedExcept, stored: () => stored };
}

describe("Saraya account service", () => {
  it("returns an account projection without its password hash", async () => {
    const result = await fixture().service.get(account.id);
    expect(result).toEqual({
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
    });
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.memberships[0]).toEqual({
      propertyId: "property-1",
      propertyNameAr: "سرايا سكوير",
      propertyNameEn: "Saraya Square",
      role: "property_manager",
    });
    expect(result.memberships[0]).not.toHaveProperty("propertyCode");
    expect(result.memberships[0]).not.toHaveProperty("isActive");
  });

  it("updates names without re-authentication", async () => {
    const result = await fixture().service.update(account.id, {
      displayNameAr: " أحمد علي ",
      displayNameEn: " Ahmed Ali ",
      email: account.email,
      phone: account.phone,
    });
    expect(result.displayNameAr).toBe("أحمد علي");
    expect(result.displayNameEn).toBe("Ahmed Ali");
  });

  it("requires the current password when a login identity changes", async () => {
    const promise = fixture().service.update(account.id, {
      displayNameAr: account.displayNameAr,
      displayNameEn: account.displayNameEn,
      email: "new@example.com",
      phone: account.phone,
    });
    await expect(promise).rejects.toMatchObject({
      code: "CURRENT_PASSWORD_REQUIRED",
      status: 422,
    });
  });

  it("rejects an incorrect current password", async () => {
    const promise = fixture().service.update(account.id, {
      displayNameAr: account.displayNameAr,
      displayNameEn: account.displayNameEn,
      email: "new@example.com",
      phone: account.phone,
      currentPassword: "wrong-password",
    });
    await expect(promise).rejects.toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
      status: 401,
    });
  });

  it("requires at least one email or phone identity", async () => {
    const promise = fixture().service.update(account.id, {
      displayNameAr: account.displayNameAr,
      displayNameEn: account.displayNameEn,
      email: null,
      phone: null,
      currentPassword: "current-password",
    });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: "IDENTITY_REQUIRED" });
  });

  it("hashes the new password and revokes every session except the current one", async () => {
    const context = fixture();
    await context.service.changePassword(account.id, "session-current", {
      currentPassword: "current-password",
      newPassword: "new-password-123",
    });
    expect(context.stored().passwordHash).toBe("hashed:new-password-123");
    expect(context.revokedExcept).toEqual([["user-1", "session-current"]]);
  });
});
