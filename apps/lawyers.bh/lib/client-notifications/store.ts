import type postgres from 'postgres';
import type {InboxInput} from './input';

export type InboxItem={id:string;requestId:string|null;kind:string;titleAr:string|null;bodyAr:string|null;titleEn:string|null;bodyEn:string|null;createdAt:string;readAt:string|null};
export type InboxPage={items:InboxItem[];unreadCount:number;snapshotAt:string;nextCursor:{at:string;id:string}|null};

export function notificationTimestamp(value:unknown):string {
  const parsed=value instanceof Date?value:new Date(String(value));
  if(!Number.isFinite(parsed.getTime()))throw new TypeError('Invalid notification timestamp');
  return parsed.toISOString();
}

export function createInboxStore(sql:postgres.Sql) {
  return {
    async run(input:InboxInput,clientId:string|null):Promise<InboxPage> {
      // requestIds are verified capabilities, never raw IDs from the HTTP body.
      const ids=sql.array(input.requestIds,2950);
      const authorized=sql`(e.request_id = ANY(${ids}::uuid[]) OR (e.kind='announcement' AND ${clientId}::text IS NOT NULL))`;
      const owner=sql`CASE WHEN e.request_id IS NOT NULL THEN 'request:' || e.request_id::text ELSE 'client:' || ${clientId}::text END`;
      return await sql.begin(async tx=>{
        const [clock]=await tx`SELECT date_trunc('milliseconds',clock_timestamp()) AS snapshot`;
        const snapshotAt=notificationTimestamp(clock.snapshot);
        if(input.readId||input.readThrough) {
          await tx`INSERT INTO mobile_client_notification_reads(owner_key,notification_id)
            SELECT ${owner},e.id FROM mobile_client_notifications e
            WHERE ${authorized} AND (
              e.id=${input.readId}::uuid OR
              (${input.readThrough}::timestamptz IS NOT NULL AND e.created_at<=LEAST(${input.readThrough}::timestamptz,${snapshotAt}::timestamptz)))
            ON CONFLICT DO NOTHING`;
        }
        const [result]=await tx`
          WITH eligible AS (
            SELECT e.*,r.read_at FROM mobile_client_notifications e
            LEFT JOIN mobile_client_notification_reads r ON r.notification_id=e.id AND r.owner_key=${owner}
            WHERE ${authorized}
          ), page AS (
            SELECT * FROM eligible WHERE (${input.filter}='all' OR read_at IS NULL)
              AND (${input.before}::timestamptz IS NULL OR (created_at,id)<(${input.before}::timestamptz,${input.beforeId}::uuid))
            ORDER BY created_at DESC,id DESC LIMIT 51
          )
          SELECT (SELECT count(*)::int FROM eligible WHERE read_at IS NULL) AS unread_count,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'id',id,'requestId',request_id,'kind',kind,'titleAr',title_ar,'bodyAr',body_ar,
              'titleEn',title_en,'bodyEn',body_en,'createdAt',created_at,'readAt',read_at)
              ORDER BY created_at DESC,id DESC) FROM page),'[]'::jsonb) AS items`;
        const fetched=result.items as InboxItem[];
        const items=fetched.slice(0,50),last=items.at(-1);
        return {items,unreadCount:result.unread_count as number,snapshotAt,nextCursor:fetched.length>50&&last?{at:last.createdAt,id:last.id}:null};
      });
    },
  };
}
