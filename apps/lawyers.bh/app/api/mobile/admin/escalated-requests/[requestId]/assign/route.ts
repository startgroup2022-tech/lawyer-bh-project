import { sqlClient } from "@/lib/db/client";
import { requireMobileAdmin } from "@/lib/mobile-admin/auth";
import { createManualAssignmentHttp } from "@/lib/mobile-admin/manual-assignment-http";
import { createManualAssignmentService } from "@/lib/mobile-admin/manual-assignment";
import { createPostgresManualAssignmentStore } from "@/lib/mobile-admin/manual-assignment-store";
import { runManualAssignmentFollowUp } from "@/lib/mobile-admin/manual-assignment-follow-up";
import { ensureEmergencyAllocation } from "@/lib/sos/emergency-allocation";
import { mobilePushSender } from "@/lib/sos/mobile-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assign = createManualAssignmentService(createPostgresManualAssignmentStore(sqlClient));
const handler = createManualAssignmentHttp({
  authorize: requireMobileAdmin,
  assign,
  afterAssignment: (input) => runManualAssignmentFollowUp(input, {
    async load(requestId, lawyerId) {
      const [row] = await sqlClient<Array<{
        country_code: string; tap_charge_id: string | null; payment_ref: string | null;
        base_fee_bhd: string; locale: string;
      }>>`
        SELECT country_code, tap_charge_id, payment_ref, base_fee_bhd, locale
        FROM public.bahrain_emergency_requests
        WHERE id = ${requestId}::uuid AND assigned_lawyer_id = ${lawyerId}::uuid
          AND payment_status = 'success' AND tap_status = 'CAPTURED'
        LIMIT 1
      `;
      if (!row || !(row.tap_charge_id || row.payment_ref)) return null;
      return {
        countryCode: row.country_code, tapChargeId: row.tap_charge_id || row.payment_ref!,
        grossAmount: Number(row.base_fee_bhd),
        locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
      };
    },
    allocate: ({ requestId, lawyerId, ...payment }) => ensureEmergencyAllocation({
      emergencyRequestId: requestId, lawyerId, countryCode: payment.countryCode,
      tapChargeId: payment.tapChargeId, grossAmount: payment.grossAmount,
    }),
    async notifyClient({ requestId, locale }) {
      const sender = await mobilePushSender();
      await sender.sendClientPush({ eventType: "lawyer_accepted", requestId, locale });
    },
    async notifyLawyer({ requestId, lawyerId, locale }) {
      const sender = await mobilePushSender();
      await sender.sendLawyerPush({ eventType: "lawyer_assigned", requestId, lawyerId, locale });
    },
    async recordFailure(kind, requestId) {
      await sqlClient`
        UPDATE public.bahrain_emergency_requests
        SET dispatch_actor_log = (
          COALESCE(dispatch_actor_log, '[]'::json)::jsonb ||
          jsonb_build_array(jsonb_build_object('actor', 'system', 'action', ${kind}, 'ts', now()::text))
        )::json
        WHERE id = ${requestId}::uuid
      `;
      console.warn("[mobile-admin/assign] post-assignment follow-up pending", { requestId, kind });
    },
  }),
});

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  return handler(request, requestId);
}
