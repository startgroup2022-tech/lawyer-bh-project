import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeAppIdentity } from './purge-identity';
import { createLifecycleStore } from './store';

const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url && url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test') throw new Error('isolated_database_required');
describe.skipIf(!url)('final app identity cleanup',()=>{
  const schema=`identity_purge_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema},onnotice:()=>{}});
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    for(const file of ['0047_mobile_client_accounts','0091_legalsos_account_lifecycle','0092_legalsos_deletion_proofs'])
      await sql.unsafe(await readFile(`drizzle/${file}.sql`,'utf8'));
    await sql`ALTER TABLE mobile_client_challenges ADD COLUMN client_id uuid REFERENCES mobile_client_accounts(id) ON DELETE CASCADE`;
    await sql`CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY,email text,full_name text)`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid REFERENCES mobile_client_accounts(id) ON DELETE SET NULL,
      client_access_revoked_at timestamptz,client_data_purged_at timestamptz,mobile_request_access_digest text)`;
    await sql.unsafe((await readFile('drizzle/0094_legalsos_request_revocation.sql','utf8')).replace('ALTER TABLE bahrain_emergency_requests ADD COLUMN client_access_revoked_at timestamptz;',''));
    await sql`CREATE TABLE bahrain_booking_requests(id uuid PRIMARY KEY,client_account_id uuid REFERENCES mobile_client_accounts(id) ON DELETE SET NULL,description text)`;
  });
  beforeEach(async()=>{
    await sql`DELETE FROM bahrain_booking_requests`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM mobile_client_challenges`;
    await sql`DELETE FROM mobile_client_accounts`;
    await sql`DELETE FROM bahrain_lawyers`;
    await sql`DELETE FROM legalsos_deletion_proofs`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  async function seed(role:'client'|'lawyer'='client',due=true,redacted=true){
    const id=randomUUID(),peer=randomUUID(),request=randomUUID();
    await sql`INSERT INTO mobile_client_accounts(id,email,full_name,phone) VALUES(${id},'own@example.test','Owner','+97330000001'),(${peer},'peer@example.test','Peer','+97330000002')`;
    await sql`INSERT INTO bahrain_lawyers VALUES(${id},'website@example.test','Shared website identity')`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES(${request},${id},now(),${redacted?new Date():null},NULL)`;
    await sql`INSERT INTO bahrain_booking_requests VALUES(${randomUUID()},${id},'Independent website booking')`;
    await sql`INSERT INTO mobile_client_sessions(token_digest,client_id,expires_at) VALUES(${'a'.repeat(64)},${id},now()+interval '1 day')`;
    await sql`INSERT INTO mobile_client_challenges(id,email,code_digest,expires_at) VALUES(${randomUUID()},'own@example.test',${'b'.repeat(64)},now()+interval '1 day'),(${randomUUID()},'peer@example.test',${'c'.repeat(64)},now()+interval '1 day')`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after) VALUES(${role},${id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,now()+${due?'-1 hour':'1 hour'}::interval)`;
    await sql`INSERT INTO legalsos_deletion_proofs(token_digest,subject_role,subject_id) VALUES(${'d'.repeat(64)},${role},${id})`;
    return{id,peer,request};
  }
  it('removes client identity, credentials and proof without deleting peer or independent website records',async()=>{
    const f=await seed();
    await sql.begin(tx=>purgeAppIdentity(tx,{role:'client',id:f.id}));
    expect(await sql`SELECT id FROM mobile_client_accounts`).toEqual([{id:f.peer}]);
    expect(await sql`SELECT client_id FROM mobile_client_sessions`).toHaveLength(0);
    expect(await sql`SELECT email FROM mobile_client_challenges`).toEqual([{email:'peer@example.test'}]);
    expect(await sql`SELECT token_digest FROM legalsos_deletion_proofs`).toHaveLength(0);
    expect(await sql`SELECT full_name FROM bahrain_lawyers`).toEqual([{full_name:'Shared website identity'}]);
    expect(await sql`SELECT description,client_account_id FROM bahrain_booking_requests`).toEqual([{description:'Independent website booking',client_account_id:null}]);
    expect(await createLifecycleStore(sql).isAccountClosed({role:'client',id:f.id})).toBe(true);
    await sql`UPDATE bahrain_emergency_requests SET mobile_request_access_digest='late-token' WHERE id=${f.request}`;
    expect(await sql`SELECT client_account_id,mobile_request_access_digest FROM bahrain_emergency_requests`).toEqual([{client_account_id:null,mobile_request_access_digest:null}]);
  });
  it('does not delete shared lawyer or same-ID client identity',async()=>{
    const f=await seed('lawyer');
    await sql.begin(tx=>purgeAppIdentity(tx,{role:'lawyer',id:f.id}));
    expect(await sql`SELECT id FROM mobile_client_accounts`).toHaveLength(2);
    expect(await sql`SELECT id FROM bahrain_lawyers`).toEqual([{id:f.id}]);
    expect(await sql`SELECT token_digest FROM legalsos_deletion_proofs`).toHaveLength(0);
  });
  it('refuses ownership removal before request personal-data cleanup',async()=>{
    const f=await seed('client',true,false);
    await expect(sql.begin(tx=>purgeAppIdentity(tx,{role:'client',id:f.id}))).rejects.toThrow('request_cleanup_incomplete');
    expect(await sql`SELECT id FROM mobile_client_accounts`).toHaveLength(2);
  });
  it('refuses erasure before the deadline',async()=>{
    const f=await seed('client',false);
    await expect(sql.begin(tx=>purgeAppIdentity(tx,{role:'client',id:f.id}))).rejects.toThrow('purge_not_due');
    expect(await sql`SELECT id FROM mobile_client_accounts`).toHaveLength(2);
  });
  it('rolls back identity removal if the enclosing purge fails',async()=>{
    const f=await seed();
    await expect(sql.begin(async tx=>{await purgeAppIdentity(tx,{role:'client',id:f.id});throw new Error('later_failure');})).rejects.toThrow('later_failure');
    expect(await sql`SELECT id FROM mobile_client_accounts`).toHaveLength(2);
    expect(await sql`SELECT client_id FROM mobile_client_sessions`).toHaveLength(1);
  });
});
