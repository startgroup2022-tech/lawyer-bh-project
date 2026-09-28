import type postgres from 'postgres';
import type {LawyerInboxInput} from './http';
import {notificationTimestamp,type InboxPage,type InboxItem} from '../client-notifications/store';
export function createLawyerInboxStore(sql:postgres.Sql){
 return {async run(owner:string,input:LawyerInboxInput):Promise<InboxPage>{
  return await sql.begin(async tx=>{
   const [clock]=await tx`SELECT clock_timestamp() AS now`;
   const snapshotAt=notificationTimestamp(clock.now);
   if(input.readId||input.readThrough)await tx`UPDATE mobile_lawyer_notifications SET read_at=clock_timestamp()
     WHERE lawyer_id=${owner}::uuid AND read_at IS NULL AND
       (id=${input.readId??null}::uuid OR (${input.readThrough??null}::timestamptz IS NOT NULL AND created_at<=LEAST(${input.readThrough??null}::timestamptz,${snapshotAt}::timestamptz)))`;
   const [count]=await tx`SELECT count(*)::int AS n FROM mobile_lawyer_notifications WHERE lawyer_id=${owner}::uuid AND read_at IS NULL`;
   const rows=await tx`SELECT id,request_id,kind,created_at,read_at FROM mobile_lawyer_notifications
     WHERE lawyer_id=${owner}::uuid AND (${input.filter}='all' OR read_at IS NULL)
       AND (${input.before??null}::timestamptz IS NULL OR (created_at,id)<(${input.before??null}::timestamptz,${input.beforeId??null}::uuid))
     ORDER BY created_at DESC,id DESC LIMIT 51`;
   const items:InboxItem[]=rows.slice(0,50).map(r=>({id:r.id,requestId:r.request_id,kind:r.kind,createdAt:notificationTimestamp(r.created_at),readAt:r.read_at?notificationTimestamp(r.read_at):null,titleAr:null,titleEn:null,bodyAr:null,bodyEn:null}));
   const last=items.at(-1);
   return {items,unreadCount:count.n,snapshotAt,nextCursor:rows.length>50&&last?{at:last.createdAt,id:last.id}:null};
  });
 }};
}
