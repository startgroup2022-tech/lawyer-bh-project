import type postgres from 'postgres';
import type { Subject } from './types';

/** Run before request ownership is detached. This is not the complete purger. */
export async function purgeDiscountIdentity(tx: postgres.TransactionSql, subject: Subject): Promise<void> {
  const [due]=await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if(!due)throw new Error('purge_not_due');
  if(subject.role==='lawyer')return;
  if(subject.role!=='client')throw new Error('invalid_subject');
  await tx`UPDATE discount_redemptions d SET user_key='deleted:'||d.id::text,tap_charge_id=NULL,
    customer_data_purged_at=COALESCE(d.customer_data_purged_at,now())
    FROM bahrain_emergency_requests r WHERE d.emergency_request_id=r.id
      AND r.client_account_id=${subject.id} AND d.flow='mobile_sos'`;
}
