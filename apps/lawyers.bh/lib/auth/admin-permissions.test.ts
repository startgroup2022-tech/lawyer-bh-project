import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSION_KEYS,
  hasAdminPermission,
  normalizeAdminPermissions,
} from "./admin-permissions";

describe("admin permissions", () => {
  it("keeps only known boolean permissions", () => {
    expect(
      normalizeAdminPermissions({
        manage_discounts: true,
        manage_finance: false,
        manage_consultation_types: true,
        manage_terms_commissions: true,
        unknown_permission: true,
        manage_reviews: "yes",
      }),
    ).toEqual({ manage_discounts: true, manage_finance: false, manage_consultation_types: true, manage_terms_commissions: true });
  });

  it("allows active super admins regardless of stored permissions", () => {
    expect(
      hasAdminPermission(
        { role: "super_admin", isActive: true, permissions: {} },
        "manage_admins",
      ),
    ).toBe(true);
  });

  it("allows an active admin with the FAQ management permission", () => {
    expect(
      hasAdminPermission(
        { role: "admin", isActive: true, permissions: { manage_faq: true } },
        "manage_faq",
      ),
    ).toBe(true);
  });

  it("requires an active account and an explicitly granted permission", () => {
    expect(
      hasAdminPermission(
        {
          role: "admin",
          isActive: true,
          permissions: { manage_discounts: true },
        },
        "manage_discounts",
      ),
    ).toBe(true);
    expect(
      hasAdminPermission(
        {
          role: "admin",
          isActive: false,
          permissions: { manage_discounts: true },
        },
        "manage_discounts",
      ),
    ).toBe(false);
  });

  it("defines the complete stable permission set", () => {
    expect(ADMIN_PERMISSION_KEYS).toEqual([
      "view_dashboard",
      "manage_admins",
      "manage_discounts",
      "manage_approvals",
      "manage_requests",
      "manage_finance",
      "manage_reviews",
      "manage_lawyers",
      "manage_notifications",
      "manage_faq",
      "manage_about",
      "manage_consultation_types",
      "manage_terms_commissions",
      "manage_careers",
      "manage_training",
      "manage_moderation",
    ]);
  });

  it("uses existing admin accounts for moderation access", () => {
    expect(hasAdminPermission(
      { role: "admin", isActive: true, permissions: { manage_moderation: true } },
      "manage_moderation",
    )).toBe(true);
    expect(hasAdminPermission(
      { role: "admin", isActive: true, permissions: {} },
      "manage_moderation",
    )).toBe(false);
    expect(hasAdminPermission(
      { role: "reviewer", isActive: true, permissions: { manage_moderation: true } },
      "manage_moderation",
    )).toBe(true);
  });

  it("allows an active admin to manage legal terms and commissions when granted", () => {
    expect(hasAdminPermission(
      { role: "admin", isActive: true, permissions: { manage_terms_commissions: true } },
      "manage_terms_commissions",
    )).toBe(true);
  });

  it("allows an active admin with consultation catalogue permission", () => {
    expect(hasAdminPermission(
      { role: "admin", isActive: true, permissions: { manage_consultation_types: true } },
      "manage_consultation_types",
    )).toBe(true);
  });
});
