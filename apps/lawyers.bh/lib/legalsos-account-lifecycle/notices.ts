import type postgres from 'postgres';
export type DeletionNotice={requestId:string;recipientRole:'client'|'lawyer';lawyerId:string|null;locale:'ar'|'en'};
export function createDeletionNoticeDelivery(sql:postgres.Sql,deliver:(notice:DeletionNotice)=>Promise<void>){
  return async()=>{
    const attempted:string[]=[];let processed=0,failed=0,skipped=0;
    for(let i=0;i<25;i++){
      let claimed=false;
      try{
        const outcome=await sql.begin(async tx=>{
          const [row]=await tx`SELECT lifecycle_id,request_id,recipient_role FROM legalsos_deletion_notifications
            WHERE state='pending' AND NOT((lifecycle_id::text||':'||request_id::text||':'||recipient_role)=ANY(${attempted}::text[]))
            ORDER BY created_at,lifecycle_id,request_id,recipient_role LIMIT 1 FOR UPDATE SKIP LOCKED`;
          if(!row)return 'empty';
          claimed=true;attempted.push(`${row.lifecycle_id}:${row.request_id}:${row.recipient_role}`);
          const [request]=await tx`SELECT client_account_id,client_access_revoked_at,assigned_lawyer_id FROM bahrain_emergency_requests WHERE id=${row.request_id} FOR SHARE`;
          const recipientId=row.recipient_role==='lawyer'?request?.assigned_lawyer_id:request?.client_account_id;
          const [closed]=recipientId?await tx`SELECT id FROM legalsos_account_lifecycle WHERE subject_role=${row.recipient_role} AND subject_id=${recipientId}`:[];
          const skip=!request||!!closed||(row.recipient_role==='client'?!!request.client_access_revoked_at:!recipientId);
          if(!skip){
            if(row.recipient_role==='lawyer')await tx`INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind)
              VALUES(${recipientId},${row.request_id},'account_closure_followup')`;
            else await tx`INSERT INTO mobile_client_notifications(request_id,kind,source_key,title_ar,title_en,body_ar,body_en)
              VALUES(${row.request_id},'account_closure_followup',${'closure:'+row.lifecycle_id+':'+row.request_id},
                'الإدارة تتابع طلبك','Administration is following up',
                'تتابع الإدارة الإجراءات المتبقية على طلبك.','Administration is following up on the remaining steps for your request.') ON CONFLICT(source_key) DO NOTHING`;
            const [device]=await tx`SELECT i.locale FROM bahrain_mobile_push_installations i
              WHERE (${row.recipient_role}='lawyer' AND i.lawyer_id=${recipientId}::uuid)
                OR (${row.recipient_role}='client' AND i.lawyer_id IS NULL AND EXISTS(
                  SELECT 1 FROM bahrain_mobile_push_request_subscriptions s WHERE s.installation_id=i.id AND s.request_id=${row.request_id}))
              ORDER BY i.last_seen_at DESC,i.id LIMIT 1`;
            await deliver({requestId:row.request_id,recipientRole:row.recipient_role,lawyerId:row.recipient_role==='lawyer'?recipientId:null,locale:device?.locale==='en'?'en':'ar'});
          }
          await tx`UPDATE legalsos_deletion_notifications SET state=${skip?'skipped':'sent'},sent_at=${skip?null:new Date()}
            WHERE lifecycle_id=${row.lifecycle_id} AND request_id=${row.request_id} AND recipient_role=${row.recipient_role}`;
          return skip?'skipped':'sent';
        });
        if(outcome==='empty')break;
        if(outcome==='skipped')skipped++;else processed++;
      }catch{if(!claimed)throw new Error('notice_queue_unavailable');failed++;}
    }
    return {processed,failed,skipped};
  };
}
