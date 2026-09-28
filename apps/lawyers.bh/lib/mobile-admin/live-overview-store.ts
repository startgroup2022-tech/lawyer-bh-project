import type postgres from "postgres";

export type AdminLawyerState = "available" | "busy" | "offline";
export type AdminRequestStage =
  | "awaiting_payment"
  | "payment_failed"
  | "searching"
  | "needs_admin"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

type LawyerRow = {
  id: string; name: string; phone: string; live_location: Record<string, unknown> | null;
  live_location_updated_at: Date | null; location_sharing_enabled: boolean;
  active_request_id: string | null; active_case_ref: string | null;
};

type RequestRow = {
  id: string; case_ref: string; case_type: string; country_code: string;
  payment_status: string; tap_status: string | null; service_status: string;
  assigned_lawyer_id: string | null; candidate_lawyer_id: string | null;
  admin_escalated_at: Date | null; created_at: Date; updated_at: Date;
  client_lat: number | string | null; client_lng: number | string | null;
  dispatch_actor_log: unknown;
};

const LOCATION_FRESH_MS = 2 * 60 * 1000;

function requestStage(row: RequestRow): AdminRequestStage {
  if (row.payment_status === "failed") return "payment_failed";
  if (row.payment_status !== "success" || row.tap_status !== "CAPTURED") return "awaiting_payment";
  if (row.service_status === "cancelled") return "cancelled";
  if (row.service_status === "completed") return "completed";
  if (row.service_status === "disputed") return "disputed";
  if (row.service_status === "arrived") return "arrived";
  if (row.service_status === "in_progress") return "in_progress";
  if (row.service_status === "mobilizing") return "en_route";
  if (row.assigned_lawyer_id) return "accepted";
  if (row.admin_escalated_at) return "needs_admin";
  return "searching";
}

export async function getAdminLiveOverview(
  sql: postgres.Sql,
  countryCode: string,
  now = new Date(),
) {
  const lawyers = await sql<LawyerRow[]>`
    SELECT lawyers.id, COALESCE(NULLIF(lawyers.full_name_ar, ''), lawyers.full_name_en) AS name,
      lawyers.phone, lawyers.live_location, lawyers.live_location_updated_at,
      lawyers.location_sharing_enabled, active.id AS active_request_id, active.case_ref AS active_case_ref
    FROM public.bahrain_lawyers lawyers
    LEFT JOIN LATERAL (
      SELECT request.id, request.case_ref
      FROM public.bahrain_emergency_requests request
      WHERE request.assigned_lawyer_id = lawyers.id
        AND request.service_status NOT IN ('completed', 'cancelled', 'disputed')
      ORDER BY request.updated_at DESC LIMIT 1
    ) active ON true
    WHERE lawyers.country_code = ${countryCode}
      AND lawyers.status = 'approved' AND lawyers.is_active = true
      AND lawyers.is_review_account = false AND lawyers.suspension_type IS NULL
    ORDER BY lawyers.full_name_ar ASC, lawyers.id ASC LIMIT 500
  `;
  const requests = await sql<RequestRow[]>`
    SELECT request.id, request.case_ref, request.case_type, request.country_code,
      request.payment_status, request.tap_status, request.service_status,
      request.assigned_lawyer_id, request.candidate_lawyer_id, request.admin_escalated_at,
      request.created_at, request.updated_at,
      request.dispatch_actor_log,
      (request.location->>'lat')::double precision AS client_lat,
      (request.location->>'lng')::double precision AS client_lng
    FROM public.bahrain_emergency_requests request
    WHERE request.country_code = ${countryCode}
      AND request.created_at >= now() - interval '30 days'
    ORDER BY request.created_at DESC LIMIT 500
  `;

  const lawyerItems = lawyers.map((row) => {
    const updatedAt = row.live_location_updated_at;
    const fresh = row.location_sharing_enabled && updatedAt != null &&
      now.getTime() - updatedAt.getTime() <= LOCATION_FRESH_MS;
    const state: AdminLawyerState = row.active_request_id && fresh
      ? "busy" : fresh ? "available" : "offline";
    return {
      id: row.id, name: row.name, phone: row.phone, state,
      location: row.live_location,
      locationUpdatedAt: updatedAt?.toISOString() ?? null,
      activeRequestId: row.active_request_id,
      activeCaseRef: row.active_case_ref,
    };
  });
  const requestItems = requests.map((row) => ({
    id: row.id, caseRef: row.case_ref, caseType: row.case_type,
    countryCode: row.country_code, stage: requestStage(row),
    paymentStatus: row.payment_status, serviceStatus: row.service_status,
    assignedLawyerId: row.assigned_lawyer_id, candidateLawyerId: row.candidate_lawyer_id,
    clientLocation: row.client_lat == null || row.client_lng == null ? null : {
      lat: Number(row.client_lat), lng: Number(row.client_lng),
    },
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
  }));
  const events = requests.flatMap((row) => {
    const stage = requestStage(row);
    const items: Array<{ id: string; requestId: string; caseRef: string; type: string; actor: string | null; occurredAt: string }> = [
      { id: `${row.id}:created`, requestId: row.id, caseRef: row.case_ref, type: "request_created", actor: null, occurredAt: row.created_at.toISOString() },
    ];
    if (stage !== "awaiting_payment" && stage !== "searching") {
      items.push({ id: `${row.id}:stage:${stage}`, requestId: row.id, caseRef: row.case_ref, type: `request_stage_${stage}`, actor: null, occurredAt: row.updated_at.toISOString() });
    }
    if (row.payment_status === "success" && row.tap_status === "CAPTURED") {
      items.push({ id: `${row.id}:payment_captured`, requestId: row.id, caseRef: row.case_ref, type: "payment_captured", actor: null, occurredAt: row.created_at.toISOString() });
    } else if (row.payment_status === "failed") {
      items.push({ id: `${row.id}:payment_failed`, requestId: row.id, caseRef: row.case_ref, type: "payment_failed", actor: null, occurredAt: row.updated_at.toISOString() });
    }
    if (Array.isArray(row.dispatch_actor_log)) {
      row.dispatch_actor_log.forEach((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
        const value = entry as Record<string, unknown>;
        if (typeof value.action !== "string" || typeof value.ts !== "string") return;
        items.push({
          id: `${row.id}:audit:${index}:${value.ts}`,
          requestId: row.id,
          caseRef: row.case_ref,
          type: value.action,
          actor: typeof value.actor === "string" ? value.actor : null,
          occurredAt: value.ts,
        });
      });
    }
    return items;
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const count = (state: AdminLawyerState) => lawyerItems.filter((item) => item.state === state).length;
  return {
    countryCode,
    generatedAt: now.toISOString(),
    lawyers: lawyerItems,
    requests: requestItems,
    events,
    summary: {
      available: count("available"), busy: count("busy"), offline: count("offline"),
      activeRequests: requestItems.filter((item) => !["completed", "cancelled"].includes(item.stage)).length,
      needsAttention: requestItems.filter((item) => ["needs_admin", "payment_failed", "disputed"].includes(item.stage)).length,
    },
  };
}
