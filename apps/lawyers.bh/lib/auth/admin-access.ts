import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getAdminSession } from "./admin-session";
import {
  type AdminPermission,
  hasAdminPermission,
  normalizeAdminPermissions,
} from "./admin-permissions";

export async function getCurrentAdmin() {
  const session = await getAdminSession();
  if (!session) return null;

  const [admin] = await db
    .select({
      id: schema.adminUsers.id,
      fullName: schema.adminUsers.fullName,
      email: schema.adminUsers.email,
      phone: schema.adminUsers.phone,
      avatarUrl: schema.adminUsers.avatarUrl,
      role: schema.adminUsers.role,
      isActive: schema.adminUsers.isActive,
      permissions: schema.adminUsers.permissions,
      lastLoginAt: schema.adminUsers.lastLoginAt,
      createdAt: schema.adminUsers.createdAt,
    })
    .from(schema.adminUsers)
    .where(and(eq(schema.adminUsers.id, session.id), eq(schema.adminUsers.isActive, true)))
    .limit(1);

  if (!admin) return null;
  return { ...admin, permissions: normalizeAdminPermissions(admin.permissions) };
}

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await getCurrentAdmin();
  return hasAdminPermission(admin, permission) ? admin : null;
}

export async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  return admin?.role === "super_admin" ? admin : null;
}
