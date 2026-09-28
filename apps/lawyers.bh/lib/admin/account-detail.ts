import { sqlClient } from "@/lib/db/client";

export type AdminRequestSummary = {
  id: string;
  source: "emergency" | "booking";
  reference: string;
  status: string;
  createdAt: string | Date;
};

export type AdminConversationSummary = {
  requestId: string;
  reference: string;
  lastMessage: string | null;
  lastMessageAt: string | Date | null;
};

export async function getAdminClientDetail(clientId: string) {
  const [clients, emergency, bookings, conversations] = await Promise.all([
    sqlClient<Record<string, unknown>[]>`
      SELECT id::text, email, full_name, phone, is_active, created_at
      FROM mobile_client_accounts
      WHERE id = ${clientId}::uuid
      LIMIT 1
    `,
    sqlClient<AdminRequestSummary[]>`
      SELECT r.id::text, 'emergency'::text AS source, r.case_ref AS reference,
             r.service_status AS status, r.created_at AS "createdAt"
      FROM bahrain_emergency_requests r
      WHERE r.client_account_id = ${clientId}::uuid
      ORDER BY r.created_at DESC
    `,
    sqlClient<AdminRequestSummary[]>`
      SELECT b.id::text, 'booking'::text AS source,
             ('BK-' || upper(left(b.id::text, 8))) AS reference,
             b.admin_status AS status, b.created_at AS "createdAt"
      FROM bahrain_booking_requests b
      WHERE b.client_account_id = ${clientId}::uuid
      ORDER BY b.created_at DESC
    `,
    sqlClient<AdminConversationSummary[]>`
      SELECT r.id::text AS "requestId", r.case_ref AS reference,
             latest.body AS "lastMessage", latest.created_at AS "lastMessageAt"
      FROM bahrain_emergency_requests r
      LEFT JOIN LATERAL (
        SELECT m.body, m.created_at
        FROM bahrain_communication_messages m
        WHERE m.request_id = r.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE r.client_account_id = ${clientId}::uuid
        AND latest.created_at IS NOT NULL
      ORDER BY latest.created_at DESC
    `,
  ]);

  if (!clients[0]) return null;
  return {
    account: clients[0],
    requests: [...emergency, ...bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    conversations,
  };
}

export async function getAdminLawyerDetail(lawyerId: string) {
  const [lawyers, emergency, bookings, conversations] = await Promise.all([
    sqlClient<Record<string, unknown>[]>`
      SELECT id::text, full_name_ar, full_name_en, email, phone,
             status, country_code, created_at
      FROM bahrain_lawyers
      WHERE id = ${lawyerId}::uuid
      LIMIT 1
    `,
    sqlClient<AdminRequestSummary[]>`
      SELECT r.id::text, 'emergency'::text AS source, r.case_ref AS reference,
             r.service_status AS status, r.created_at AS "createdAt"
      FROM bahrain_emergency_requests r
      WHERE r.assigned_lawyer_id = ${lawyerId}::uuid
      ORDER BY r.created_at DESC
    `,
    sqlClient<AdminRequestSummary[]>`
      SELECT b.id::text, 'booking'::text AS source,
             ('BK-' || upper(left(b.id::text, 8))) AS reference,
             b.admin_status AS status, b.created_at AS "createdAt"
      FROM bahrain_booking_requests b
      WHERE b.selected_lawyer_id = ${lawyerId}::uuid
      ORDER BY b.created_at DESC
    `,
    sqlClient<AdminConversationSummary[]>`
      SELECT r.id::text AS "requestId", r.case_ref AS reference,
             latest.body AS "lastMessage", latest.created_at AS "lastMessageAt"
      FROM bahrain_emergency_requests r
      LEFT JOIN LATERAL (
        SELECT m.body, m.created_at
        FROM bahrain_communication_messages m
        WHERE m.request_id = r.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE r.assigned_lawyer_id = ${lawyerId}::uuid
        AND latest.created_at IS NOT NULL
      ORDER BY latest.created_at DESC
    `,
  ]);

  if (!lawyers[0]) return null;
  return {
    account: lawyers[0],
    requests: [...emergency, ...bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    conversations,
  };
}
