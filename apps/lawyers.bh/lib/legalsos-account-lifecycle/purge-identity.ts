import type postgres from 'postgres';
import type { Subject } from './types';

/** Final identity stage, after all request-owned cleanup. Not a complete purger. */
export async function purgeAppIdentity(tx: postgres.TransactionSql, subject: Subject): Promise<void> {
  const [due]=await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if(!due) throw new Error('purge_not_due');
  if(subject.role==='client'){
    const [account]=await tx`SELECT email FROM mobile_client_accounts WHERE id=${subject.id} FOR UPDATE`;
    const requests=await tx`SELECT client_access_revoked_at,client_data_purged_at
      FROM bahrain_emergency_requests WHERE client_account_id=${subject.id} ORDER BY id FOR UPDATE`;
    if(requests.some(r=>!r.client_access_revoked_at || !r.client_data_purged_at)){
      throw new Error('request_cleanup_incomplete');
    }
    await tx`DELETE FROM mobile_client_sessions WHERE client_id=${subject.id}`;
    if(account){
      await tx`DELETE FROM mobile_client_challenges WHERE client_id=${subject.id} OR email=${account.email}`;
    }else{
      await tx`DELETE FROM mobile_client_challenges WHERE client_id=${subject.id}`;
    }
    // Database FKs detach website bookings and emergency requests. Do not delete
    // those shared records or their payment allocations as an account shortcut.
    await tx`DELETE FROM mobile_client_accounts WHERE id=${subject.id}`;
  }else if(subject.role!=='lawyer'){
    throw new Error('invalid_subject');
  }
  // Lawyer identity is shared with the website. Keep it and the app denial row.
  await tx`DELETE FROM legalsos_deletion_proofs WHERE subject_role=${subject.role} AND subject_id=${subject.id}`;
}
