import type postgres from 'postgres';
import type {Subject} from './types';
export async function purgeCallHistoryIdentity(tx:postgres.TransactionSql,subject:Subject):Promise<void>{
  const [due]=await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if(!due)throw new Error('purge_not_due');
  if(subject.role==='client'){
    await tx`UPDATE bahrain_communication_calls c SET initiator_id='deleted:'||c.id::text,end_reason=NULL,
      initiator_data_purged_at=COALESCE(c.initiator_data_purged_at,now())
      FROM bahrain_emergency_requests r WHERE c.request_id=r.id AND r.client_account_id=${subject.id}
      AND c.initiator_role='client' AND c.initiator_id='client:'||r.id::text`;
  }else if(subject.role==='lawyer'){
    await tx`UPDATE bahrain_communication_calls SET initiator_id='deleted:'||id::text,end_reason=NULL,
      initiator_data_purged_at=COALESCE(initiator_data_purged_at,now())
      WHERE initiator_role='lawyer' AND initiator_id=${subject.id}`;
  }else throw new Error('invalid_subject');
  // Expired signalling is transient transport data, not either party's call history.
  await tx`DELETE FROM bahrain_communication_signal_events WHERE expires_at<=now()`;
}
