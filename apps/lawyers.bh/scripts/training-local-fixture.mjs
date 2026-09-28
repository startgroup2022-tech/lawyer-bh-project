// Local-only QA: no production connections or real applicant data.
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
const url = process.env.TRAINING_PREVIEW_DATABASE_URL;
const target = new URL(url || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "55437" || target.pathname !== "/training_preview") throw new Error("Dedicated local training_preview database only");
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  for (const name of ["0083_training_applications.sql", "0078_careers.sql"]) await sql.unsafe(await readFile(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  await sql.unsafe("CREATE TABLE IF NOT EXISTS admin_users (id uuid PRIMARY KEY, full_name text, email text UNIQUE, password_hash text, phone text, avatar_url text, role text, is_active boolean, permissions jsonb, last_login_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())");
  const password = await bcrypt.hash("Training-Preview-Only-2026!", 10);
  await sql`INSERT INTO admin_users(id,full_name,email,password_hash,role,is_active,permissions) VALUES ('00000000-0000-4000-8000-000000000083','Local Training QA','training@example.invalid',${password},'admin',true,'{"manage_training":true,"view_dashboard":true}') ON CONFLICT(id) DO UPDATE SET password_hash=${password}`;
  await mkdir("output/playwright", { recursive: true });
  for (const name of ["training-cv", "training-letter"]) {
    const pdf = await PDFDocument.create(); pdf.addPage().drawText(`Local QA only: ${name}`);
    await writeFile(`output/playwright/${name}.pdf`, await pdf.save());
  }
  console.log("Local training fixture ready; no production data used.");
} finally { await sql.end(); }
