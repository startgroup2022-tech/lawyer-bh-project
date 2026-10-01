import type { CommunicationParticipant } from "../access";
import { toSqlJson } from "@/lib/db/sql-json";
import type {
  CommunicationActorRole,
  CommunicationReportCategory,
  CommunicationSafetyState,
} from "./types";

type Actor = { role: CommunicationActorRole; id: string; accountId?: string };

type SafetyInput = Pick<CommunicationParticipant, "requestId" | "actor" | "peer">;

function stableActor(actor: Actor): Actor {
  return { role: actor.role, id: actor.accountId ?? actor.id };
}

type SafetyRow = {
  blocked_by_me: boolean;
  blocked_by_peer: boolean;
  chat_suspended_until: string | Date | null;
};

function iso(value: string | Date | null) {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export async function getCommunicationSafetyState(
  participant: SafetyInput,
): Promise<CommunicationSafetyState> {
  const actor = stableActor(participant.actor);
  const peer = stableActor(participant.peer);
  const { sqlClient } = await import("@/lib/db/client");
  const [row] = await sqlClient<SafetyRow[]>`
    SELECT
      EXISTS (
        SELECT 1 FROM bahrain_communication_blocks
        WHERE blocker_role=${actor.role}
          AND blocker_id=${actor.id}
          AND blocked_role=${peer.role}
          AND blocked_id=${peer.id}
          AND revoked_at IS NULL
      ) AS blocked_by_me,
      EXISTS (
        SELECT 1 FROM bahrain_communication_blocks
        WHERE blocker_role=${peer.role}
          AND blocker_id=${peer.id}
          AND blocked_role=${actor.role}
          AND blocked_id=${actor.id}
          AND revoked_at IS NULL
      ) AS blocked_by_peer,
      (
        SELECT max(expires_at)
        FROM bahrain_communication_moderation_actions
        WHERE action='chat_suspension'
          AND reversed_at IS NULL
          AND expires_at > now()
          AND (
            (target_role=${actor.role} AND target_id=${actor.id})
            OR (target_role=${peer.role} AND target_id=${peer.id})
          )
      ) AS chat_suspended_until
  `;

  return {
    blockedByMe: Boolean(row?.blocked_by_me),
    blockedByPeer: Boolean(row?.blocked_by_peer),
    chatSuspendedUntil: iso(row?.chat_suspended_until ?? null),
  };
}

export async function blockCommunicationPeer(participant: SafetyInput) {
  const actor = stableActor(participant.actor);
  const peer = stableActor(participant.peer);
  const { sqlClient } = await import("@/lib/db/client");
  await sqlClient`
    INSERT INTO bahrain_communication_blocks (
      blocker_role, blocker_id, blocked_role, blocked_id, request_id
    ) VALUES (
      ${actor.role}, ${actor.id},
      ${peer.role}, ${peer.id},
      ${participant.requestId}::uuid
    )
    ON CONFLICT (blocker_role, blocker_id, blocked_role, blocked_id)
      WHERE revoked_at IS NULL
    DO NOTHING
  `;
  return getCommunicationSafetyState(participant);
}

export async function unblockCommunicationPeer(participant: SafetyInput) {
  const actor = stableActor(participant.actor);
  const peer = stableActor(participant.peer);
  const { sqlClient } = await import("@/lib/db/client");
  await sqlClient`
    UPDATE bahrain_communication_blocks
    SET revoked_at=clock_timestamp()
    WHERE blocker_role=${actor.role}
      AND blocker_id=${actor.id}
      AND blocked_role=${peer.role}
      AND blocked_id=${peer.id}
      AND revoked_at IS NULL
  `;
  return getCommunicationSafetyState(participant);
}

export type CreateCommunicationReportInput = {
  requestId: string;
  reporter: Actor;
  reported: Actor;
  category: CommunicationReportCategory;
  description: string | null;
  idempotencyKey: string;
};

type ReportRow = {
  id: string;
  status: "open" | "dismissed" | "actioned";
  created_at: string | Date;
};

export async function createCommunicationReport(
  input: CreateCommunicationReportInput,
) {
  const { sqlClient } = await import("@/lib/db/client");
  const evidence = await sqlClient<{ id: string }[]>`
    SELECT id::text
    FROM bahrain_communication_messages
    WHERE request_id=${input.requestId}::uuid
    ORDER BY created_at DESC, id DESC
    LIMIT 20
  `;
  const evidenceIds = evidence.map(({ id }) => id);
  const inserted = await sqlClient<ReportRow[]>`
    INSERT INTO bahrain_communication_reports (
      request_id, reporter_role, reporter_id, reported_role, reported_id,
      category, description, evidence_message_ids, idempotency_key
    ) VALUES (
      ${input.requestId}::uuid,
      ${input.reporter.role}, ${input.reporter.id},
      ${input.reported.role}, ${input.reported.id},
      ${input.category}, ${input.description}, ${toSqlJson(evidenceIds)},
      ${input.idempotencyKey}::uuid
    )
    ON CONFLICT (reporter_role, reporter_id, idempotency_key)
    DO NOTHING
    RETURNING id::text, status, created_at
  `;
  if (inserted[0]) {
    await sqlClient`
      INSERT INTO mobile_admin_escalation_outbox
        (request_id, report_id, event_type, status, next_attempt_at)
      VALUES (
        ${input.requestId}::uuid, ${inserted[0].id}::uuid,
        'moderation_report', 'pending', now()
      )
      ON CONFLICT DO NOTHING
    `;
  }
  const rows = inserted.length
    ? inserted
    : await sqlClient<ReportRow[]>`
        SELECT id::text, status, created_at
        FROM bahrain_communication_reports
        WHERE reporter_role=${input.reporter.role}
          AND reporter_id=${input.reporter.id}
          AND idempotency_key=${input.idempotencyKey}::uuid
        LIMIT 1
      `;
  const report = rows[0];
  if (!report) throw new Error("report_not_persisted");

  return {
    id: report.id,
    status: report.status,
    createdAt: iso(report.created_at)!,
  };
}
