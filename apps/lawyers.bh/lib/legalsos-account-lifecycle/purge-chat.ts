import type postgres from 'postgres';
import type { Subject } from './types';

/** One cleanup stage only. Does not mark the entire account purged. */
export async function purgeOwnedChatContent(tx: postgres.TransactionSql, subject: Subject): Promise<void> {
  const [due] = await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if (!due) throw new Error('purge_not_due');
  // Delete bytes before messages because attachments reference message IDs.
  // Both actor role and request ownership are required for request-scoped clients.
  if (subject.role === 'client') {
    await tx`DELETE FROM bahrain_communication_attachments a USING bahrain_emergency_requests r
      WHERE a.request_id=r.id AND r.client_account_id=${subject.id}
        AND a.sender_role='client' AND a.sender_id='client:'||r.id::text`;
    await tx`DELETE FROM bahrain_communication_messages m USING bahrain_emergency_requests r
      WHERE m.request_id=r.id AND r.client_account_id=${subject.id}
        AND m.sender_role='client' AND m.sender_id='client:'||r.id::text`;
  } else if (subject.role === 'lawyer') {
    await tx`DELETE FROM bahrain_communication_attachments WHERE sender_role='lawyer' AND sender_id=${subject.id}`;
    await tx`DELETE FROM bahrain_communication_messages WHERE sender_role='lawyer' AND sender_id=${subject.id}`;
  } else {
    throw new Error('invalid_subject');
  }
}
