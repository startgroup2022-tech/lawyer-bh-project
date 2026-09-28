import { describe, expect, it } from "vitest";
import { parseAdminProfilePayload, validateAdminAvatar } from "./admin-profile-validation";

describe("admin profile validation", () => {
  it("normalizes editable identity fields", () => {
    expect(parseAdminProfilePayload({ fullName: "  H M A  ", email: " ADMIN@EXAMPLE.COM ", phone: " +973 1234 5678 ", currentPassword: "old-password" }, "old@example.com")).toEqual({
      fullName: "H M A", email: "admin@example.com", phone: "+973 1234 5678",
      currentPassword: "old-password", newPassword: "", confirmPassword: "", emailChanged: true,
    });
  });

  it("requires current password when email changes", () => {
    expect(() => parseAdminProfilePayload({ fullName: "Admin", email: "new@example.com" }, "old@example.com")).toThrow("current_password_required");
  });

  it("requires matching strong new passwords and current password", () => {
    expect(() => parseAdminProfilePayload({ fullName: "Admin", email: "old@example.com", newPassword: "StrongPass123", confirmPassword: "different" }, "old@example.com")).toThrow("password_mismatch");
    expect(() => parseAdminProfilePayload({ fullName: "Admin", email: "old@example.com", currentPassword: "old", newPassword: "short", confirmPassword: "short" }, "old@example.com")).toThrow("weak_password");
  });

  it("accepts only supported avatar files up to 5MB", () => {
    expect(() => validateAdminAvatar({ type: "image/jpeg", size: 1024 })).not.toThrow();
    expect(() => validateAdminAvatar({ type: "image/gif", size: 1024 })).toThrow("invalid_avatar_type");
    expect(() => validateAdminAvatar({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toThrow("avatar_too_large");
  });
});
