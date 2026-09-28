import type postgres from "postgres";
import { decodeQueueCursor, encodeQueueCursor } from "./queue-cursor";

export async function listEscalatedRequests(sql: postgres.Sql, cursor: string | null) {
  const decoded = cursor ? decodeQueueCursor(cursor) : null;
  if (cursor && !decoded) throw new Error("invalid_cursor");
  const at = decoded?.at ?? null;
  const id = decoded?.id ?? null;
  const rows = await sql<Array<{
    id: string; case_ref: string; case_type: string; country_code: string;
    created_at: Date; admin_escalated_at: Date;
  }>>`
    SELECT id, case_ref, case_type, country_code, created_at, admin_escalated_at
    FROM public.bahrain_emergency_requests
    WHERE payment_status = 'success' AND tap_status = 'CAPTURED'
      AND admin_escalated_at IS NOT NULL AND assigned_lawyer_id IS NULL
      AND candidate_lawyer_id IS NULL AND service_status = 'pending'
      AND (${at}::timestamptz IS NULL OR (admin_escalated_at, id) < (${at}::timestamptz, ${id}::uuid))
    ORDER BY admin_escalated_at DESC, id DESC LIMIT 31
  `;
  const page = rows.slice(0, 30);
  const last = page.at(-1);
  return {
    requests: page.map((row) => ({
      id: row.id, caseRef: row.case_ref, caseType: row.case_type,
      countryCode: row.country_code, createdAt: row.created_at.toISOString(),
      escalatedAt: row.admin_escalated_at.toISOString(),
    })),
    nextCursor: rows.length > 30 && last
      ? encodeQueueCursor(last.admin_escalated_at.toISOString(), last.id) : null,
  };
}

export async function listEligibleLawyers(sql: postgres.Sql, requestId: string, cursor: string | null) {
  if (cursor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor)) {
    throw new Error("invalid_cursor");
  }
  const [request] = await sql<Array<{ country_code: string; excluded_lawyer_ids: string[] }>>`
    SELECT request.country_code, request.excluded_lawyer_ids
    FROM public.bahrain_emergency_requests request
    WHERE request.id = ${requestId}::uuid AND request.payment_status = 'success'
      AND request.tap_status = 'CAPTURED' AND request.admin_escalated_at IS NOT NULL
      AND request.assigned_lawyer_id IS NULL AND request.candidate_lawyer_id IS NULL
      AND request.service_status = 'pending' LIMIT 1
  `;
  if (!request) return { lawyers: [], nextCursor: null as string | null };
  const rows = await sql<Array<{ id: string; full_name_ar: string; full_name_en: string }>>`
    SELECT lawyers.id, lawyers.full_name_ar, lawyers.full_name_en
    FROM public.bahrain_lawyers lawyers
    JOIN public.bahrain_emergency_requests request ON request.id = ${requestId}::uuid
    WHERE lawyers.country_code = request.country_code
      AND lawyers.status = 'approved' AND lawyers.is_active = true
      AND lawyers.is_review_account = false AND lawyers.suspension_type IS NULL
      AND lawyers.is_emergency_ready = true
      AND NOT EXISTS (SELECT 1 FROM legalsos_account_lifecycle closed
        WHERE closed.subject_role = 'lawyer' AND closed.subject_id = lawyers.id)
      AND NOT EXISTS (SELECT 1 FROM public.bahrain_emergency_requests busy
        WHERE busy.assigned_lawyer_id = lawyers.id
          AND busy.service_status NOT IN ('completed', 'cancelled', 'disputed'))
      AND NOT EXISTS (SELECT 1 FROM json_array_elements_text(COALESCE(request.excluded_lawyer_ids, '[]'::json)) excluded(id)
        WHERE excluded.id = lawyers.id::text)
      AND (${cursor}::uuid IS NULL OR lawyers.id > ${cursor}::uuid)
    ORDER BY lawyers.id ASC LIMIT 31
  `;
  const page = rows.slice(0, 30);
  return {
    lawyers: page.map((row) => ({ id: row.id, name: row.full_name_ar || row.full_name_en })),
    nextCursor: rows.length > 30 ? page.at(-1)?.id ?? null : null,
  };
}

export async function getEscalatedRequest(sql: postgres.Sql, requestId: string) {
  const [row] = await sql<Array<{
    id: string; case_ref: string; case_type: string; description: string | null;
    contact_name: string; contact_phone: string; country_code: string;
    created_at: Date; admin_escalated_at: Date;
  }>>`
    SELECT id, case_ref, case_type, description, contact_name, contact_phone,
      country_code, created_at, admin_escalated_at
    FROM public.bahrain_emergency_requests
    WHERE id = ${requestId}::uuid AND payment_status = 'success' AND tap_status = 'CAPTURED'
      AND admin_escalated_at IS NOT NULL AND assigned_lawyer_id IS NULL
      AND candidate_lawyer_id IS NULL AND service_status = 'pending' LIMIT 1
  `;
  return row ? {
    id: row.id, caseRef: row.case_ref, caseType: row.case_type,
    description: row.description, contactName: row.contact_name,
    contactPhone: row.contact_phone, countryCode: row.country_code,
    createdAt: row.created_at.toISOString(), escalatedAt: row.admin_escalated_at.toISOString(),
  } : null;
}
