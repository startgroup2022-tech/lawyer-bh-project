import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { listAdminFaq } from "@/lib/faq/service";
import { faqErrorResponse } from "@/lib/faq/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminPermission("manage_faq"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const { categories, questions } = await listAdminFaq();
    const records = [...categories, ...questions];
    const counts = {
      published: records.filter((row) => !row.archivedAt && row.status === "published").length,
      draft: records.filter((row) => !row.archivedAt && row.status === "draft").length,
      archived: records.filter((row) => Boolean(row.archivedAt)).length,
    };
    return NextResponse.json({ ok: true, categories, questions, counts });
  } catch (error) { return faqErrorResponse(error); }
}
