import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { hasAdminPermission, type AdminPermission, type AdminRole } from "@/lib/auth/admin-permissions";

export type MobileAdminIdentity = {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  permissions: unknown;
};

export type MobileAdminRecord = MobileAdminIdentity & { passwordHash: string };

export type MobileAdminAuthStore = {
  findAdminByEmail(email: string): Promise<MobileAdminRecord | null>;
  findAdminById(id: string): Promise<MobileAdminRecord | null>;
  saveSession(digest: string, adminId: string, expiresAt: Date): Promise<void>;
  findSession(digest: string): Promise<{ adminId: string; expiresAt: Date } | null>;
  revokeSession(digest: string): Promise<void>;
};

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function mobileAdminTokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createMobileAdminAuth(
  store: MobileAdminAuthStore,
  clock: () => Date = () => new Date(),
) {
  return {
    async login(email: string, password: string) {
      const admin = await store.findAdminByEmail(email.trim().toLowerCase());
      if (!admin || !hasAdminPermission(admin, "manage_requests")) return null;
      if (!(await bcrypt.compare(password, admin.passwordHash))) return null;

      const token = randomBytes(32).toString("base64url");
      await store.saveSession(
        mobileAdminTokenDigest(token),
        admin.id,
        new Date(clock().getTime() + SESSION_DURATION_MS),
      );
      return {
        token,
        expiresInSeconds: SESSION_DURATION_MS / 1000,
        admin: { id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role },
      };
    },
    async authorize(token: string, permission: AdminPermission): Promise<MobileAdminIdentity | null> {
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
      const session = await store.findSession(mobileAdminTokenDigest(token));
      if (!session || session.expiresAt.getTime() <= clock().getTime()) return null;
      const admin = await store.findAdminById(session.adminId);
      return hasAdminPermission(admin, permission) ? admin : null;
    },
    async logout(token: string): Promise<void> {
      if (/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
        await store.revokeSession(mobileAdminTokenDigest(token));
      }
    },
  };
}
