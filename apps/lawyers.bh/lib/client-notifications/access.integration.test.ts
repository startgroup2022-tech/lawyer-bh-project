import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('Isolated database required');
describe.skipIf(!url)('notification request lifecycle access',()=>{
  const namespace=`inbox_access_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:namespace}});
  const client=randomUUID(),request=randomUUID(),guest=randomUUID();
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid,mobile_request_access_digest text)`;
    await sql.unsafe(await readFile('drizzle/0094_legalsos_request_revocation.sql','utf8'));
    await sql`INSERT INTO bahrain_emergency_requests(id,client_account_id) VALUES (${request},${client}),(${guest},NULL)`;
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`);}finally{await sql.end();}});
  const authorize=async(ids:string[])=>(await import('./access')).authorizeInboxRequests(sql,ids);
  it('allows existing open and guest request capabilities but never missing requests',async()=>{
    expect(await authorize([request,guest,request])).toBe(true);
    expect(await authorize([randomUUID()])).toBe(false);
    expect(await authorize([])).toBe(true);
  });
  it('blocks the whole batch if a client closes, without blocking other guest requests',async()=>{
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id) VALUES ('client',${client})`;
    expect(await authorize([request,guest])).toBe(false);
    await sql`UPDATE bahrain_emergency_requests SET client_account_id=NULL,client_access_revoked_at=now() WHERE id=${request}`;
    expect(await authorize([request])).toBe(false);
    expect(await authorize([guest])).toBe(true);
  });
  it('rejects malformed or oversized batches',async()=>{
    expect(await authorize(['not-a-uuid'])).toBe(false);
    expect(await authorize(Array(101).fill(guest))).toBe(false);
  });
});
