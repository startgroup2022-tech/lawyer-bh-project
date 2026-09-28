// Local-only visual QA fixture. Never accepts a remote database or production data.
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
const url = process.env.CAREERS_PREVIEW_DATABASE_URL;
const parsed = new URL(url || "http://invalid");
if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55437" || parsed.pathname !== "/careers_preview") throw new Error("Use only the dedicated local careers_preview database on port 55437");
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.unsafe(await readFile(new URL("../drizzle/0078_careers.sql", import.meta.url), "utf8"));
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS admin_users (id uuid PRIMARY KEY, full_name text, email text UNIQUE, password_hash text, phone text, avatar_url text, role text, is_active boolean, permissions jsonb, last_login_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
  const actor = "00000000-0000-4000-8000-000000000078";
  const password = await bcrypt.hash("Careers-Preview-Only-2026!", 10);
  await sql`INSERT INTO admin_users(id,full_name,email,password_hash,role,is_active,permissions) VALUES (${actor},'Local Careers QA','careers@example.invalid',${password},'admin',true,'{"manage_careers":true,"view_dashboard":true}') ON CONFLICT(id) DO UPDATE SET password_hash=${password}`;
  const jobs = [
    { slug: "legal-consultant-preview", titleAr: "مستشار قانوني", titleEn: "Legal Consultant", employmentType: "FULL_TIME", workMode: "onsite" },
    { slug: "client-experience-preview", titleAr: "أخصائي تجربة العملاء", titleEn: "Client Experience Specialist", employmentType: "FULL_TIME", workMode: "remote" },
    { slug: "legal-intern-preview", titleAr: "متدرب في الشؤون القانونية", titleEn: "Legal Intern", employmentType: "INTERN", workMode: "onsite" },
  ];
  for (const job of jobs) {
    const content = { ...job, descriptionAr: "فرصة تجريبية للمراجعة المحلية فقط.\nنبحث عن زميل يشاركنا الاهتمام بالتفاصيل وجودة الخدمات القانونية، ويساهم في تقديم تجربة واضحة وموثوقة للعملاء.", descriptionEn: "Local QA opportunity only.\nWe are looking for a detail-oriented colleague who values quality legal services and a clear, reliable client experience.", requirementsAr: "• مؤهل جامعي مناسب\n• إجادة التواصل بالعربية والإنجليزية\n• تنظيم العمل والاهتمام بالتفاصيل", requirementsEn: "• Relevant university degree\n• Strong Arabic and English communication\n• Excellent organization and attention to detail", country: "BH", cityAr: "المنامة", cityEn: "Manama", salary: "", closesAt: "2030-12-31T20:59:59.999Z", status: "published" };
    await sql`INSERT INTO careers_jobs(slug,content,status,closes_at,published_at,updated_by_admin_id) VALUES (${job.slug},${sql.json(content)},'published',${content.closesAt},now(),${actor}) ON CONFLICT(slug) DO NOTHING`;
  }
  console.log("Local careers fixture ready. No production data used.");
} finally { await sql.end(); }
