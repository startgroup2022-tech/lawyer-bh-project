import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {afterAll,beforeAll,beforeEach,describe,it,expect} from 'vitest';
import {purgeAccountData} from './purge-account';
import {createPurgeWorker} from './purge';
import {createDeletionNoticeDelivery} from './notices';

const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('isolated_database_required');
describe.skipIf(!url)('account purge stage ordering with real PostgreSQL',()=>{
  const schema=`account_purge_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema},onnotice:()=>{}});
  async function migrate(name:string){await sql.unsafe((await readFile(`drizzle/${name}.sql`,'utf8')).replaceAll('public.',`${schema}.`).replaceAll('"public".',`"${schema}".`));}
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    for(const f of ['0047_mobile_client_accounts','0048_mobile_client_passwords','0051_mobile_client_account_changes','0091_legalsos_account_lifecycle','0092_legalsos_deletion_proofs'])await migrate(f);
    await sql`CREATE TABLE bahrain_consent_log(id uuid PRIMARY KEY,full_name text)`;
    await sql`CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY,consent_id uuid REFERENCES bahrain_consent_log(id),email text,password_hash text)`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,
      client_account_id uuid REFERENCES mobile_client_accounts(id) ON DELETE SET NULL,
      assigned_lawyer_id uuid REFERENCES bahrain_lawyers(id),candidate_lawyer_id uuid,
      customer_approved_at timestamptz,lawyer_response_deadline timestamptz,
      consent_id uuid REFERENCES bahrain_consent_log(id),description text,location json,
      contact_name text NOT NULL,contact_phone text NOT NULL,contact_id_number text,rating_comment text,
      internal_notes json,dispatch_actor_log json,cancellation_reason text,tap_payload jsonb,last_advocate_location json,
      service_status text,payment_status text,mobile_request_access_digest text)`;
    await sql`CREATE TABLE bahrain_payment_allocations(id uuid PRIMARY KEY,
      emergency_request_id uuid REFERENCES bahrain_emergency_requests(id) ON DELETE CASCADE,
      tap_charge_id text NOT NULL UNIQUE,customer_name_snapshot text,provider_name_snapshot text,
      gross_amount numeric(12,3),split_error text,reconciliation_error text)`;
    await sql`CREATE TABLE discount_redemptions(id uuid PRIMARY KEY,emergency_request_id uuid REFERENCES bahrain_emergency_requests(id) ON DELETE SET NULL,
      flow varchar(32) NOT NULL,user_key varchar(254) NOT NULL,tap_charge_id text)`;
    await sql`CREATE TABLE bahrain_admin_mobile_notification_sends(id uuid,state text,audience text,completed_at timestamptz,
      title_ar text,body_ar text,title_en text,body_en text)`;
    for(const f of ['0040_mobile_push_installations','0043_request_communications','0044_communication_signal_events','0049_mobile_client_notifications',
      '0050_mobile_notification_preferences','0085_communication_attachments','0090_lawyer_notification_inbox',
      '0093_legalsos_deletion_settlements','0094_legalsos_request_revocation','0095_legalsos_notification_erasure_guard',
      '0096_legalsos_request_erasure_guard','0098_legalsos_discount_erasure_guard','0099_legalsos_call_erasure_guard','0101_legalsos_notice_skipping'])await migrate(f);
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  beforeEach(async()=>{await sql`DELETE FROM legalsos_deletion_notifications`;await sql`DELETE FROM legalsos_account_lifecycle`;});
  async function seed(role:'client'|'lawyer',due=true){
    const client=randomUUID(),lawyer=randomUUID(),request=randomUUID(),own=randomUUID(),peer=randomUUID(),redemption=randomUUID();
    const subject={role,id:role==='client'?client:lawyer};
    await sql`INSERT INTO mobile_client_accounts(id,email,full_name,phone) VALUES(${client},${client+'@example.invalid'},'Private Client','+97300000000')`;
    await sql`INSERT INTO bahrain_lawyers(id,email,password_hash) VALUES(${lawyer},'website@example.invalid','preserve-website-password')`;
    await sql`INSERT INTO bahrain_emergency_requests(id,client_account_id,assigned_lawyer_id,contact_name,contact_phone,description,last_advocate_location,service_status,payment_status)
      VALUES(${request},${client},${lawyer},'Private Client','+97300000000','Private description','{"lat":26,"lng":50}','completed','success')`;
    for(const [id,senderRole,actor] of [[own,role,role==='client'?'client:'+request:lawyer],[peer,role==='client'?'lawyer':'client',role==='client'?lawyer:'client:'+request]]){
      await sql`INSERT INTO bahrain_communication_messages(id,request_id,sender_role,sender_id,client_message_id,body)
        VALUES(${id},${request},${senderRole},${actor},${randomUUID()},'Private message')`;
      await sql`INSERT INTO bahrain_communication_attachments(id,request_id,sender_role,sender_id,name,size,content,message_id)
        VALUES(${randomUUID()},${request},${senderRole},${actor},'private.txt',3,${Buffer.from('abc')},${id})`;
    }
    await sql`INSERT INTO bahrain_payment_allocations(id,emergency_request_id,tap_charge_id,customer_name_snapshot,provider_name_snapshot,gross_amount)
      VALUES(${randomUUID()},${request},${'charge:'+request},'Private Client','Independent Provider',12.500)`;
    await sql`INSERT INTO discount_redemptions(id,emergency_request_id,flow,user_key,tap_charge_id)
      VALUES(${redemption},${request},'mobile_sos',${client+'@example.invalid'},${'charge:'+request})`;
    await sql`INSERT INTO bahrain_communication_calls(id,request_id,initiator_role,initiator_id,media_kind,status)
      VALUES(${own},${request},${role},${role==='client'?'client:'+request:lawyer},'audio','ended')`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id,requested_at,purge_after)
      VALUES(${role},${subject.id},now()-interval '720 hours'+${due?'-1 hour':'1 hour'}::interval,now()+${due?'-1 hour':'1 hour'}::interval)`;
    return{subject,client,lawyer,request,own,peer,redemption};
  }
  it.each(['client','lawyer'] as const)('runs every %s stage before detaching ownership and preserves counterparty data',async role=>{
    const f=await seed(role);
    expect(await createPurgeWorker(sql,purgeAccountData)(10)).toEqual({processed:1,failed:0});
    expect(await sql`SELECT id FROM bahrain_communication_messages WHERE id=${f.own}`).toHaveLength(0);
    expect(await sql`SELECT id FROM bahrain_communication_attachments WHERE message_id=${f.own}`).toHaveLength(0);
    expect(await sql`SELECT id FROM bahrain_communication_messages WHERE id=${f.peer}`).toHaveLength(1);
    expect((await sql`SELECT initiator_id FROM bahrain_communication_calls WHERE id=${f.own}`)[0].initiator_id).toBe('deleted:'+f.own);
    expect((await sql`SELECT password_hash FROM bahrain_lawyers WHERE id=${f.lawyer}`)[0].password_hash).toBe('preserve-website-password');
    expect((await sql`SELECT gross_amount FROM bahrain_payment_allocations WHERE emergency_request_id=${f.request}`)[0].gross_amount).toBe('12.500');
    const [request]=await sql`SELECT client_account_id,contact_name,last_advocate_location FROM bahrain_emergency_requests WHERE id=${f.request}`;
    if(role==='client'){
      expect(request.client_account_id).toBeNull();expect(request.contact_name).toBe('');
      expect((await sql`SELECT user_key FROM discount_redemptions WHERE id=${f.redemption}`)[0].user_key).toBe('deleted:'+f.redemption);
      expect(await sql`SELECT id FROM mobile_client_accounts WHERE id=${f.client}`).toHaveLength(0);
    }else{expect(request.client_account_id).toBe(f.client);expect(request.contact_name).toBe('Private Client');expect(request.last_advocate_location).toBeNull();}
    expect(await createPurgeWorker(sql,purgeAccountData)(10)).toEqual({processed:0,failed:0});
  });
  it('does not touch an account before its deadline',async()=>{
    const f=await seed('client',false);
    expect(await createPurgeWorker(sql,purgeAccountData)(10)).toEqual({processed:0,failed:0});
    expect(await sql`SELECT id FROM mobile_client_accounts WHERE id=${f.client}`).toHaveLength(1);
  });
  it('rolls back all earlier stages if final identity deletion fails',async()=>{
    const f=await seed('client');
    await sql`CREATE TABLE synthetic_identity_hold(client_id uuid REFERENCES mobile_client_accounts(id))`;
    await sql`INSERT INTO synthetic_identity_hold VALUES(${f.client})`;
    expect(await createPurgeWorker(sql,purgeAccountData)(10)).toEqual({processed:0,failed:1});
    expect(await sql`SELECT id FROM bahrain_communication_messages WHERE id=${f.own}`).toHaveLength(1);
    expect((await sql`SELECT contact_name FROM bahrain_emergency_requests WHERE id=${f.request}`)[0].contact_name).toBe('Private Client');
    await sql`DROP TABLE synthetic_identity_hold`;
    expect(await createPurgeWorker(sql,purgeAccountData)(10)).toEqual({processed:1,failed:0});
  });
  it.each(['client','lawyer'] as const)('publishes one neutral follow-up to the remaining %s inbox',async recipientRole=>{
    const f=await seed(recipientRole==='client'?'lawyer':'client',false);
    const [life]=await sql`SELECT id FROM legalsos_account_lifecycle WHERE subject_id=${f.subject.id}`;
    await sql`INSERT INTO legalsos_deletion_notifications(lifecycle_id,request_id,recipient_role) VALUES(${life.id},${f.request},${recipientRole})`;
    const installation=randomUUID();
    await sql`INSERT INTO bahrain_mobile_push_installations(id,fcm_token,lawyer_id,locale) VALUES(${installation},${installation},${recipientRole==='lawyer'?f.lawyer:null},'en')`;
    await sql`INSERT INTO bahrain_mobile_push_request_subscriptions(installation_id,request_id) VALUES(${installation},${f.request})`;
    const received:unknown[]=[];
    const deliver=createDeletionNoticeDelivery(sql,async notice=>{received.push(notice);});
    expect(await deliver()).toEqual({processed:1,failed:0,skipped:0});
    expect(await deliver()).toEqual({processed:0,failed:0,skipped:0});
    expect(received).toEqual([{requestId:f.request,recipientRole,lawyerId:recipientRole==='lawyer'?f.lawyer:null,locale:'en'}]);
    const rows=recipientRole==='lawyer'
      ?await sql`SELECT kind FROM mobile_lawyer_notifications WHERE request_id=${f.request} AND kind='account_closure_followup'`
      :await sql`SELECT kind FROM mobile_client_notifications WHERE request_id=${f.request} AND kind='account_closure_followup'`;
    expect(rows).toHaveLength(1);
  });
  it('retains the outbox for retry when the push provider fails',async()=>{
    const f=await seed('client',false);
    const [life]=await sql`SELECT id FROM legalsos_account_lifecycle WHERE subject_id=${f.client}`;
    await sql`INSERT INTO legalsos_deletion_notifications(lifecycle_id,request_id,recipient_role) VALUES(${life.id},${f.request},'lawyer')`;
    expect(await createDeletionNoticeDelivery(sql,async()=>{throw new Error('provider unavailable');})()).toEqual({processed:0,failed:1,skipped:0});
    expect((await sql`SELECT state FROM legalsos_deletion_notifications`)[0].state).toBe('pending');
    expect(await createDeletionNoticeDelivery(sql,async()=>{})()).toEqual({processed:1,failed:0,skipped:0});
  });
  it('never delivers to the other account when it is also closed',async()=>{
    const f=await seed('client',false);
    const [life]=await sql`SELECT id FROM legalsos_account_lifecycle WHERE subject_id=${f.client}`;
    await sql`INSERT INTO legalsos_account_lifecycle(subject_role,subject_id) VALUES('lawyer',${f.lawyer})`;
    await sql`INSERT INTO legalsos_deletion_notifications(lifecycle_id,request_id,recipient_role) VALUES(${life.id},${f.request},'lawyer')`;
    expect(await createDeletionNoticeDelivery(sql,async()=>{throw new Error('must not deliver');})()).toEqual({processed:0,failed:0,skipped:1});
  });
});
