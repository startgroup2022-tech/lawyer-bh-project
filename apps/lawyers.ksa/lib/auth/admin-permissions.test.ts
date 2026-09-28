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
        unknown_permission: true,
        manage_reviews: "yes",
      }),
    ).toEqual({ manage_discounts: true, manage_finance: false });
  });

  it("allows active super admins regardless of stored permissions", () => {
    expect(
      hasAdminPermission(
        { role: "super_admin", isActive: true, permissions: {} },
        "manage_admins",
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
    ]);
  });
});
