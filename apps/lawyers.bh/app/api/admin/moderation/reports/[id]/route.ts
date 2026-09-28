import { requireAdminPermission } from "@/lib/auth/admin-access";
import { getModerationReport } from "@/lib/communications/moderation/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminPermission("manage_moderation"))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const report = await getModerationReport((await context.params).id);
  if (!report) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ report });
}
