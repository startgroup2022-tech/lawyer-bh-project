import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeOwnedRequestData } from './purge-request-data';

const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url){
  const parsed=new URL(url);
  if(parsed.hostname!=='127.0.0.1'||parsed.port!=='57583'||parsed.pathname!=='/legalsos_lifecycle_test'||parsed.search)
    throw new Error('Use only the isolated local lifecycle test database');
}
describe.skipIf(!url)('request personal data erasure in isolated PostgreSQL',()=>{
  const schema=`request_purge_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema,timezone:'UTC'}});
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));
    await sql`CREATE TABLE bahrain_consent_log(id uuid PRIMARY KEY,full_name text NOT NULL,id_number text NOT NULL,
      signature_data_url text,signed_pdf_base64 text,ip_address text,user_agent text)`;
    await sql`CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY,consent_id uuid REFERENCES bahrain_consent_log(id),
      full_name_ar text NOT NULL,password_hash text NOT NULL)`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid,
      consent_id uuid REFERENCES bahrain_consent_log(id),assigned_lawyer_id uuid REFERENCES bahrain_lawyers(id),
      description text,location json,contact_name text NOT NULL,contact_phone text NOT NULL,contact_id_number text,
      rating_comment text,internal_notes json,cancellation_reason text,tap_payload jsonb,last_advocate_location json,
      dispatch_actor_log json,service_status text NOT NULL,base_fee_bhd numeric(10,3) NOT NULL,
      payment_status text NOT NULL,mobile_request_access_digest text)`;
    await sql.unsafe(await readFile('drizzle/0094_legalsos_request_revocation.sql','utf8'));
    await sql`CREATE TABLE bahrain_payment_allocations(id uuid PRIMARY KEY,
      emergency_request_id uuid REFERENCES bahrain_emergency_requests(id),
      tap_charge_id text NOT NULL UNIQUE,customer_name_snapshot text,
      provider_name_snapshot text,provider_iban_snapshot text,gross_amount numeric(12,3) NOT NULL,
      split_error text,reconciliation_error text)`;
    await sql.unsafe(await readFile('drizzle/0096_legalsos_request_erasure_guard.sql','utf8'));
  });
  beforeEach(async()=>{
    await sql`DELETE FROM bahrain_payment_allocations`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM bahrain_lawyers`;
    await sql`DELETE FROM bahrain_consent_log`;
    await sql`DELETE FROM legalsos_account_lifecycle`;
  });
  afterAll(async()=>{
    try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}
  });
  async function seed(role:'client'|'lawyer',due=true){
    const id=randomUUID(),peer=randomUUID(),own=randomUUID(),other=randomUUID(),consent=randomUUID();
    await sql`INSERT INTO bahrain_consent_log VALUES(${consent},'Private Name','Private ID','signature','pdf','ip','agent')`;
    await sql`INSERT INTO bahrain_lawyers VALUES(${id},NULL,'Website name','website-password-hash'),(${peer},NULL,'Peer','peer-password-hash')`;
    for(const [request,client,lawyer] of [[own,role==='client'?id:peer,id],[other,peer,peer]]){
      await sql`INSERT INTO bahrain_emergency_requests(id,client_account_id,assigned_lawyer_id,consent_id,
        description,location,contact_name,contact_phone,contact_id_number,rating_comment,internal_notes,
        cancellation_reason,tap_payload,last_advocate_location,dispatch_actor_log,service_status,base_fee_bhd,payment_status)
        VALUES(${request},${client},${lawyer},${request===own?consent:null},'private description','{"lat":26,"lng":50}',
          'Private Name','+97300000000','private id','private review','[{"actor":"admin","body":"private note"}]',
          'private reason','{"customer":{"email":"synthetic@example.invalid"}}','{"lat":26,"lng":50}',
          '[]','completed',10.500,'success')`;
    }
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES(${role},${id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,now()+${due?'-1 hour':'1 hour'}::interval)`;
    return {id,peer,own,other,consent};
  }
  it('removes client contact, content, coordinates and private consent, leaving another client untouched',async()=>{
    const f=await seed('client');
    const [peerBefore]=await sql`SELECT * FROM bahrain_emergency_requests WHERE id=${f.other}`;
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}));
    const [r]=await sql`SELECT * FROM bahrain_emergency_requests WHERE id=${f.own}`;
    expect(r).toMatchObject({contact_name:'',contact_phone:'',contact_id_number:null,description:null,location:null,
      rating_comment:null,internal_notes:[],cancellation_reason:null,tap_payload:null,consent_id:null,
      service_status:'completed',payment_status:'success',base_fee_bhd:'10.500'});
    expect(await sql`SELECT id FROM bahrain_consent_log`).toHaveLength(0);
    expect((await sql`SELECT * FROM bahrain_emergency_requests WHERE id=${f.other}`)[0]).toEqual(peerBefore);
  });
  it('detaches but does not delete a consent also used by the independent lawyer website profile',async()=>{
    const f=await seed('client');
    await sql`UPDATE bahrain_lawyers SET consent_id=${f.consent} WHERE id=${f.peer}`;
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}));
    expect(await sql`SELECT id FROM bahrain_consent_log`).toEqual([{id:f.consent}]);
    expect((await sql`SELECT consent_id FROM bahrain_emergency_requests WHERE id=${f.own}`)[0].consent_id).toBeNull();
  });
  it('removes lawyer-owned live location without erasing the client request or website account',async()=>{
    const f=await seed('lawyer');
    const [websiteBefore]=await sql`SELECT * FROM bahrain_lawyers WHERE id=${f.id}`;
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'lawyer',id:f.id}));
    const [r]=await sql`SELECT * FROM bahrain_emergency_requests WHERE id=${f.own}`;
    expect(r.last_advocate_location).toBeNull();
    expect(r.contact_name).toBe('Private Name');
    expect(r.description).toBe('private description');
    expect((await sql`SELECT * FROM bahrain_lawyers WHERE id=${f.id}`)[0]).toEqual(websiteBefore);
    expect((await sql`SELECT last_advocate_location FROM bahrain_emergency_requests WHERE id=${f.other}`)[0].last_advocate_location).not.toBeNull();
  });
  it('refuses erasure before the retention deadline',async()=>{
    const f=await seed('client',false);
    await expect(sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}))).rejects.toThrow('purge_not_due');
  });
  it('clears client dispatch notes and prevents a delayed write from restoring them',async()=>{
    const f=await seed('client');
    await sql`UPDATE bahrain_emergency_requests SET dispatch_actor_log='[{"actor":"Private Client","action":"private detail"}]' WHERE id=${f.own}`;
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}));
    await sql`UPDATE bahrain_emergency_requests SET dispatch_actor_log='[{"actor":"Private Client","action":"restored detail"}]' WHERE id=${f.own}`;
    expect((await sql`SELECT dispatch_actor_log FROM bahrain_emergency_requests WHERE id=${f.own}`)[0].dispatch_actor_log).toEqual([]);
  });
  it('does not restore a purged lawyer live trace through a delayed request update',async()=>{
    const f=await seed('lawyer');
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'lawyer',id:f.id}));
    await sql`UPDATE legalsos_account_lifecycle SET state='purged' WHERE subject_role='lawyer' AND subject_id=${f.id}`;
    await sql`UPDATE bahrain_emergency_requests SET last_advocate_location='{"lat":26,"lng":50}' WHERE id=${f.own}`;
    expect((await sql`SELECT last_advocate_location FROM bahrain_emergency_requests WHERE id=${f.own}`)[0].last_advocate_location).toBeNull();
  });
  it('removes the client personal copies in the payment ledger without changing peer receivables',async()=>{
    const f=await seed('client');
    for(const request of [f.own,f.other])await sql`INSERT INTO bahrain_payment_allocations VALUES(
      ${randomUUID()},${request},${`synthetic-${request}`},'Private Client','Independent Provider',
      'provider-bank-reference',10.500,'private payment error','private reconciliation error')`;
    const [peer]=await sql`SELECT * FROM bahrain_payment_allocations WHERE emergency_request_id=${f.other}`;
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}));
    expect((await sql`SELECT customer_name_snapshot,split_error,reconciliation_error,provider_name_snapshot,
      provider_iban_snapshot,gross_amount FROM bahrain_payment_allocations WHERE emergency_request_id=${f.own}`)[0])
      .toEqual({customer_name_snapshot:null,split_error:null,reconciliation_error:null,
        provider_name_snapshot:'Independent Provider',provider_iban_snapshot:'provider-bank-reference',gross_amount:'10.500'});
    expect((await sql`SELECT * FROM bahrain_payment_allocations WHERE emergency_request_id=${f.other}`)[0]).toEqual(peer);
  });
  it('prevents delayed payment or request writes from restoring erased contact data after detaching the account',async()=>{
    const f=await seed('client');
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}));
    await sql`UPDATE bahrain_emergency_requests SET client_account_id=NULL,contact_name='late name',
      contact_phone='+97300000000',description='late private text',tap_payload='{"customer":{"name":"late name"}}'
      WHERE id=${f.own}`;
    expect((await sql`SELECT contact_name,contact_phone,description,tap_payload FROM bahrain_emergency_requests WHERE id=${f.own}`)[0])
      .toEqual({contact_name:'',contact_phone:'',description:null,tap_payload:null});
  });
  it('prevents a delayed payment callback from recreating the erased client ledger copy',async()=>{
    const f=await seed('client');
    await sql.begin(tx=>purgeOwnedRequestData(tx,{role:'client',id:f.id}));
    await sql`UPDATE bahrain_emergency_requests SET client_account_id=NULL WHERE id=${f.own}`;
    await sql`INSERT INTO bahrain_payment_allocations VALUES(${randomUUID()},${f.own},'synthetic-late-charge',
      'Late Private Name','Peer','peer-bank',10.500,'late private error','late private error')`;
    await sql`UPDATE bahrain_payment_allocations SET customer_name_snapshot='restored name',split_error='restored error'
      WHERE emergency_request_id=${f.own}`;
    expect((await sql`SELECT customer_name_snapshot,split_error,reconciliation_error,gross_amount
      FROM bahrain_payment_allocations WHERE emergency_request_id=${f.own}`)[0])
      .toEqual({customer_name_snapshot:null,split_error:null,reconciliation_error:null,gross_amount:'10.500'});
    await sql`UPDATE bahrain_payment_allocations SET emergency_request_id=NULL WHERE emergency_request_id=${f.own}`;
    await sql`UPDATE bahrain_payment_allocations SET customer_name_snapshot='restored after detach'
      WHERE tap_charge_id='synthetic-late-charge'`;
    expect((await sql`SELECT customer_name_snapshot FROM bahrain_payment_allocations
      WHERE tap_charge_id='synthetic-late-charge'`)[0].customer_name_snapshot).toBeNull();
  });
});
