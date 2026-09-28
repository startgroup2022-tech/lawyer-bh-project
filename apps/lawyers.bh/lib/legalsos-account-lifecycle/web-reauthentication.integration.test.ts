import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { hashPassword } from '../client-auth/password';
import { createDeletionProofStore } from './proofs';
import { createWebDeletionReauthentication,resolveWebDeletionSubject } from './web-reauthentication';

const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('Only isolated lifecycle test database is allowed');
describe.skipIf(!url)('web deletion proof with real password verification',()=>{
  const schema=`web_deletion_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema}});
  const password=' exact synthetic password ';
  let clientHash='',lawyerHash='';
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    for(const file of ['0047_mobile_client_accounts','0048_mobile_client_passwords','0091_legalsos_account_lifecycle','0092_legalsos_deletion_proofs'])
      await sql.unsafe(await readFile(`drizzle/${file}.sql`,'utf8'));
    await sql`CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY,password_hash text,registration_no text,country_code text,status text)`;
    clientHash=await hashPassword(password);lawyerHash=await bcrypt.hash(password,4);
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  async function seed(role:'client'|'lawyer'){
    const id=randomUUID(),identifier=role==='client'?`${id}@example.invalid`:id;
    if(role==='client')await sql`INSERT INTO mobile_client_accounts(id,email,full_name,phone,password_hash)
      VALUES(${id},${identifier},'Synthetic','+97300000000',${clientHash})`;
    else await sql`INSERT INTO bahrain_lawyers VALUES(${id},${lawyerHash},${identifier},'BH','suspended')`;
    return {id,identifier};
  }
  it.each(['client','lawyer'] as const)('verifies the %s password before issuing a deletion-only proof',async role=>{
    const f=await seed(role), verify=createWebDeletionReauthentication(sql);
    await expect(verify(role,f.identifier,password.trim(),randomUUID())).rejects.toMatchObject({code:'invalid_credentials'});
    const result=await verify(role,f.identifier,password,randomUUID());
    expect(await resolveWebDeletionSubject(sql,result.proof)).toEqual({role,id:f.id});
    expect(await sql`SELECT token_digest FROM mobile_client_sessions WHERE client_id=${f.id}`).toHaveLength(0);
    expect(await createDeletionProofStore(sql).consume({role,id:f.id},result.proof)).toBe(true);
    expect(await resolveWebDeletionSubject(sql,result.proof)).toBeNull();
  });
  it('rate limits unknown identifiers as well as existing ones without issuing any proof',async()=>{
    const verify=createWebDeletionReauthentication(sql),identifier=`${randomUUID()}@example.invalid`;
    for(let i=0;i<5;i++)await expect(verify('client',identifier,'wrong',randomUUID())).rejects.toMatchObject({code:'invalid_credentials'});
    await expect(verify('client',identifier,'wrong',randomUUID())).rejects.toMatchObject({code:'rate_limited'});
  });
  it('does not resolve malformed, invented or expired proof credentials',async()=>{
    expect(await resolveWebDeletionSubject(sql,'bad')).toBeNull();
    expect(await resolveWebDeletionSubject(sql,'a'.repeat(43))).toBeNull();
    const f=await seed('client');
    const result=await createWebDeletionReauthentication(sql)('client',f.identifier,password,randomUUID());
    await sql`UPDATE legalsos_deletion_proofs SET issued_at=issued_at-interval '6 minutes',
      expires_at=expires_at-interval '6 minutes' WHERE subject_id=${f.id}`;
    expect(await resolveWebDeletionSubject(sql,result.proof)).toBeNull();
  });
});
