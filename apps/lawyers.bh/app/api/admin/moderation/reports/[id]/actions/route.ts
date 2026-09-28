import { requireAdminPermission } from "@/lib/auth/admin-access";
import { applyModerationAction } from "@/lib/communications/moderation/store";
import { moderationActions, type ModerationAction } from "@/lib/communications/safety/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminPermission("manage_moderation");
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const action = String(body.action ?? "") as ModerationAction;
  const internalReason = String(body.internalReason ?? "").trim();
  const publicMessageAr = String(body.publicMessageAr ?? "").trim() || null;
  const publicMessageEn = String(body.publicMessageEn ?? "").trim() || null;
  const expiresAt = String(body.expiresAt ?? "").trim() || null;
  if (!moderationActions.includes(action)) {
    return Response.json({ error: "invalid_moderation_action" }, { status: 400 });
  }
  if (!internalReason || internalReason.length > 2000) {
    return Response.json({ error: "invalid_moderation_reason" }, { status: 400 });
  }
  if (action === "chat_suspension" && (!expiresAt || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
    return Response.json({ error: "invalid_moderation_expiry" }, { status: 400 });
  }
  if (["warning", "chat_suspension", "account_suspension"].includes(action) && (!publicMessageAr || !publicMessageEn)) {
    return Response.json({ error: "moderation_public_message_required" }, { status: 400 });
  }

  try {
    return Response.json(await applyModerationAction({
      reportId: (await context.params).id,
      adminId: admin.id,
      action,
      internalReason,
      publicMessageAr,
      publicMessageEn,
      expiresAt,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === "moderation_report_not_found") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
