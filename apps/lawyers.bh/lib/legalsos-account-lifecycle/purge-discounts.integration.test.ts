import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {purgeDiscountIdentity} from './purge-discounts';
const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('isolated_database_required');
describe.skipIf(!url)('discount identity erasure',()=>{
  const schema=`discount_purge_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema},onnotice:()=>{}});
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid,client_data_purged_at timestamptz)`;
    await sql`CREATE TABLE discount_redemptions(id uuid PRIMARY KEY,emergency_request_id uuid REFERENCES bahrain_emergency_requests(id) ON DELETE SET NULL,
      flow varchar(32) NOT NULL,user_key varchar(254) NOT NULL,tap_charge_id text,final_amount_bd numeric(10,3),status text)`;
    await sql.unsafe(await readFile('drizzle/0098_legalsos_discount_erasure_guard.sql','utf8'));
  });
  beforeEach(async()=>{
    await sql`DELETE FROM discount_redemptions`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  async function seed(role:'client'|'lawyer'='client',due=true){
    const id=randomUUID(),request=randomUUID(),redemption=randomUUID(),website=randomUUID();
    await sql`INSERT INTO bahrain_emergency_requests VALUES(${request},${id},NULL)`;
    await sql`INSERT INTO discount_redemptions(id,emergency_request_id,flow,user_key,tap_charge_id,final_amount_bd,status) VALUES(${redemption},${request},'mobile_sos','private@example.test','charge-own',9.876,'redeemed'),
      (${website},NULL,'sos','private@example.test','charge-website',12.000,'redeemed')`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES(${role},${id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,now()+${due?'-1 hour':'1 hour'}::interval)`;
    return{id,request,redemption,website};
  }
  it('removes only app-owned contact keys and payment references while preserving usage counts and website records',async()=>{
    const f=await seed();
    await sql.begin(tx=>purgeDiscountIdentity(tx,{role:'client',id:f.id}));
    expect((await sql`SELECT user_key,tap_charge_id,final_amount_bd,status FROM discount_redemptions WHERE id=${f.redemption}`)[0])
      .toEqual({user_key:'deleted:'+f.redemption,tap_charge_id:null,final_amount_bd:'9.876',status:'redeemed'});
    expect((await sql`SELECT user_key,tap_charge_id FROM discount_redemptions WHERE id=${f.website}`)[0])
      .toEqual({user_key:'private@example.test',tap_charge_id:'charge-website'});
  });
  it('does not erase client discounts for a lawyer with the same UUID',async()=>{
    const f=await seed('lawyer');
    await sql.begin(tx=>purgeDiscountIdentity(tx,{role:'lawyer',id:f.id}));
    expect((await sql`SELECT user_key FROM discount_redemptions WHERE id=${f.redemption}`)[0].user_key).toBe('private@example.test');
  });
  it('rejects cleanup before the deadline',async()=>{
    const f=await seed('client',false);
    await expect(sql.begin(tx=>purgeDiscountIdentity(tx,{role:'client',id:f.id}))).rejects.toThrow('purge_not_due');
  });
  it('prevents delayed callbacks restoring contact data after ownership is detached',async()=>{
    const f=await seed();
    await sql.begin(tx=>purgeDiscountIdentity(tx,{role:'client',id:f.id}));
    await sql`UPDATE bahrain_emergency_requests SET client_data_purged_at=now(),client_account_id=NULL WHERE id=${f.request}`;
    await sql`UPDATE discount_redemptions SET user_key='restored@example.test',tap_charge_id='late-charge' WHERE id=${f.redemption}`;
    expect((await sql`SELECT user_key,tap_charge_id FROM discount_redemptions WHERE id=${f.redemption}`)[0])
      .toEqual({user_key:'deleted:'+f.redemption,tap_charge_id:null});
  });
  it('keeps erasure irreversible after both the request link and flow are changed',async()=>{
    const f=await seed();
    await sql.begin(tx=>purgeDiscountIdentity(tx,{role:'client',id:f.id}));
    await sql`UPDATE discount_redemptions SET emergency_request_id=NULL,flow='sos',customer_data_purged_at=NULL,
      user_key='restored@example.test',tap_charge_id='late-charge' WHERE id=${f.redemption}`;
    expect((await sql`SELECT user_key,tap_charge_id FROM discount_redemptions WHERE id=${f.redemption}`)[0])
      .toEqual({user_key:'deleted:'+f.redemption,tap_charge_id:null});
  });
  it('sanitizes newly inserted app redemptions for an already erased request',async()=>{
    const f=await seed(),late=randomUUID();
    await sql`UPDATE bahrain_emergency_requests SET client_data_purged_at=now(),client_account_id=NULL WHERE id=${f.request}`;
    await sql`INSERT INTO discount_redemptions(id,emergency_request_id,flow,user_key,tap_charge_id,status)
      VALUES(${late},${f.request},'mobile_sos','late@example.test','late-charge','redeemed')`;
    expect((await sql`SELECT user_key,tap_charge_id FROM discount_redemptions WHERE id=${late}`)[0])
      .toEqual({user_key:'deleted:'+late,tap_charge_id:null});
  });
});
