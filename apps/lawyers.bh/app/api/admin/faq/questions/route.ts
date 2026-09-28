import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { createQuestion } from "@/lib/faq/service";
import { parseFaqQuestionInput } from "@/lib/faq/validation";
import { faqErrorResponse } from "@/lib/faq/http";

export async function POST(request: Request) {
  const admin = await requireAdminPermission("manage_faq");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try { const question = await createQuestion(parseFaqQuestionInput(await request.json()), { adminId: admin.id }); return NextResponse.json({ ok: true, question }, { status: 201 }); }
  catch (error) { return faqErrorResponse(error); }
}
