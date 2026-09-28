import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeOwnedNotifications } from './purge-notifications';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '57583' ||
      parsed.pathname !== '/legalsos_lifecycle_test' || parsed.search) {
    throw new Error('Use only the isolated local lifecycle test database');
  }
}
describe.skipIf(!url)('notification erasure ownership in isolated PostgreSQL', () => {
  const schema = `notice_purge_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', {
    connection: { search_path: schema, timezone: 'UTC' },
  });
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql', 'utf8'));
    await sql`CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY)`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid,
      assigned_lawyer_id uuid,candidate_lawyer_id uuid,customer_approved_at timestamptz,
      lawyer_response_deadline timestamptz,payment_status text,service_status text,
      client_access_revoked_at timestamptz)`;
    await sql`CREATE TABLE bahrain_communication_messages(id uuid,request_id uuid,sender_role text,created_at timestamptz)`;
    await sql`CREATE TABLE bahrain_admin_mobile_notification_sends(id uuid,state text,audience text,
      completed_at timestamptz,title_ar text,body_ar text,title_en text,body_en text)`;
    for (const file of ['0049_mobile_client_notifications','0090_lawyer_notification_inbox']) {
      await sql.unsafe(await readFile(`drizzle/${file}.sql`, 'utf8'));
    }
    await sql.unsafe(await readFile('drizzle/0095_legalsos_notification_erasure_guard.sql', 'utf8'));
  });
  beforeEach(async () => {
    await sql`DELETE FROM mobile_client_notifications`;
    await sql`DELETE FROM mobile_lawyer_notifications`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM bahrain_lawyers`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async () => {
    try { await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`); }
    finally { await sql.end(); }
  });
  async function seed(role: 'client'|'lawyer', due = true) {
    const id=randomUUID(), peer=randomUUID(), request=randomUUID(), otherRequest=randomUUID();
    await sql`INSERT INTO bahrain_lawyers VALUES(${id}),(${peer})`;
    await sql`INSERT INTO bahrain_emergency_requests(id,client_account_id) VALUES(${request},${id}),(${otherRequest},${peer})`;
    const own=randomUUID(), other=randomUUID(), announcement=randomUUID();
    await sql`INSERT INTO mobile_client_notifications(id,request_id,kind,body_en)
      VALUES(${own},${request},'new_message','private own'),(${other},${otherRequest},'new_message','private peer'),
        (${announcement},NULL,'announcement','public announcement')`;
    await sql`INSERT INTO mobile_client_notification_reads(owner_key,notification_id)
      VALUES(${'request:'+request},${own}),(${'client:'+id},${announcement}),(${'client:'+peer},${announcement})`;
    await sql`INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind)
      VALUES(${id},${request},'new_message'),(${peer},${request},'new_message')`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES(${role},${id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,
        now()+${due?'-1 hour':'1 hour'}::interval)`;
    if(role==='client') await sql`UPDATE bahrain_emergency_requests SET client_access_revoked_at=now() WHERE id=${request}`;
    return {id,peer,request,own,other,announcement};
  }
  it('erases client-owned notification copies and read receipts, preserving broadcasts and peer inboxes', async () => {
    const f=await seed('client');
    await sql.begin(tx=>purgeOwnedNotifications(tx,{role:'client',id:f.id}));
    expect((await sql`SELECT id FROM mobile_client_notifications`).map(r=>r.id).sort()).toEqual([f.other,f.announcement].sort());
    expect(await sql`SELECT owner_key FROM mobile_client_notification_reads`).toEqual([{owner_key:'client:'+f.peer}]);
    expect(await sql`SELECT id FROM mobile_lawyer_notifications`).toHaveLength(2);
  });
  it('erases only the lawyer inbox, without deleting client messages or the website identity', async () => {
    const f=await seed('lawyer');
    await sql.begin(tx=>purgeOwnedNotifications(tx,{role:'lawyer',id:f.id}));
    expect(await sql`SELECT lawyer_id FROM mobile_lawyer_notifications`).toEqual([{lawyer_id:f.peer}]);
    expect(await sql`SELECT id FROM mobile_client_notifications`).toHaveLength(3);
    expect(await sql`SELECT id FROM bahrain_lawyers`).toHaveLength(2);
  });
  it('does not erase anything before the exact deadline has elapsed', async () => {
    const f=await seed('client',false);
    await expect(sql.begin(tx=>purgeOwnedNotifications(tx,{role:'client',id:f.id}))).rejects.toThrow('purge_not_due');
    expect(await sql`SELECT id FROM mobile_client_notifications`).toHaveLength(3);
  });
  it('rolls back notification erasure if a later account cleanup stage fails', async () => {
    const f=await seed('client');
    await expect(sql.begin(async tx=>{
      await purgeOwnedNotifications(tx,{role:'client',id:f.id});
      throw new Error('later_stage_failed');
    })).rejects.toThrow('later_stage_failed');
    expect(await sql`SELECT id FROM mobile_client_notifications`).toHaveLength(3);
    expect(await sql`SELECT owner_key FROM mobile_client_notification_reads`).toHaveLength(3);
  });
  it('prevents a late client notification or read receipt from restoring erased data after ownership is detached', async () => {
    const f=await seed('client');
    await sql.begin(tx=>purgeOwnedNotifications(tx,{role:'client',id:f.id}));
    await sql`UPDATE bahrain_emergency_requests SET client_account_id=NULL WHERE id=${f.request}`;
    await sql`INSERT INTO mobile_client_notifications(request_id,kind,body_en) VALUES(${f.request},'new_message','late private data')`;
    await sql`INSERT INTO mobile_client_notification_reads(owner_key,notification_id)
      VALUES(${'client:'+f.id},${f.announcement}),(${'request:'+f.request},${f.announcement})`;
    expect(await sql`SELECT id FROM mobile_client_notifications WHERE request_id=${f.request}`).toHaveLength(0);
    expect(await sql`SELECT owner_key FROM mobile_client_notification_reads`).toEqual([{owner_key:'client:'+f.peer}]);
  });
  it('prevents late lawyer inbox writes, while the other lawyer still receives notifications', async () => {
    const f=await seed('lawyer');
    await sql.begin(tx=>purgeOwnedNotifications(tx,{role:'lawyer',id:f.id}));
    await sql`INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind)
      VALUES(${f.id},${f.request},'service_completed'),(${f.peer},${f.request},'service_completed')`;
    expect(await sql`SELECT id FROM mobile_lawyer_notifications WHERE lawyer_id=${f.id}`).toHaveLength(0);
    expect(await sql`SELECT id FROM mobile_lawyer_notifications WHERE lawyer_id=${f.peer}`).toHaveLength(2);
  });
});
