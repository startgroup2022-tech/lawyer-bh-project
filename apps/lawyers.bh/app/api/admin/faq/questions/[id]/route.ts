import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { archiveQuestion, restoreQuestion, updateQuestion } from "@/lib/faq/service";
import { parseExpectedUpdatedAt, parseFaqQuestionInput, parseLifecycleAction } from "@/lib/faq/validation";
import { faqErrorResponse } from "@/lib/faq/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("manage_faq");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const context = { adminId: admin.id, expectedUpdatedAt: parseExpectedUpdatedAt(body.expectedUpdatedAt) };
    const action = parseLifecycleAction(body.action);
    const question = action === "archive" ? await archiveQuestion(id, context)
      : action === "restore" ? await restoreQuestion(id, context)
      : await updateQuestion(id, parseFaqQuestionInput({ ...body, status: action === "publish" ? "published" : action === "draft" ? "draft" : body.status }), context);
    return NextResponse.json({ ok: true, question });
  } catch (error) { return faqErrorResponse(error); }
}
