// Bootstrap admin operator.
//
//   SEED_ADMIN_EMAIL=info@lawyers.bh \
//   SEED_ADMIN_NAME="Legal SOS Admin" \
//   SEED_ADMIN_PASSWORD="<the 28-char password from chat>" \
//   DATABASE_URL=postgres://... \
//   npm run seed:admin
//
// Idempotent. If the user already exists:
//   • If SEED_ADMIN_PASSWORD is set → password + name are updated.
//   • If SEED_ADMIN_PASSWORD is empty → script is a no-op (will not lock
//     out an existing admin by accident).
//
// We commit this file but NEVER commit the plaintext password. The hash
// only ever exists in the database row.

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db/client";
import { hashPassword } from "../lib/auth/password";

const DEFAULT_EMAIL = "info@lawyers.bh";
const DEFAULT_NAME = "Legal SOS Admin";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL).toLowerCase().trim();
  const fullName = (process.env.SEED_ADMIN_NAME ?? DEFAULT_NAME).trim();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim() ?? "";

  if (!email.includes("@")) {
    console.error("[seed-admin] SEED_ADMIN_EMAIL is invalid:", email);
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: schema.adminUsers.id, email: schema.adminUsers.email })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1);

  if (existing && !password) {
    console.log(
      `[seed-admin] ${email} already exists and SEED_ADMIN_PASSWORD not set — no changes made.`,
    );
    process.exit(0);
  }

  if (!password) {
    console.error(
      "[seed-admin] SEED_ADMIN_PASSWORD is required when creating a new admin.",
    );
    console.error(
      "[seed-admin] Set it via env, e.g.:\n  SEED_ADMIN_PASSWORD='...' npm run seed:admin",
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("[seed-admin] Password must be at least 12 chars.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  if (existing) {
    await db
      .update(schema.adminUsers)
      .set({ passwordHash, fullName, isActive: true })
      .where(eq(schema.adminUsers.id, existing.id));
    console.log(`[seed-admin] Updated existing admin: ${email}`);
  } else {
    await db.insert(schema.adminUsers).values({
      email,
      fullName,
      passwordHash,
      isActive: true,
    });
    console.log(`[seed-admin] Created admin: ${email}`);
  }

  await db.insert(schema.auditLog).values({
    action: existing ? "admin.password_rotate" : "admin.create",
    targetType: "admin_user",
    meta: { email, fullName, via: "seed-admin script" },
  });

  console.log("[seed-admin] Done. Sign in at /login with the email + password.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-admin] failed:", err);
  process.exit(1);
});
