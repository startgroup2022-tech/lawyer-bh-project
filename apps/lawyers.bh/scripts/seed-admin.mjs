import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import bcrypt from "bcryptjs";

function loadEnvFiles() {
  const envFiles = [".env.local", ".env"];

  for (const fileName of envFiles) {
    const envPath = path.join(process.cwd(), fileName);

    if (!fs.existsSync(envPath)) continue;

    const lines = fs.readFileSync(envPath, "utf8").split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : "";
}

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

loadEnvFiles();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing. Check .env.local or Vercel env");
  process.exit(1);
}

const fullName = getArg("name") || process.env.ADMIN_NAME || "Habib Admin";
const email = (
  getArg("email") ||
  process.env.ADMIN_EMAIL ||
  ""
)
  .trim()
  .toLowerCase();

const password = getArg("password") || process.env.ADMIN_PASSWORD || "";
const role = getArg("role") || process.env.ADMIN_ROLE || "super_admin";
const resetPassword = process.env.ADMIN_RESET_PASSWORD === "true";

if (!email || !password) {
  console.log("Skipping admin creation: ADMIN_EMAIL or ADMIN_PASSWORD is missing");
  process.exit(0);
}

if (!["super_admin", "admin", "reviewer"].includes(role)) {
  console.error("Invalid role. Use: super_admin, admin, or reviewer");
  process.exit(1);
}

if (!isStrongPassword(password)) {
  console.error(
    "Password must be at least 8 characters and include uppercase, lowercase, and a number",
  );
  process.exit(1);
}

const isLocalDatabase =
  DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");

const sql = postgres(DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: isLocalDatabase ? false : "require",
});

try {
  const existing = await sql`
    SELECT id, email
    FROM admin_users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existing.length > 0 && !resetPassword) {
    console.log(`Admin already exists, skipping: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing.length > 0) {
      const updated = await sql`
        UPDATE admin_users
        SET
          full_name = ${fullName},
          password_hash = ${passwordHash},
          role = ${role},
          is_active = true,
          updated_at = NOW()
        WHERE email = ${email}
        RETURNING id, full_name, email, role
      `;

      console.log("Admin updated successfully:");
      console.table(updated);
    } else {
      const inserted = await sql`
        INSERT INTO admin_users (
          full_name,
          email,
          password_hash,
          role,
          is_active
        )
        VALUES (
          ${fullName},
          ${email},
          ${passwordHash},
          ${role},
          true
        )
        RETURNING id, full_name, email, role
      `;

      console.log("Admin created successfully:");
      console.table(inserted);
    }
  }
} catch (err) {
  console.error("Create admin failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}