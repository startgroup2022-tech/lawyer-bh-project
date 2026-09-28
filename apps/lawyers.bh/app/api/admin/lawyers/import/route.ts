import crypto from "node:crypto";
import { readDirectForm } from "@/lib/uploads/server";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/auth/admin-access";
import { sendLawyerInvitationEmail } from "@/lib/admin/lawyer-invitation-email";
import { buildLawyerImportRow, resolveLawyerImportHeaders, summarizeLawyerImport, validateLawyerImportRow, type LawyerImportRowResult } from "@/lib/admin/lawyer-import";
import { sqlClient } from "@/lib/db/client";
import { buildCountryTableSet, getActiveCountry } from "@/lib/db/country-tables";
import { generateLawyerMembershipNo } from "@/lib/db/membership-no";
import { sendEmail } from "@/lib/postmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 500;

function cellValue(value: ExcelJS.CellValue) {
  if (value && typeof value === "object") {
    if ("text" in value) return value.text;
    if ("result" in value) return value.result;
  }
  return value ?? "";
}

function baseUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000").replace(/\/+$/, "");
}

export async function POST(request: Request) {
  if (!(await requireAdminPermission("manage_lawyers"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const form = await readDirectForm(request, 'import').catch(() => null);
  const file = form?.get("file");
  const countryCode = String(form?.get("countryCode") || "BH").trim().toUpperCase();
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE" }, { status: 400 });
  if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ ok: false, error: "XLSX_REQUIRED" }, { status: 400 });

  const country = await getActiveCountry(countryCode);
  if (!country) return NextResponse.json({ ok: false, error: "COUNTRY_NOT_AVAILABLE" }, { status: 400 });
  const tables = buildCountryTableSet(country);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_WORKBOOK" }, { status: 400 });
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return NextResponse.json({ ok: false, error: "EMPTY_WORKBOOK" }, { status: 400 });
  const headers = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(cellValue);
  const indexes = resolveLawyerImportHeaders(headers);
  if (!indexes) return NextResponse.json({ ok: false, error: "REQUIRED_COLUMNS_MISSING" }, { status: 400 });
  const rows = [];
  for (let number = 2; number <= sheet.rowCount && rows.length < MAX_ROWS; number += 1) {
    const values = (sheet.getRow(number).values as ExcelJS.CellValue[]).slice(1).map(cellValue);
    if (values.every((value) => String(value ?? "").trim() === "")) continue;
    rows.push(buildLawyerImportRow(number, values, indexes));
  }

  const results: LawyerImportRowResult[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const invalid = validateLawyerImportRow(row);
    if (invalid) { results.push({ ...row, status: "failed", reason: invalid }); continue; }
    const duplicateKey = `${row.fullNameAr.toLocaleLowerCase("ar")}\u0000${row.email}`;
    if (seen.has(duplicateKey)) { results.push({ ...row, status: "skipped", reason: "مكرر داخل الملف" }); continue; }
    seen.add(duplicateKey);
    const existingRows = await sqlClient`
      SELECT id
      FROM ${sqlClient(tables.lawyers)}
      WHERE country_code = ${country.code}
        AND lower(email) = ${row.email}
        AND full_name_ar = ${row.fullNameAr}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (existing) { results.push({ ...row, status: "skipped", reason: "الاسم والبريد مسجلان مسبقًا" }); continue; }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const membershipNo = await generateLawyerMembershipNo(country);
    const passwordHash = await bcrypt.hash(crypto.randomBytes(12).toString("hex"), 12);
    try {
      const inserted = await sqlClient`
        INSERT INTO ${sqlClient(tables.lawyers)} (country_code, full_name_ar, full_name_en, email, phone, registration_no, membership_no, subscription_type, experience_years, password_hash, language, working_hours, specialty_subs, specialties, agreement_accepted, status, is_active, profile_completed, invite_token, invite_token_expires_at, invited_at, locale)
        VALUES (${country.code}, ${row.fullNameAr}, ${row.fullNameEn}, ${row.email}, ${row.phone}, ${`INV-${crypto.randomUUID()}`}, ${membershipNo}, ${"lawyer"}, ${0}, ${passwordHash}, ${"Arabic"}, ${"09:00-13:00"}, ${"[]"}::jsonb, ${"{\"main\":\"\",\"subs\":[]}"}::jsonb, ${false}, ${"approved"}, ${false}, ${false}, ${inviteToken}, ${expiresAt.toISOString()}::timestamptz, ${new Date().toISOString()}::timestamptz, ${"ar"})
        RETURNING id
      `;
      if (!inserted[0]) throw new Error("CREATE_FAILED");
      const completionLink = `${baseUrl(request)}/ar/complete-profile?token=${inviteToken}`;
      try {
        await sendLawyerInvitationEmail({ to: row.email, lawyerName: row.fullNameAr, completionLink }, sendEmail);
        results.push({ ...row, status: "success", completionLink });
      } catch (error) {
        console.error("[admin-lawyer-import] invitation email failed", { row: row.rowNumber, error: error instanceof Error ? error.message : "Unknown" });
        results.push({ ...row, status: "failed", reason: "تم إنشاء الحساب ولكن تعذر إرسال الدعوة", completionLink });
      }
    } catch (error) {
      console.error("[admin-lawyer-import] row failed", { row: row.rowNumber, error: error instanceof Error ? error.message : "Unknown" });
      results.push({ ...row, status: "failed", reason: "تعذر إنشاء الحساب أو البيانات مكررة" });
    }
  }
  return NextResponse.json({ ok: true, summary: summarizeLawyerImport(results), results, truncated: sheet.rowCount - 1 > MAX_ROWS });
}
