import "server-only";

import { sqlClient } from "@/lib/db/client";
import type { AdminRole } from "@/lib/auth/admin-permissions";

import { createMobileAdminAuth, type MobileAdminAuthStore, type MobileAdminRecord } from "./auth-core";
import { bearerToken } from "./auth-http";

type AdminRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  is_active: boolean;
  permissions: unknown;
};

function mapAdmin(row: AdminRow | undefined): MobileAdminRecord | null {
  if (!row) return null;
  return {
    id: row.id, fullName: row.full_name, email: row.email,
    passwordHash: row.password_hash, role: row.role,
    isActive: row.is_active, permissions: row.permissions,
  };
}

const store: MobileAdminAuthStore = {
  async findAdminByEmail(email) {
    const rows = await sqlClient<AdminRow[]>`
      SELECT id, full_name, email, password_hash, role, is_active, permissions
      FROM public.admin_users WHERE email = ${email} LIMIT 1
    `;
    return mapAdmin(rows[0]);
  },
  async findAdminById(id) {
    const rows = await sqlClient<AdminRow[]>`
      SELECT id, full_name, email, password_hash, role, is_active, permissions
      FROM public.admin_users WHERE id = ${id}::uuid LIMIT 1
    `;
    return mapAdmin(rows[0]);
  },
  async saveSession(digest, adminId, expiresAt) {
    await sqlClient`
      INSERT INTO public.mobile_admin_sessions (token_digest, admin_id, expires_at)
      VALUES (${digest}, ${adminId}::uuid, ${expiresAt.toISOString()}::timestamptz)
    `;
  },
  async findSession(digest) {
    const rows = await sqlClient<Array<{ admin_id: string; expires_at: Date }>>`
      SELECT admin_id, expires_at FROM public.mobile_admin_sessions
      WHERE token_digest = ${digest} AND expires_at > now() LIMIT 1
    `;
    return rows[0] ? { adminId: rows[0].admin_id, expiresAt: rows[0].expires_at } : null;
  },
  async revokeSession(digest) {
    await sqlClient`DELETE FROM public.mobile_admin_sessions WHERE token_digest = ${digest}`;
  },
};

export const mobileAdminAuth = createMobileAdminAuth(store);

export async function requireMobileAdmin(request: Request) {
  return mobileAdminAuth.authorize(bearerToken(request), "manage_requests");
}
