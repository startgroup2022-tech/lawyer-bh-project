import type { ModerationAction } from "../safety/types";

type ReportStatus = "open" | "dismissed" | "actioned";

function iso(value: string | Date | null) {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export async function listModerationReports(input: {
  status: ReportStatus | "all";
  limit: number;
}) {
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<Record<string, unknown>[]>`
    SELECT r.id::text, r.request_id::text, r.reporter_role, r.reporter_id,
           r.reported_role, r.reported_id, r.category, r.description,
           r.status, r.created_at, r.reviewed_at, r.resolved_at,
           CASE WHEN r.reported_role='lawyer'
             THEN (SELECT COALESCE(NULLIF(full_name_ar,''),NULLIF(full_name_en,''),email) FROM bahrain_lawyers WHERE id::text=r.reported_id)
             ELSE (SELECT COALESCE(NULLIF(full_name,''),email) FROM mobile_client_accounts WHERE id::text=r.reported_id)
           END AS reported_name
    FROM bahrain_communication_reports r
    WHERE (${input.status}='all' OR r.status=${input.status})
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ${input.limit}
  `;
  return {
    items: rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      reporterRole: row.reporter_role,
      reporterId: row.reporter_id,
      reportedRole: row.reported_role,
      reportedId: row.reported_id,
      reportedName: row.reported_name,
      category: row.category,
      description: row.description,
      status: row.status,
      createdAt: iso(row.created_at as string | Date),
      reviewedAt: iso(row.reviewed_at as string | Date | null),
      resolvedAt: iso(row.resolved_at as string | Date | null),
    })),
    nextCursor: null,
  };
}

export async function getModerationReport(id: string) {
  const { sqlClient } = await import("@/lib/db/client");
  const [report] = await sqlClient<Record<string, unknown>[]>`
    SELECT r.*, r.id::text, r.request_id::text, r.reviewed_by::text
    FROM bahrain_communication_reports r
    WHERE r.id=${id}::uuid
    LIMIT 1
  `;
  if (!report) return null;
  const evidenceIds = Array.isArray(report.evidence_message_ids)
    ? report.evidence_message_ids.map(String)
    : [];
  const evidence = await sqlClient<Record<string, unknown>[]>`
    SELECT m.id::text, m.sender_role, m.body, m.created_at
    FROM bahrain_communication_messages m
    WHERE m.id = ANY(${evidenceIds}::uuid[])
    ORDER BY m.created_at ASC, m.id ASC
  `;
  const actions = await sqlClient<Record<string, unknown>[]>`
    SELECT id::text, report_id::text, target_role, target_id, action,
           admin_id::text, internal_reason, public_message_ar,
           public_message_en, expires_at, created_at, reversed_at,
           reversed_by::text, reversal_reason
    FROM bahrain_communication_moderation_actions
    WHERE report_id=${id}::uuid
    ORDER BY created_at ASC, id ASC
  `;
  return {
    id: report.id,
    requestId: report.request_id,
    reporterRole: report.reporter_role,
    reporterId: report.reporter_id,
    reportedRole: report.reported_role,
    reportedId: report.reported_id,
    category: report.category,
    description: report.description,
    status: report.status,
    createdAt: iso(report.created_at as string | Date),
    reviewedAt: iso(report.reviewed_at as string | Date | null),
    resolvedAt: iso(report.resolved_at as string | Date | null),
    resolutionNote: report.resolution_note,
    evidence: evidence.map((message) => ({
      id: message.id,
      senderRole: message.sender_role,
      body: message.body,
      createdAt: iso(message.created_at as string | Date),
    })),
    actions: actions.map((action) => ({
      id: action.id,
      action: action.action,
      targetRole: action.target_role,
      targetId: action.target_id,
      adminId: action.admin_id,
      internalReason: action.internal_reason,
      publicMessageAr: action.public_message_ar,
      publicMessageEn: action.public_message_en,
      expiresAt: iso(action.expires_at as string | Date | null),
      createdAt: iso(action.created_at as string | Date),
      reversedAt: iso(action.reversed_at as string | Date | null),
      reversedBy: action.reversed_by,
      reversalReason: action.reversal_reason,
    })),
  };
}

