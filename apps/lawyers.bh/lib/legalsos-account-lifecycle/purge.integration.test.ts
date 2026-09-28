import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPurgeWorker } from './purge';
import { purgeOwnedChatContent } from './purge-chat';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '57583' ||
      parsed.pathname !== '/legalsos_lifecycle_test' || parsed.search) {
    throw new Error('Use only the isolated local lifecycle test database');
  }
}
describe.skipIf(!url)('purge execution with real isolated PostgreSQL', () => {
  const schema = `purge_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', {
    connection: { search_path: schema, timezone: 'UTC' }, max: 5,
  });
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql', 'utf8'));
    await sql`CREATE TABLE synthetic_private_data (subject_id uuid PRIMARY KEY, content text)`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY, client_account_id uuid)`;
    await sql.unsafe((await readFile('drizzle/0043_request_communications.sql','utf8')).replaceAll('public.', `${schema}.`));
    await sql.unsafe(await readFile('drizzle/0085_communication_attachments.sql','utf8'));
  });
  beforeEach(async () => {
    await sql`DELETE FROM synthetic_private_data`;
    await sql`DELETE FROM bahrain_communication_attachments`;
    await sql`DELETE FROM bahrain_communication_messages`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async () => {
    try { await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`); }
    finally { await sql.end(); }
  });
  async function seed(due: boolean) {
    const id = randomUUID();
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES ('client',${id},now()-interval '720 hours'+${due ? '-1 second' : '1 hour'}::interval,
        now()+${due ? '-1 second' : '1 hour'}::interval)`;
    await sql`INSERT INTO synthetic_private_data VALUES (${id},'synthetic private bytes')`;
    return id;
  }
  const cleanup = async (tx: postgres.TransactionSql, subject: { id: string }) => {
    await tx`DELETE FROM synthetic_private_data WHERE subject_id=${subject.id}`;
  };
  it('processes only due accounts and is idempotent on the next run', async () => {
    const due = await seed(true), later = await seed(false);
    const worker = createPurgeWorker(sql, cleanup);
    expect(await worker(10)).toEqual({ processed: 1, failed: 0 });
    expect(await sql`SELECT subject_id FROM synthetic_private_data`).toEqual([{subject_id: later}]);
    expect((await sql`SELECT state FROM legalsos_account_lifecycle WHERE subject_id=${due}`)[0].state).toBe('purged');
    expect(await worker(10)).toEqual({ processed: 0, failed: 0 });
  });
  it('rolls back partial cleanup and retries the same account on a later run', async () => {
    const id = await seed(true);
    const failed = createPurgeWorker(sql, async (tx, subject) => {
      await cleanup(tx, subject);
      throw new Error('synthetic storage failure');
    });
    expect(await failed(3)).toEqual({processed: 0, failed: 1});
    expect(await sql`SELECT subject_id FROM synthetic_private_data`).toEqual([{subject_id: id}]);
    expect((await sql`SELECT state FROM legalsos_account_lifecycle`)[0].state).toBe('pending_deletion');
    expect(await createPurgeWorker(sql, cleanup)(3)).toEqual({processed: 1, failed: 0});
  });
  it('skips a row held by a concurrent worker without deleting it twice', async () => {
    await seed(true);
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const first = createPurgeWorker(sql, async (tx, subject) => {
      started(); await barrier; await cleanup(tx, subject);
    })(1);
    try {
      await entered;
      expect(await createPurgeWorker(sql, cleanup)(1)).toEqual({processed: 0, failed: 0});
    } finally { release(); }
    expect(await first).toEqual({processed: 1, failed: 0});
  });
  it('continues past a failing account without extending its deadline', async () => {
    const bad = await seed(true); await seed(true);
    const [before] = await sql`SELECT purge_after FROM legalsos_account_lifecycle WHERE subject_id=${bad}`;
    expect(await createPurgeWorker(sql, async (tx, subject) => {
      if (subject.id === bad) throw new Error('failure');
      await cleanup(tx, subject);
    })(10)).toEqual({processed: 1, failed: 1});
    const [after] = await sql`SELECT purge_after FROM legalsos_account_lifecycle WHERE subject_id=${bad}`;
    expect(after.purge_after).toEqual(before.purge_after);
  });
  it('rejects unbounded batch sizes before any cleanup', async () => {
    await seed(true);
    for (const size of [0, -1, 101, 1.5, NaN]) {
      await expect(createPurgeWorker(sql, cleanup)(size)).rejects.toThrow('invalid_purge_limit');
    }
    expect(await sql`SELECT * FROM synthetic_private_data`).toHaveLength(1);
  });
  for (const role of ['client','lawyer'] as const) {
    it(`removes only the closing ${role}'s messages and attachment bytes`, async () => {
      const subjectId = role === 'client' ? await seed(true) : randomUUID();
      if (role === 'lawyer') await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
        VALUES ('lawyer',${subjectId},now()-interval '721 hours',now()-interval '1 hour')`;
      const request = randomUUID(), otherRequest = randomUUID();
      await sql`INSERT INTO bahrain_emergency_requests VALUES (${request},${role==='client'?subjectId:randomUUID()}),(${otherRequest},${randomUUID()})`;
      const ownActor = role === 'client' ? `client:${request}` : subjectId;
      const peerRole = role === 'client' ? 'lawyer' : 'client';
      const peerActor = role === 'client' ? randomUUID() : `client:${request}`;
      const ownMessage=randomUUID(), peerMessage=randomUUID(), otherMessage=randomUUID();
      for (const [id,req,senderRole,actor] of [[ownMessage,request,role,ownActor],[peerMessage,request,peerRole,peerActor],[otherMessage,otherRequest,peerRole,'unrelated']]) {
        await sql`INSERT INTO bahrain_communication_messages(id,request_id,sender_role,sender_id,client_message_id,body)
          VALUES (${id},${req},${senderRole},${actor},${randomUUID()},'private message')`;
        await sql`INSERT INTO bahrain_communication_attachments(id,request_id,sender_role,sender_id,name,size,content,message_id)
          VALUES (${randomUUID()},${req},${senderRole},${actor},'private.txt',3,${Buffer.from('abc')},${id})`;
      }
      await sql.begin(tx=>purgeOwnedChatContent(tx,{role,id:subjectId}));
      const messages = await sql`SELECT id FROM bahrain_communication_messages`;
      expect(messages.map(r=>r.id).sort()).toEqual([peerMessage,otherMessage].sort());
      expect(await sql`SELECT content FROM bahrain_communication_attachments`).toHaveLength(2);
    });
  }
  it('refuses chat cleanup without an elapsed deletion deadline',async()=>{
    const id=await seed(false);
    await expect(sql.begin(tx=>purgeOwnedChatContent(tx,{role:'client',id}))).rejects.toThrow('purge_not_due');
  });
});
