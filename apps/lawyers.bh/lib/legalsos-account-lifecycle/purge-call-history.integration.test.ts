import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import {purgeCallHistoryIdentity} from './purge-call-history';
const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('isolated_database_required');
describe.skipIf(!url)('call history identity cleanup',()=>{
  const schema=`call_history_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema},onnotice:()=>{}});
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid,assigned_lawyer_id uuid)`;
    await sql.unsafe((await readFile('drizzle/0043_request_communications.sql','utf8')).replaceAll('public.',`${schema}.`));
    await sql.unsafe((await readFile('drizzle/0044_communication_signal_events.sql','utf8')).replaceAll('public.',`${schema}.`));
    await sql.unsafe(await readFile('drizzle/0099_legalsos_call_erasure_guard.sql','utf8'));
  });
  beforeEach(async()=>{
    await sql`DELETE FROM bahrain_communication_signal_events`;
    await sql`DELETE FROM bahrain_communication_calls`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  async function seed(role:'client'|'lawyer',due=true){
    const id=randomUUID(),request=randomUUID(),own=randomUUID(),peer=randomUUID();
    await sql`INSERT INTO bahrain_emergency_requests VALUES(${request},${role==='client'?id:randomUUID()},${role==='lawyer'?id:randomUUID()})`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES(${role},${id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,now()+${due?'-1 hour':'1 hour'}::interval)`;
    await sql`INSERT INTO bahrain_communication_calls(id,request_id,initiator_role,initiator_id,media_kind,status,duration_seconds,end_reason)
      VALUES(${own},${request},${role},${role==='client'?'client:'+request:id},'audio','ended',47,'private diagnostic'),
      (${peer},${request},${role==='client'?'lawyer':'client'},'peer-identity','audio','ended',25,'normal_end')`;
    await sql`INSERT INTO bahrain_communication_signal_events(request_id,sender_role,event,expires_at)
      VALUES(${request},${role},'{"network":"private"}',now()-interval '1 day')`;
    return{id,own,peer,request};
  }
  it.each(['client','lawyer'] as const)('redacts %s initiation identity while preserving peer history and duration',async role=>{
    const f=await seed(role);
    const [before]=await sql`SELECT * FROM bahrain_communication_calls WHERE id=${f.peer}`;
    await sql.begin(tx=>purgeCallHistoryIdentity(tx,{role,id:f.id}));
    expect((await sql`SELECT initiator_id,duration_seconds,status,end_reason FROM bahrain_communication_calls WHERE id=${f.own}`)[0])
      .toEqual({initiator_id:'deleted:'+f.own,duration_seconds:47,status:'ended',end_reason:null});
    expect((await sql`SELECT * FROM bahrain_communication_calls WHERE id=${f.peer}`)[0]).toEqual(before);
    expect(await sql`SELECT id FROM bahrain_communication_signal_events`).toHaveLength(0);
  });
  it('refuses early cleanup',async()=>{
    const f=await seed('client',false);
    await expect(sql.begin(tx=>purgeCallHistoryIdentity(tx,{role:'client',id:f.id}))).rejects.toThrow('purge_not_due');
  });
  it('does not allow a delayed call update to restore the erased identity',async()=>{
    const f=await seed('client');
    await sql.begin(tx=>purgeCallHistoryIdentity(tx,{role:'client',id:f.id}));
    await sql`UPDATE bahrain_communication_calls SET initiator_id=${'client:'+f.request},end_reason='late private diagnostic' WHERE id=${f.own}`;
    expect((await sql`SELECT initiator_id,end_reason FROM bahrain_communication_calls WHERE id=${f.own}`)[0])
      .toEqual({initiator_id:'deleted:'+f.own,end_reason:null});
  });
});
