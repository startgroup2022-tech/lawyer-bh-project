import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { verifyMobileRequestAccessToken } from "@/lib/tap/mobile-request-access";
import { resolveCommunicationParticipant, type CommunicationRequestAccessRow } from "./access";

type AccessDatabaseRow = {
  request_id: string; contact_name: string; client_phone: string | null; mobile_request_access_digest: string | null;
  client_account_id: string | null;
  assigned_lawyer_id: string | null; assigned_lawyer_name: string | null; assigned_lawyer_phone: string | null;
  service_status: CommunicationRequestAccessRow["serviceStatus"]; country_code: string;
  client_account_closed: boolean; lawyer_account_closed: boolean;
};

export async function resolveRequestCommunicationAccess(requestId: string, request: Request) {
  const clientToken = request.headers.get("x-request-access-token")?.trim();
  const lawyer = await getMobileLawyerSession(request);
  if (!clientToken && !lawyer) return null;

  const { sqlClient } = await import("@/lib/db/client");

  const rows = await sqlClient<AccessDatabaseRow[]>`
    SELECT r.id::text AS request_id,
           r.contact_name,
           a.phone AS client_phone,
           r.mobile_request_access_digest,
           r.client_account_id::text,
           r.assigned_lawyer_id::text,
           COALESCE(NULLIF(l.full_name_ar, ''), NULLIF(l.full_name_en, ''), l.id::text) AS assigned_lawyer_name,
           l.phone AS assigned_lawyer_phone,
           r.service_status,
           r.country_code,
           (r.client_access_revoked_at IS NOT NULL OR a.is_active=false OR EXISTS (SELECT 1 FROM legalsos_account_lifecycle lifecycle
             WHERE lifecycle.subject_role='client' AND lifecycle.subject_id=r.client_account_id)) AS client_account_closed,
           (l.is_active=false OR l.status='suspended' OR EXISTS (SELECT 1 FROM legalsos_account_lifecycle lifecycle
             WHERE lifecycle.subject_role='lawyer' AND lifecycle.subject_id=r.assigned_lawyer_id)) AS lawyer_account_closed
      FROM bahrain_emergency_requests r
      LEFT JOIN bahrain_lawyers l ON l.id = r.assigned_lawyer_id
      LEFT JOIN mobile_client_accounts a ON a.id = r.client_account_id
     WHERE r.id = ${requestId}::uuid
     LIMIT 1
  `;
  const found = rows[0];
  if (!found || (lawyer && lawyer.countryCode !== found.country_code)) return null;
  if (lawyer ? found.lawyer_account_closed : found.client_account_closed) return null;
  const accessRow: CommunicationRequestAccessRow = {
    requestId: found.request_id,
    clientId: `client:${found.request_id}`,
    clientAccountId: found.client_account_id,
    clientDisplayName: found.contact_name,
    clientPhone: found.client_phone,
    mobileRequestAccessDigest: found.mobile_request_access_digest,
    assignedLawyerId: found.assigned_lawyer_id,
    assignedLawyerDisplayName: found.assigned_lawyer_name,
    assignedLawyerPhone: found.assigned_lawyer_phone,
    serviceStatus: found.service_status,
  };
  const participant = await resolveCommunicationParticipant(
    { requestId, credential: lawyer ? { kind: "lawyer", lawyerId: lawyer.lawyerId, countryCode: lawyer.countryCode } : { kind: "client", token: clientToken! } },
    { findRequest: async () => accessRow, verifyClientToken: verifyMobileRequestAccessToken },
  );
  if (participant && (found.client_account_closed || found.lawyer_account_closed)) {
    return { ...participant, peer: { ...participant.peer, phone: null }, capabilities: { read: true as const, send: false, call: false } };
  }
  return participant;
}
