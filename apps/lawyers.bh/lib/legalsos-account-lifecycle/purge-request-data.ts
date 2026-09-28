import type postgres from 'postgres';
import type { Subject } from './types';

/** Request-owned personal data stage; financial and identity stages are separate. */
export async function purgeOwnedRequestData(tx: postgres.TransactionSql, subject: Subject): Promise<void> {
  const [due]=await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if(!due) throw new Error('purge_not_due');
  if(subject.role==='client'){
    const requests=await tx`SELECT id,consent_id FROM bahrain_emergency_requests
      WHERE client_account_id=${subject.id} ORDER BY id FOR UPDATE`;
    await tx`UPDATE bahrain_payment_allocations a SET customer_name_snapshot=NULL,
      customer_data_purged_at=COALESCE(a.customer_data_purged_at,now()),
      split_error=NULL,reconciliation_error=NULL FROM bahrain_emergency_requests r
      WHERE a.emergency_request_id=r.id AND r.client_account_id=${subject.id}`;
    await tx`UPDATE bahrain_emergency_requests SET contact_name='',contact_phone='',contact_id_number=NULL,
      description=NULL,location=NULL,rating_comment=NULL,internal_notes='[]'::json,
      cancellation_reason=NULL,tap_payload=NULL,consent_id=NULL,client_data_purged_at=COALESCE(client_data_purged_at,now())
      WHERE client_account_id=${subject.id}`;
    const consents=[...new Set(requests.map(r=>r.consent_id).filter(Boolean))];
    if(consents.length){
      // A consent may also belong to an independent website identity or another
      // request. Delete only the now-unreferenced app copy; FK races roll back.
      await tx`DELETE FROM bahrain_consent_log c WHERE c.id=ANY(${consents}::uuid[])
        AND NOT EXISTS(SELECT 1 FROM bahrain_lawyers l WHERE l.consent_id=c.id)
        AND NOT EXISTS(SELECT 1 FROM bahrain_emergency_requests r WHERE r.consent_id=c.id)`;
    }
  }else if(subject.role==='lawyer'){
    // This is the request's app-only live trace, not the shared website location.
    await tx`UPDATE bahrain_emergency_requests SET last_advocate_location=NULL WHERE assigned_lawyer_id=${subject.id}`;
  }else{
    throw new Error('invalid_subject');
  }
}
