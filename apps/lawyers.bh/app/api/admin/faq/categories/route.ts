import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { createCategory } from "@/lib/faq/service";
import { parseFaqCategoryInput } from "@/lib/faq/validation";
import { faqErrorResponse } from "@/lib/faq/http";

export async function POST(request: Request) {
  const admin = await requireAdminPermission("manage_faq");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const category = await createCategory(parseFaqCategoryInput(await request.json()), { adminId: admin.id });
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) { return faqErrorResponse(error); }
}
