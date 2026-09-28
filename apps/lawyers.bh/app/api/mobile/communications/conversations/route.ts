import { sqlClient } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConversationRow = {
  request_id: string;
  request_reference: string;
  peer_display_name: string;
  service_status: string;
  case_type: string;
  case_name_ar: string | null;
  case_name_en: string | null;
  last_message: string | null;
  last_message_at: string | Date | null;
  unread_count: string | number;
};

function iso(value: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request: Request) {
  const lawyer = await getMobileLawyerSession(request);
  if (!lawyer) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await sqlClient<ConversationRow[]>`
    SELECT
      r.id::text AS request_id,
      r.case_ref AS request_reference,
      r.contact_name AS peer_display_name,
      r.service_status,
      r.case_type::text AS case_type,
      case_catalog.name_ar AS case_name_ar,
      case_catalog.name_en AS case_name_en,
      latest.body AS last_message,
      latest.created_at AS last_message_at,
      COALESCE(unread.unread_count, 0) AS unread_count
    FROM bahrain_emergency_requests r
    LEFT JOIN bahrain_emergency_case_types case_catalog
      ON case_catalog.country_code = r.country_code
      AND (
        case_catalog.id::text = r.mobile_payment_case_id
        OR case_catalog.slug = r.case_type::text
      )
    LEFT JOIN LATERAL (
      SELECT body, created_at
      FROM bahrain_communication_messages m
      WHERE m.request_id = r.id
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM bahrain_communication_messages m
      WHERE m.request_id = r.id
        AND m.sender_role = 'client'
        AND m.read_at IS NULL
    ) unread ON TRUE
    WHERE r.assigned_lawyer_id = ${lawyer.lawyerId}::uuid
      AND r.country_code = ${lawyer.countryCode}
      AND r.service_status IN ('mobilizing', 'arrived', 'in_progress', 'completed')
    ORDER BY COALESCE(latest.created_at, r.updated_at) DESC, r.id DESC
    LIMIT 100
  `;

  return Response.json({
    conversations: rows.map((row) => ({
      requestId: row.request_id,
      requestReference: row.request_reference,
      peerDisplayName: row.peer_display_name,
      serviceStatus: row.service_status,
      caseType: row.case_type,
      caseNameAr: row.case_name_ar,
      caseNameEn: row.case_name_en,
      lastMessage: row.last_message,
      lastMessageAt: iso(row.last_message_at),
      unreadCount: Number(row.unread_count) || 0,
    })),
  });
}
