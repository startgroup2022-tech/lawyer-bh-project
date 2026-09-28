import type postgres from 'postgres';
import type { Subject } from './types';

/** One cleanup stage only; not a complete account purger. */
export async function purgeOwnedNotifications(tx: postgres.TransactionSql, subject: Subject): Promise<void> {
  const [due] = await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if (!due) throw new Error('purge_not_due');
  if (subject.role === 'client') {
    // Broadcasts are shared; remove only this client's read receipts for them.
    await tx`DELETE FROM mobile_client_notification_reads
      WHERE owner_key=${'client:'+subject.id}
        OR owner_key IN (SELECT 'request:'||id::text FROM bahrain_emergency_requests
          WHERE client_account_id=${subject.id})`;
    // Request inbox copies belong to the request's client, not the lawyer inbox.
    await tx`DELETE FROM mobile_client_notifications n USING bahrain_emergency_requests r
      WHERE n.request_id=r.id AND r.client_account_id=${subject.id}`;
  } else if (subject.role === 'lawyer') {
    await tx`DELETE FROM mobile_lawyer_notifications WHERE lawyer_id=${subject.id}`;
  } else {
    throw new Error('invalid_subject');
  }
}
