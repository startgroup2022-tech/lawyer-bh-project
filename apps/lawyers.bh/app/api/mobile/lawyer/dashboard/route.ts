import { sqlClient } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { lawyerJson } from "@/lib/booking/mobileLawyerHttp";
import { loadMobileLawyerProfile } from "@/lib/booking/mobileLawyerProfile";
import { formatTime } from "@/lib/booking/lawyerAvailability";
import { loadAvailability } from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in lawyer's real dashboard numbers, computed from the same tables
 * the appointments screens use. Nothing is invented: a metric that has no
 * source in the platform is simply absent so the client falls back to its own
 * default.
 */
export async function GET(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) return lawyerJson({ ok: false, error: "unauthorized" }, 401);

  try {
    const [profile, availability, counts] = await Promise.all([
      loadMobileLawyerProfile(session.lawyerId),
      loadAvailability(sqlClient, session.lawyerId),
      sqlClient<{ upcoming: number; completed: number; cancelled: number }[]>`
        SELECT
          count(*) FILTER (
            WHERE b.admin_status IN ('approved', 'pending_review')
              AND s.appointment_date >= current_date
          )::int AS upcoming,
          count(*) FILTER (WHERE b.admin_status = 'completed')::int AS completed,
          count(*) FILTER (WHERE b.admin_status IN ('cancelled', 'rejected'))::int AS cancelled
        FROM public.bahrain_appointment_slots s
        JOIN public.bahrain_booking_requests b ON b.id = s.booking_request_id
        WHERE s.lawyer_id = ${session.lawyerId}::uuid
      `,
    ]);

    if (!profile) return lawyerJson({ ok: false, error: "not_found" }, 404);

    const stats = counts[0] ?? { upcoming: 0, completed: 0, cancelled: 0 };

    return lawyerJson({
      ok: true,
      dashboard: {
        upcomingAppointments: stats.upcoming,
        completedAppointments: stats.completed,
        cancelledAppointments: stats.cancelled,
        rating: profile.rating,
        reviewsCount: profile.reviewsCount,
        experienceYears: profile.experienceYears,
        verificationStatus: profile.verificationStatus,
        profileStatus: profile.profileStatus,
      },
      // The app renders weekly working hours from this summary.
      workHours: availability.map((window) => ({
        weekday: window.weekday,
        startTime: formatTime(window.start),
        endTime: formatTime(window.end),
      })),
    });
  } catch (error) {
    console.error("[mobile/lawyer/dashboard] failed", error);
    return lawyerJson({ ok: false, error: "dashboard_unavailable" }, 503);
  }
}
