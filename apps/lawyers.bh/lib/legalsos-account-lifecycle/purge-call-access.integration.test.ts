import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeCallAccess } from './purge-call-access';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url && url !== 'postgres://127.0.0.1:57583/legalsos_lifecycle_test') throw new Error('isolated_database_required');
describe.skipIf(!url)('call capability erasure', () => {
  const schema = `call_purge_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', {connection:{search_path:schema}});
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY, client_account_id uuid)`;
    await sql`CREATE TABLE bahrain_communication_call_push_registrations(id uuid PRIMARY KEY,request_id uuid,actor_role text,actor_id text,token text)`;
  });
  beforeEach(async () => {
    await sql`DELETE FROM bahrain_communication_call_push_registrations`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async () => {try {await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);} finally {await sql.end();}});
  async function seed(role:'client'|'lawyer', due=true) {
    const id=randomUUID(), request=randomUUID(), other=randomUUID();
    await sql`INSERT INTO bahrain_emergency_requests VALUES(${request},${id}),(${other},${randomUUID()})`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES(${role},${id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,now()+${due?'-1 hour':'1 hour'}::interval)`;
    await sql`INSERT INTO bahrain_communication_call_push_registrations VALUES
      (${randomUUID()},${request},'client',${'client:'+request},'own-client'),
      (${randomUUID()},${request},'lawyer',${id},'own-lawyer'),
      (${randomUUID()},${other},'client',${'client:'+other},'other-client'),
      (${randomUUID()},${other},'lawyer',${randomUUID()},'other-lawyer')`;
    return {id};
  }
  it('removes only the closing client request capabilities, preserving both lawyer registrations',async()=>{
    const f=await seed('client');
    await sql.begin(tx=>purgeCallAccess(tx,{role:'client',id:f.id}));
    expect((await sql`SELECT token FROM bahrain_communication_call_push_registrations ORDER BY token`).map(r=>r.token))
      .toEqual(['other-client','other-lawyer','own-lawyer']);
  });
  it('removes only the closing lawyer capabilities, preserving clients',async()=>{
    const f=await seed('lawyer');
    await sql.begin(tx=>purgeCallAccess(tx,{role:'lawyer',id:f.id}));
    expect((await sql`SELECT token FROM bahrain_communication_call_push_registrations ORDER BY token`).map(r=>r.token))
      .toEqual(['other-client','other-lawyer','own-client']);
  });
  it('refuses early erasure and leaves registrations intact',async()=>{
    const f=await seed('client',false);
    await expect(sql.begin(tx=>purgeCallAccess(tx,{role:'client',id:f.id}))).rejects.toThrow('purge_not_due');
    expect(await sql`SELECT id FROM bahrain_communication_call_push_registrations`).toHaveLength(4);
  });
  it('rolls back with a later cleanup failure',async()=>{
    const f=await seed('client');
    await expect(sql.begin(async tx=>{await purgeCallAccess(tx,{role:'client',id:f.id});throw new Error('later_failure');})).rejects.toThrow('later_failure');
    expect(await sql`SELECT id FROM bahrain_communication_call_push_registrations`).toHaveLength(4);
  });
});
