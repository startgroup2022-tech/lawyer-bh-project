import { describe, expect, it } from "vitest";
import { parseAdminUserCreate, parseAdminUserUpdate } from "./admin-user-validation";

describe("admin user validation", () => {
  it("normalizes create values and strips manage_admins", () => {
    expect(parseAdminUserCreate({
      fullName: "  Test Admin ", email: "TEST@EXAMPLE.COM", password: "StrongPass123!",
      role: "super_admin",
      permissions: { manage_discounts: true, manage_admins: true, unknown: true },
    })).toEqual({
      fullName: "Test Admin", email: "test@example.com", password: "StrongPass123!",
      role: "super_admin", permissions: { manage_discounts: true },
    });
  });

  it("rejects roles that cannot be managed from this page", () => {
    expect(() => parseAdminUserCreate({ fullName: "Admin", email: "a@b.com", password: "StrongPass123!", role: "reviewer" })).toThrow("invalid_role");
    expect(() => parseAdminUserUpdate({ role: "owner" })).toThrow("invalid_role");
  });

  it("rejects weak passwords", () => {
    expect(() => parseAdminUserCreate({ fullName: "Admin", email: "a@b.com", password: "123" })).toThrow("weak_password");
  });

  it("accepts an update without a password", () => {
    expect(parseAdminUserUpdate({ fullName: "Updated", role: "admin", isActive: false, permissions: { manage_reviews: true } })).toEqual({
      fullName: "Updated", role: "admin", isActive: false, permissions: { manage_reviews: true },
    });
  });
});