export type ApplyModerationActionInput = {
  reportId: string;
  adminId: string;
  action: ModerationAction;
  internalReason: string;
  publicMessageAr: string | null;
  publicMessageEn: string | null;
  expiresAt: string | null;
};

export async function applyModerationAction(input: ApplyModerationActionInput) {
  const { sqlClient } = await import("@/lib/db/client");
  return sqlClient.begin(async (tx) => {
    const [report] = await tx<Record<string, unknown>[]>`
      SELECT id::text, reported_role, reported_id, status
      FROM bahrain_communication_reports
      WHERE id=${input.reportId}::uuid
      FOR UPDATE
    `;
    if (!report) throw new Error("moderation_report_not_found");
    const role = String(report.reported_role);
    const targetId = String(report.reported_id);

    if (input.action === "chat_reactivation") {
      await tx`
        UPDATE bahrain_communication_moderation_actions
        SET reversed_at=clock_timestamp(), reversed_by=${input.adminId}::uuid,
            reversal_reason=${input.internalReason}
        WHERE target_role=${role} AND target_id=${targetId}
          AND action='chat_suspension' AND reversed_at IS NULL
      `;
    }
    if (input.action === "account_suspension") {
      if (role === "lawyer") {
        await tx`
          UPDATE bahrain_lawyers SET status='suspended', is_active=false,
            suspension_type='complaints', suspension_reason=${input.internalReason},
            suspended_at=clock_timestamp(), suspended_by=${input.adminId}, updated_at=clock_timestamp()
          WHERE id=${targetId}::uuid
        `;
      } else {
        await tx`UPDATE mobile_client_accounts SET is_active=false WHERE id=${targetId}::uuid`;
        await tx`DELETE FROM mobile_client_sessions WHERE client_id=${targetId}::uuid`;
      }
    }
    if (input.action === "account_reactivation") {
      if (role === "lawyer") {
        await tx`
          UPDATE bahrain_lawyers SET status='approved', is_active=true,
            suspension_type=NULL, suspension_reason=NULL, suspended_at=NULL,
            suspended_by=NULL, updated_at=clock_timestamp()
          WHERE id=${targetId}::uuid
        `;
      } else {
        await tx`UPDATE mobile_client_accounts SET is_active=true WHERE id=${targetId}::uuid`;
      }
      await tx`
        UPDATE bahrain_communication_moderation_actions
        SET reversed_at=clock_timestamp(), reversed_by=${input.adminId}::uuid,
            reversal_reason=${input.internalReason}
        WHERE target_role=${role} AND target_id=${targetId}
          AND action='account_suspension' AND reversed_at IS NULL
      `;
    }

    await tx`
      INSERT INTO bahrain_communication_moderation_actions (
        report_id, target_role, target_id, action, admin_id,
        internal_reason, public_message_ar, public_message_en, expires_at
      ) VALUES (
        ${input.reportId}::uuid, ${role}, ${targetId}, ${input.action},
        ${input.adminId}::uuid, ${input.internalReason},
        ${input.publicMessageAr}, ${input.publicMessageEn},
        ${input.expiresAt ? new Date(input.expiresAt) : null}
      )
    `;
    const status = input.action === "dismissal" ? "dismissed" : "actioned";
    await tx`
      UPDATE bahrain_communication_reports
      SET status=${status}, reviewed_at=COALESCE(reviewed_at,clock_timestamp()),
          resolved_at=clock_timestamp(), reviewed_by=${input.adminId}::uuid,
          resolution_note=${input.internalReason}
      WHERE id=${input.reportId}::uuid
    `;
    return { reportId: input.reportId, status, action: input.action };
  });
}
