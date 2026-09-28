import type postgres from 'postgres';
import { ClientAuthError } from '../client-auth/validation';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DeletionQueueItem = {
  id:string; subjectRole:'client'|'lawyer'; state:string; requestedAt:string;
  purgeAfter:string; overdue:boolean; pendingSettlements:number;
  requests:Array<{requestId:string;caseRef:string;serviceStatus:string;paymentStatus:string;
    refundStatus:string;amountBhd:string;chargeId:string|null;state:string}>;
};

/** Internal store. Callers must resolve a current super-admin, never trust body actor IDs. */
export function createDeletionAdminStore(sql: postgres.Sql) {
  return {
    async list(limit=20,offset=0):Promise<DeletionQueueItem[]> {
      if (!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000) {
        throw new ClientAuthError('invalid_input',400);
      }
      const rows = await sql`SELECT l.id,l.subject_role,l.state,l.requested_at,l.purge_after,
        l.purge_after<=clock_timestamp() AS overdue,
        (SELECT count(*)::int FROM legalsos_deletion_settlements s WHERE s.lifecycle_id=l.id AND s.state='pending') AS pending,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'requestId',r.id,'caseRef',r.case_ref,'serviceStatus',r.service_status,
          'paymentStatus',r.payment_status,'refundStatus',r.refund_status,
          'amountBhd',r.base_fee_bhd::text,'chargeId',r.tap_charge_id,'state',s.state) ORDER BY r.id)
          FROM legalsos_deletion_settlements s JOIN bahrain_emergency_requests r ON r.id=s.request_id
          WHERE s.lifecycle_id=l.id),'[]'::jsonb) AS requests
        FROM legalsos_account_lifecycle l WHERE l.state<>'purged'
        ORDER BY l.purge_after,l.id LIMIT ${limit} OFFSET ${offset}`;
      return rows.map(row=>({id:row.id,subjectRole:row.subject_role,state:row.state,
        requestedAt:new Date(row.requested_at).toISOString(),purgeAfter:new Date(row.purge_after).toISOString(),
        overdue:row.overdue,pendingSettlements:row.pending,requests:row.requests}));
    },
    async settle(lifecycleId:string,requestId:string,adminId:string) {
      if(!uuid.test(lifecycleId)||!uuid.test(requestId)||!adminId.trim()||adminId.length>128) throw new ClientAuthError('invalid_input',400);
      return sql.begin(async tx=>{
        const [lifecycle]=await tx`SELECT state FROM legalsos_account_lifecycle WHERE id=${lifecycleId} FOR UPDATE`;
        if(!lifecycle) throw new ClientAuthError('settlement_not_found',404);
        if(lifecycle.state!=='pending_deletion') throw new ClientAuthError('deletion_in_progress',409);
        const [request]=await tx`SELECT service_status,payment_status,refund_status FROM bahrain_emergency_requests WHERE id=${requestId} FOR UPDATE`;
        const [task]=await tx`SELECT state,settled_at,settled_by FROM legalsos_deletion_settlements
          WHERE lifecycle_id=${lifecycleId} AND request_id=${requestId} FOR UPDATE`;
        if(!task||!request) throw new ClientAuthError('settlement_not_found',404);
        if(!['completed','cancelled'].includes(request.service_status)||
          !['success','failed','refunded'].includes(request.payment_status)||
          !['none','completed'].includes(request.refund_status)) throw new ClientAuthError('settlement_unresolved',409);
        if(task.state==='settled') return {state:'settled',settledAt:new Date(task.settled_at).toISOString(),settledBy:task.settled_by as string};
        const [updated]=await tx`UPDATE legalsos_deletion_settlements SET state='settled',settled_at=clock_timestamp(),settled_by=${adminId}
          WHERE lifecycle_id=${lifecycleId} AND request_id=${requestId} RETURNING settled_at,settled_by`;
        return {state:'settled',settledAt:new Date(updated.settled_at).toISOString(),settledBy:updated.settled_by as string};
      });
    },
  };
}
