import { getMobileClient } from "@/lib/booking/mobileClient";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import {
  listAppointmentNotifications,
  markAppointmentNotificationsRead,
} from "@/lib/appointment-communications/notification-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

type Owner = { role: "client" | "lawyer"; id: string };

async function resolveOwner(request: Request): Promise<Owner | null> {
  const client = await getMobileClient(request);
  if (client) return { role: "client", id: client.id };
  const lawyer = await getMobileLawyerSession(request);
  if (lawyer) return { role: "lawyer", id: lawyer.lawyerId };
  return null;
}

/** The caller's appointment notification center. */
export async function GET(request: Request) {
  const owner = await resolveOwner(request);
  if (!owner) return json({ ok: false, error: "unauthorized" }, 401);

  const params = new URL(request.url).searchParams;
  const filter = params.get("filter") === "unread" ? "unread" : "all";
  try {
    const page = await listAppointmentNotifications({
      recipientRole: owner.role,
      recipientId: owner.id,
      filter,
      limit: Number.parseInt(params.get("limit") ?? "50", 10) || 50,
      cursorAt: params.get("cursorAt"),
      cursorId: params.get("cursorId"),
    });
    return json({ ok: true, ...page });
  } catch (error) {
    console.error("[mobile/appointment-notifications] list failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "notifications_unavailable" }, 503);
  }
}

/** Marks one notification, or everything through a timestamp, as read. */
export async function POST(request: Request) {
  const owner = await resolveOwner(request);
  if (!owner) return json({ ok: false, error: "unauthorized" }, 401);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const readId = typeof body.readId === "string" && /^[0-9a-f-]{36}$/i.test(body.readId) ? body.readId : null;
  const readThrough =
    typeof body.readThrough === "string" && !Number.isNaN(Date.parse(body.readThrough))
      ? body.readThrough
      : null;
  if (!readId && !readThrough) return json({ ok: false, error: "invalid_input" }, 400);

  try {
    const updated = await markAppointmentNotificationsRead({
      recipientRole: owner.role,
      recipientId: owner.id,
      readId,
      readThrough,
    });
    return json({ ok: true, updated });
  } catch (error) {
    console.error("[mobile/appointment-notifications] read failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "read_unavailable" }, 503);
  }
}
