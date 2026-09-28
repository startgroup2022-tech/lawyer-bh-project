import {readFileSync} from 'node:fs';
import postgres from 'postgres';
import {it,expect} from 'vitest';
import {createLawyerInboxStore} from './store';
const url=process.env.SERVICE_TEST_DATABASE_URL;
it.skipIf(!url)('persists real offer and message events with isolated read ownership',async()=>{
 const u=new URL(url!);
 if(u.hostname!=='127.0.0.1'||u.port!=='57583'||u.pathname!=='/legalsos_service_test')throw Error('isolated database required');
 const sql=postgres(url!,{max:1});
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',r='33333333-3333-4333-8333-333333333333';
 try{
 await sql`CREATE TABLE bahrain_lawyers(id uuid primary key)`;
 await sql`CREATE TABLE bahrain_emergency_requests(id uuid primary key,assigned_lawyer_id uuid,candidate_lawyer_id uuid,customer_approved_at timestamptz,lawyer_response_deadline timestamptz,service_status text)`;
 await sql`CREATE TABLE bahrain_communication_messages(id uuid primary key,request_id uuid,sender_role text,created_at timestamptz)`;
 for(const s of readFileSync(new URL('../../drizzle/0090_lawyer_notification_inbox.sql',import.meta.url),'utf8').split('--> statement-breakpoint'))await sql.unsafe(s);
 await sql`INSERT INTO bahrain_lawyers VALUES(${a}),(${b})`;
 await sql`INSERT INTO bahrain_emergency_requests(id,candidate_lawyer_id,service_status) VALUES(${r},${a},'pending')`;
 await sql`UPDATE bahrain_emergency_requests SET customer_approved_at=now(),lawyer_response_deadline=now()+interval '5 minutes' WHERE id=${r}`;
 const store=createLawyerInboxStore(sql),input={filter:'all' as const,before:null,beforeId:null,readId:null,readThrough:null};
 const first=await store.run(a,input);expect(first.unreadCount).toBe(1);expect(first.items[0].kind).toBe('lawyer_offer');
 expect((await store.run(b,{...input,readId:first.items[0].id})).items).toEqual([]);
 expect((await store.run(a,input)).unreadCount).toBe(1);
 expect((await store.run(a,{...input,readId:first.items[0].id})).unreadCount).toBe(0);
 await sql`UPDATE bahrain_emergency_requests SET assigned_lawyer_id=${a},service_status='mobilizing' WHERE id=${r}`;
 await sql`INSERT INTO bahrain_communication_messages VALUES(gen_random_uuid(),${r},'client',now())`;
 await sql`INSERT INTO bahrain_communication_messages VALUES(gen_random_uuid(),${r},'lawyer',now())`;
 const next=await store.run(a,input);expect(next.items.filter(x=>x.kind==='new_message')).toHaveLength(1);
 expect(next.unreadCount).toBe(2);
 expect((await store.run(a,{...input,readId:next.items.find(x=>x.kind==='new_message')!.id})).unreadCount).toBe(1);
 }finally{
 await sql`DROP TABLE IF EXISTS mobile_lawyer_notifications`;
 await sql`DROP TABLE IF EXISTS bahrain_communication_messages`;
 await sql`DROP TABLE IF EXISTS bahrain_emergency_requests`;
 await sql`DROP TABLE IF EXISTS bahrain_lawyers`;
 await sql`DROP FUNCTION IF EXISTS record_mobile_lawyer_notification()`;
 await sql.end();
 }
});
