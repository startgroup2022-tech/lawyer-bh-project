import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { findCallPushTokens } from './call-push-store';
const url=process.env.CHAT_TEST_DATABASE_URL;
describe.skipIf(!url)('VoIP device ownership across requests',()=>{
 const db=postgres(url!,{max:1}), schema=`voip_qa_${randomUUID().replaceAll('-','')}`;
 const first=randomUUID(),second=randomUUID(),foreign=randomUUID(),account=randomUUID();
 beforeAll(async()=>{
  await db.unsafe(`CREATE SCHEMA ${schema}`);await db.unsafe(`SET search_path TO ${schema}`);
  await db`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid)`;
  await db`CREATE TABLE bahrain_communication_call_push_registrations(request_id uuid,actor_role text,actor_id text,token_type text,token text,last_seen_at timestamptz DEFAULT now())`;
  await db`INSERT INTO bahrain_emergency_requests VALUES(${first},${account}),(${second},${account}),(${foreign},${randomUUID()})`;
  await db`INSERT INTO bahrain_communication_call_push_registrations(request_id,actor_role,actor_id,token_type,token) VALUES(${first},'client',${'client:'+first},'voip','client-device'),(${first},'lawyer','lawyer-1','voip','lawyer-device')`;
 });
 afterAll(async()=>{await db.unsafe(`DROP SCHEMA ${schema} CASCADE`);await db.end();});
 it('same client account receives calls on a different request',async()=>{expect(await findCallPushTokens(db,{requestId:second,actorRole:'client',actorId:'client:'+second,tokenType:'voip'})).toEqual(['client-device']);});
 it('different client account never receives the device token',async()=>{expect(await findCallPushTokens(db,{requestId:foreign,actorRole:'client',actorId:'client:'+foreign,tokenType:'voip'})).toEqual([]);});
 it('lawyer registration applies to a new authorized request',async()=>{expect(await findCallPushTokens(db,{requestId:second,actorRole:'lawyer',actorId:'lawyer-1',tokenType:'voip'})).toEqual(['lawyer-device']);});
});
