import type postgres from 'postgres';
import type { Subject } from './types';

/** Cleanup stage only. Run before detaching request ownership; not a full account purge. */
export async function purgeCallAccess(tx: postgres.TransactionSql, subject: Subject): Promise<void> {
  const [due] = await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if (!due) throw new Error('purge_not_due');
  if (subject.role === 'client') {
    await tx`DELETE FROM bahrain_communication_call_push_registrations p
      USING bahrain_emergency_requests r
      WHERE p.request_id=r.id AND r.client_account_id=${subject.id}
        AND p.actor_role='client' AND p.actor_id='client:'||r.id::text`;
  } else if (subject.role === 'lawyer') {
    await tx`DELETE FROM bahrain_communication_call_push_registrations
      WHERE actor_role='lawyer' AND actor_id=${subject.id}`;
  } else {
    throw new Error('invalid_subject');
  }
}
