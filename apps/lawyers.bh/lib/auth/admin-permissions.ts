export const ADMIN_PERMISSION_KEYS = [
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
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];
export type AdminPermissions = Partial<Record<AdminPermission, boolean>>;
export type AdminRole = "super_admin" | "admin" | "reviewer";

export function normalizeAdminPermissions(value: unknown): AdminPermissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    ADMIN_PERMISSION_KEYS.flatMap((key) =>
      typeof source[key] === "boolean" ? [[key, source[key]]] : [],
    ),
  ) as AdminPermissions;
}

export function hasAdminPermission(
  admin: {
    role: AdminRole;
    isActive: boolean;
    permissions: unknown;
  } | null,
  permission: AdminPermission,
) {
  if (!admin?.isActive) return false;
  if (admin.role === "super_admin") return true;
  return normalizeAdminPermissions(admin.permissions)[permission] === true;
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = Object.fromEntries(
  ADMIN_PERMISSION_KEYS.filter((key) => key !== "manage_admins" && key !== "manage_training").map((key) => [key, true]),
) as AdminPermissions;

export const DEFAULT_REVIEWER_PERMISSIONS: AdminPermissions = {
  view_dashboard: true,
  manage_approvals: true,
  manage_reviews: true,
  manage_lawyers: true,
};
