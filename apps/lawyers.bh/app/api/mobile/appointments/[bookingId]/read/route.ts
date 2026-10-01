import { resolveAppointmentCommunication } from "@/lib/appointment-communications/access";
import { markAppointmentRead } from "@/lib/appointment-communications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Marks the peer's messages read up to now for the signed-in caller. */
export async function POST(request: Request, { params }: Context) {
  const { bookingId } = await params;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);

  try {
    await markAppointmentRead(participant, new Date());
    return json({ ok: true });
  } catch (error) {
    console.error("[mobile/appointments/read] failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "read_unavailable" }, 503);
  }
}
