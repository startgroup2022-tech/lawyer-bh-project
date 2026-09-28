// Dedicated local-only fixtures, never production policy publications.
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
const url = process.env.POLICIES_PREVIEW_DATABASE_URL;
const parsed = new URL(url || "http://invalid");
if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55437" || parsed.pathname !== "/policies_preview") throw new Error("Use only local policies_preview on port 55437");
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS admin_users (id uuid PRIMARY KEY, full_name text, email text UNIQUE, password_hash text, phone text, avatar_url text, role text, is_active boolean, permissions jsonb, permissions_updated_at timestamptz, last_login_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()); CREATE TABLE IF NOT EXISTS bahrain_lawyers(id uuid PRIMARY KEY);`);
  const id = "00000000-0000-4000-8000-000000000079";
  const hash = await bcrypt.hash("Policies-Local-QA-2026!", 10);
  await sql`INSERT INTO admin_users(id,full_name,email,password_hash,role,is_active,permissions) VALUES (${id},'Local Policy QA','policies@example.invalid',${hash},'admin',true,'{"manage_terms_commissions":true,"view_dashboard":true}') ON CONFLICT(id) DO UPDATE SET password_hash=${hash}`;
  for (const file of ["0077_terms_and_commission_management.sql", "0082_public_policies.sql"]) await sql.unsafe(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  for (const type of ["privacy", "refund"]) {
    await sql`INSERT INTO terms_versions(document_type,version,status,content_ar,content_en,published_at) VALUES (${type},1,'published',${'نص تجريبي محلي للمراجعة فقط.\n\nهذه الصفحة تختبر فصل السياسات ولا تمثل سياسة منشورة للموقع.\n\n- اختبار العرض بالعربية\n- اختبار تنسيق البنود'},${'Local QA content only.\n\nThis page tests independent policies and does not represent a live website policy.\n\n- English display test\n- List formatting test'},now()) ON CONFLICT(document_type,version) DO NOTHING`;
  }
  console.log("Local policies fixture ready; no production database used.");
} finally { await sql.end(); }
