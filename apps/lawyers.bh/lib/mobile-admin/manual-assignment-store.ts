import type postgres from "postgres";
import type { ManualAssignmentStore } from "./manual-assignment";

export class AssignmentConflict extends Error {}

export function createPostgresManualAssignmentStore(sql: postgres.Sql): ManualAssignmentStore {
  return {
    transaction(work) {
      return sql.begin(async (tx) => work({
        async getRequestForUpdate(requestId) {
          const [row] = await tx<{
            payment_status: string; tap_status: string | null; service_status: string;
            admin_escalated_at: Date | null; assigned_lawyer_id: string | null;
            candidate_lawyer_id: string | null; country_code: string; excluded_lawyer_ids: unknown;
          }[]>`
            SELECT request.payment_status, request.tap_status, request.service_status,
              request.admin_escalated_at, request.assigned_lawyer_id,
              request.candidate_lawyer_id, request.country_code, request.excluded_lawyer_ids
            FROM public.bahrain_emergency_requests request
            WHERE request.id = ${requestId}::uuid FOR UPDATE
          `;
          if (!row) return null;
          return {
            paymentStatus: row.payment_status, tapStatus: row.tap_status,
            serviceStatus: row.service_status, adminEscalatedAt: row.admin_escalated_at,
            assignedLawyerId: row.assigned_lawyer_id, candidateLawyerId: row.candidate_lawyer_id,
            countryCode: row.country_code,
            excludedLawyerIds: Array.isArray(row.excluded_lawyer_ids)
              ? row.excluded_lawyer_ids.filter((id): id is string => typeof id === "string") : [],
          };
        },
        async getLawyerForUpdate(lawyerId) {
          const [row] = await tx<{
            id: string; country_code: string; is_active: boolean; status: string;
            is_review_account: boolean; suspension_type: string | null; is_emergency_ready: boolean;
          }[]>`
            SELECT lawyers.id, lawyers.country_code, lawyers.is_active, lawyers.status,
              lawyers.is_review_account, lawyers.suspension_type, lawyers.is_emergency_ready
            FROM public.bahrain_lawyers lawyers WHERE lawyers.id = ${lawyerId}::uuid FOR UPDATE
          `;
          if (!row) return null;
          const busy = await tx`SELECT id FROM public.bahrain_emergency_requests busy
            WHERE busy.assigned_lawyer_id = ${lawyerId}::uuid
              AND busy.service_status NOT IN ('completed', 'cancelled', 'disputed') LIMIT 1`;
          const closed = await tx`SELECT id FROM legalsos_account_lifecycle
            WHERE subject_role = 'lawyer' AND subject_id = ${lawyerId}::uuid LIMIT 1`;
          return {
            id: row.id, countryCode: row.country_code, isActive: row.is_active,
            status: row.status, isReviewAccount: row.is_review_account,
            suspensionType: row.suspension_type, isEmergencyReady: row.is_emergency_ready,
            isBusy: busy.length > 0, isAccountClosed: closed.length > 0,
          };
        },
        async assign(requestId, lawyerId, adminId) {
          const [updated] = await tx`
            UPDATE public.bahrain_emergency_requests
            SET assigned_lawyer_id = ${lawyerId}::uuid, service_status = 'mobilizing',
              candidate_lawyer_id = NULL, candidate_offered_at = NULL,
              customer_approved_at = NULL, lawyer_response_deadline = NULL,
              response_timestamp = now(), updated_at = now(),
              dispatch_actor_log = (
                COALESCE(dispatch_actor_log, '[]'::json)::jsonb ||
                jsonb_build_array(jsonb_build_object('actor', ${adminId}, 'action', 'manual_assign', 'ts', now()::text))
              )::json
            WHERE id = ${requestId}::uuid AND payment_status = 'success'
              AND tap_status = 'CAPTURED' AND admin_escalated_at IS NOT NULL
              AND service_status = 'pending' AND assigned_lawyer_id IS NULL
              AND candidate_lawyer_id IS NULL
            RETURNING id
          `;
          if (!updated) throw new AssignmentConflict("Request state changed");
        },
      }));
    },
  };
}
