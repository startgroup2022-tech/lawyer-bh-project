import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import {createMonitoredPurgeJob} from './job';
import {createPurgeWorker} from './purge';
const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('isolated_database_required');
describe.skipIf(!url)('durable purge job monitoring',()=>{
  const schema=`job_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema},onnotice:()=>{}});
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));
    await sql`CREATE TABLE synthetic_private_data(subject_id uuid PRIMARY KEY,body text)`;
    await sql.unsafe(await readFile('drizzle/0100_legalsos_purge_monitoring.sql','utf8'));
  });
  beforeEach(async()=>{await sql`DELETE FROM legalsos_deletion_alerts`;await sql`DELETE FROM legalsos_account_lifecycle`;await sql`DELETE FROM legalsos_purge_runs`;await sql`DELETE FROM synthetic_private_data`;});
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  async function seed(hours:number){
    const id=randomUUID();
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES('client',${id},now()-interval '720 hours'+${hours}*interval '1 hour',now()+${hours}*interval '1 hour')`;
    await sql`INSERT INTO synthetic_private_data VALUES(${id},'private content')`;return id;
  }
  const cleanup=async(tx:postgres.TransactionSql,s:{id:string})=>{await tx`DELETE FROM synthetic_private_data WHERE subject_id=${s.id}`;};
  it('records successful bounded runs independently of the purged account',async()=>{
    await seed(-1);
    expect(await createMonitoredPurgeJob(sql,createPurgeWorker(sql,cleanup))()).toEqual({processed:1,failed:0});
    expect((await sql`SELECT state,processed,failed,finished_at IS NOT NULL AS finished FROM legalsos_purge_runs`)[0])
      .toEqual({state:'completed',processed:1,failed:0,finished:true});
    expect(await sql`SELECT * FROM synthetic_private_data`).toHaveLength(0);
  });
  it('persists failures and deduplicated overdue escalation without copying exception payloads',async()=>{
    await seed(-1);
    const job=createMonitoredPurgeJob(sql,createPurgeWorker(sql,async()=>{throw new Error('private@example.invalid');}));
    expect(await job()).toEqual({processed:0,failed:1});expect(await job()).toEqual({processed:0,failed:1});
    expect((await sql`SELECT count(*)::int AS n FROM legalsos_purge_runs WHERE state='failed'`)[0].n).toBe(2);
    expect(await sql`SELECT kind FROM legalsos_deletion_alerts`).toEqual([{kind:'overdue'}]);
    expect(await sql`SELECT * FROM synthetic_private_data`).toHaveLength(1);
  });
  it('records one reminder per seven-day and one-day threshold without extending deadlines',async()=>{
    await seed(120);await seed(12);await seed(200);
    const before=await sql`SELECT id,purge_after FROM legalsos_account_lifecycle ORDER BY id`;
    const job=createMonitoredPurgeJob(sql,createPurgeWorker(sql,cleanup));await job();await job();
    expect((await sql`SELECT kind FROM legalsos_deletion_alerts ORDER BY kind`).map(r=>r.kind)).toEqual(['one_day','seven_days']);
    expect(await sql`SELECT id,purge_after FROM legalsos_account_lifecycle ORDER BY id`).toEqual(before);
  });
});
