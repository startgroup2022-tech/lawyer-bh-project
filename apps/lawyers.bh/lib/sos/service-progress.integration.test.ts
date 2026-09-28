import {readFileSync} from 'node:fs';
import postgres from 'postgres';
import {it,expect} from 'vitest';
const url=process.env.SERVICE_TEST_DATABASE_URL;
it.skipIf(!url)('database rejects concurrent active assignments and releases on completion',async()=>{
  const u=new URL(url!);
  if(u.hostname!=='127.0.0.1'||u.port!=='57583'||u.pathname!=='/legalsos_service_test')throw new Error('isolated database required');
  const sql=postgres(url!,{max:2});
  try {
    await sql`CREATE TYPE service_status AS ENUM ('pending','mobilizing','arrived','completed','cancelled','disputed')`;
    await sql`CREATE TABLE bahrain_emergency_requests(id text primary key,assigned_lawyer_id text,service_status service_status)`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES('legacy-a','legacy','mobilizing'),('legacy-b','legacy','arrived')`;
    await sql.begin(async tx=>{for(const statement of readFileSync(new URL('../../drizzle/0089_service_progress.sql',import.meta.url),'utf8').split('--> statement-breakpoint'))await tx.unsafe(statement);});
    expect(await sql`SELECT count(*)::int n FROM bahrain_emergency_requests WHERE assigned_lawyer_id='legacy'`).toEqual([{n:2}]);
    await expect(sql`INSERT INTO bahrain_emergency_requests VALUES('legacy-c','legacy','mobilizing')`).rejects.toMatchObject({code:'23505',constraint_name:'bahrain_emergency_one_active_lawyer'});
    await sql`UPDATE bahrain_emergency_requests SET service_status='completed' WHERE id='legacy-a'`;
    await expect(sql`INSERT INTO bahrain_emergency_requests VALUES('legacy-c','legacy','mobilizing')`).rejects.toMatchObject({code:'23505'});
    await sql`UPDATE bahrain_emergency_requests SET service_status='completed' WHERE id='legacy-b'`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES('legacy-c','legacy','mobilizing')`;
    await sql`UPDATE bahrain_emergency_requests SET service_status='completed' WHERE id='legacy-c'`;
    const results=await Promise.allSettled([
      sql`INSERT INTO bahrain_emergency_requests VALUES('a','lawyer','mobilizing')`,
      sql`INSERT INTO bahrain_emergency_requests VALUES('b','lawyer','mobilizing')`,
    ]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;
    expect(rejected.reason.code).toBe('23505');
    await sql`UPDATE bahrain_emergency_requests SET service_status='in_progress' WHERE assigned_lawyer_id='lawyer'`;
    await expect(sql`INSERT INTO bahrain_emergency_requests VALUES('c','lawyer','mobilizing')`).rejects.toMatchObject({code:'23505'});
    await sql`UPDATE bahrain_emergency_requests SET service_status='completed'`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES('c','lawyer','mobilizing')`;
    const rows=await sql`SELECT id FROM bahrain_emergency_requests WHERE service_status='mobilizing'`;
    expect(rows).toEqual([expect.objectContaining({id:'c'})]);
    await expect(sql`UPDATE bahrain_emergency_requests SET service_status='mobilizing' WHERE assigned_lawyer_id='lawyer' AND id!='c'`).rejects.toMatchObject({code:'23505'});
    await expect(sql.begin(async tx=>{await tx`INSERT INTO bahrain_emergency_requests VALUES('rollback','other','mobilizing')`;throw Error('rollback');})).rejects.toThrow('rollback');
    await sql`INSERT INTO bahrain_emergency_requests VALUES('after-rollback','other','mobilizing')`;
  } finally {
    await sql`DROP TABLE IF EXISTS bahrain_emergency_requests`;
    await sql`DROP TABLE IF EXISTS bahrain_emergency_active_counts`;
    await sql`DROP FUNCTION IF EXISTS guard_bahrain_emergency_assignment()`;
    await sql`DROP TYPE IF EXISTS service_status`;
    await sql.end();
  }
});
