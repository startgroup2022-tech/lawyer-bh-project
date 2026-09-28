import { requireAdminPermission } from "@/lib/auth/admin-access";
import { listModerationReports } from "@/lib/communications/moderation/store";

export async function GET(request: Request) {
  if (!(await requireAdminPermission("manage_moderation"))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status") ?? "open";
  const status = ["open", "dismissed", "actioned", "all"].includes(rawStatus)
    ? (rawStatus as "open" | "dismissed" | "actioned" | "all")
    : "open";
  return Response.json(await listModerationReports({ status, limit: 100 }));
}
