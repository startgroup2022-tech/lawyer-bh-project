import { sqlClient } from "@/lib/db/client";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { createLawyerAvailabilityHttp } from "@/lib/mobile-admin/lawyer-availability-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createLawyerAvailabilityHttp({
  authorize: requireMobileAdmin,
  async setAvailability({ lawyerId, adminId, countryCode, available }) {
    const rows = await sqlClient`
      UPDATE public.bahrain_lawyers
      SET is_emergency_ready = ${available}, updated_at = now()
      WHERE id = ${lawyerId}::uuid AND country_code = ${countryCode}
        AND status = 'approved' AND is_active = true
      RETURNING id
    `;
    if (!rows[0]) return false;
    await sqlClient`
      UPDATE public.bahrain_emergency_requests
      SET dispatch_actor_log = (
        COALESCE(dispatch_actor_log, '[]'::json)::jsonb ||
        jsonb_build_array(jsonb_build_object(
          'actor', ${adminId},
          'action', ${available ? "admin_enable_lawyer" : "admin_disable_lawyer"},
          'lawyerId', ${lawyerId},
          'ts', now()::text
        ))
      )::json
      WHERE assigned_lawyer_id = ${lawyerId}::uuid
        AND service_status NOT IN ('completed', 'cancelled', 'disputed')
    `;
    return true;
  },
});

export async function PATCH(request: Request, context: { params: Promise<{ lawyerId: string }> }) {
  const { lawyerId } = await context.params;
  return handler(request, lawyerId);
}
