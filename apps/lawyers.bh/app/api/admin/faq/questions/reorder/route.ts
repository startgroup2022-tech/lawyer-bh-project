import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { reorderQuestions } from "@/lib/faq/service";
import { parseReorderInput, parseUuid } from "@/lib/faq/validation";
import { faqErrorResponse } from "@/lib/faq/http";

export async function PATCH(request: Request) {
  const admin = await requireAdminPermission("manage_faq");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    await reorderQuestions(parseUuid(body.categoryId, "invalid_category"), parseReorderInput(body), { adminId: admin.id });
    return NextResponse.json({ ok: true });
  } catch (error) { return faqErrorResponse(error); }
}
