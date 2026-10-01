import { getMobileClient } from "@/lib/booking/mobileClient";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { listAppointmentConversations } from "@/lib/appointment-communications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The caller's normal (appointment) conversations — client or lawyer. */
export async function GET(request: Request) {
  const client = await getMobileClient(request);
  const lawyer = client ? null : await getMobileLawyerSession(request);
  if (!client && !lawyer) return json({ ok: false, error: "unauthorized" }, 401);

  try {
    const conversations = await listAppointmentConversations(
      client
        ? { role: "client", id: client.id }
        : { role: "lawyer", id: lawyer!.lawyerId, countryCode: lawyer!.countryCode },
    );
    return json({ ok: true, conversations });
  } catch (error) {
    console.error("[mobile/appointments/conversations] failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "conversations_unavailable" }, 503);
  }
}
