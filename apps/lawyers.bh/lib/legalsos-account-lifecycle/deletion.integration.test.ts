import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDeletionProofStore } from './proofs';
import type { Subject } from './types';
import {tokenDigest} from '../notification-preferences/validation';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url && url !== 'postgres://127.0.0.1:57583/legalsos_lifecycle_test') throw new Error('Only isolated lifecycle test database is allowed');
describe.skipIf(!url)('atomic app closure and settlement', () => {
  const namespace = `closure_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', { connection: { search_path: namespace } });
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    for (const file of ['0047_mobile_client_accounts','0048_mobile_client_passwords','0051_mobile_client_account_changes','0091_legalsos_account_lifecycle','0092_legalsos_deletion_proofs']) {
      await sql.unsafe(await readFile(`drizzle/${file}.sql`, 'utf8'));
    }
    // Minimal synthetic fixtures for the real closure SQL. No production database is used.
    await sql`CREATE TABLE bahrain_lawyers (id uuid PRIMARY KEY, email text, password_hash text, status text, is_active boolean)`;
    await sql`ALTER TABLE bahrain_lawyers ADD COLUMN live_location json, ADD COLUMN live_location_updated_at timestamptz,
      ADD COLUMN is_emergency_ready boolean DEFAULT false, ADD COLUMN location_sharing_enabled boolean DEFAULT false,
      ADD COLUMN base_location json`;
    await sql.unsafe(await readFile('drizzle/0102_legalsos_closed_lawyer_location.sql','utf8'));
    await sql`CREATE TABLE bahrain_emergency_requests (
      id uuid PRIMARY KEY, client_account_id uuid, assigned_lawyer_id uuid, candidate_lawyer_id uuid,
      service_status text, payment_status text, refund_status text DEFAULT 'none',
      base_fee_bhd numeric(10,3), tap_charge_id text, mobile_request_access_digest text)`;
    await sql.unsafe(await readFile('drizzle/0094_legalsos_request_revocation.sql','utf8'));
    await sql`CREATE TABLE bahrain_mobile_push_installations (id uuid PRIMARY KEY, lawyer_id uuid, fcm_token text)`;
    await sql`CREATE TABLE bahrain_mobile_push_request_subscriptions (installation_id uuid, request_id uuid)`;
    await sql`CREATE TABLE bahrain_communication_call_push_registrations (request_id uuid, actor_role text, actor_id text, token text)`;
    await sql.unsafe(await readFile('drizzle/0093_legalsos_deletion_settlements.sql', 'utf8'));
    await sql.unsafe(await readFile('drizzle/0050_mobile_notification_preferences.sql', 'utf8'));
  });
  afterAll(async () => {
    try { await sql.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`); }
    finally { await sql.end(); }
  });
  async function fixture(role: Subject['role']) {
    const clientId = randomUUID(), lawyerId = randomUUID(), requestId = randomUUID();
    await sql`INSERT INTO mobile_client_accounts(id,email,full_name,phone) VALUES (${clientId},${`${clientId}@example.com`},'Synthetic Client','+97336000000')`;
    await sql`INSERT INTO mobile_client_sessions(token_digest,client_id,expires_at) VALUES (${clientId.replaceAll('-','').repeat(2)},${clientId},now()+interval '1 day')`;
    await sql`INSERT INTO bahrain_lawyers VALUES (${lawyerId},'lawyer@example.com','unchanged-password','approved',true)`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES (${requestId},${clientId},${lawyerId},NULL,'in_progress','success','none',12.500,'synthetic-charge','retained-digest',NULL)`;
    const installationId = randomUUID();
    await sql`INSERT INTO bahrain_mobile_push_installations VALUES (${installationId},${lawyerId},'synthetic-fcm')`;
    await sql`INSERT INTO bahrain_mobile_push_request_subscriptions VALUES (${installationId},${requestId})`;
    await sql`INSERT INTO bahrain_communication_call_push_registrations VALUES
      (${requestId},'client',${`client:${requestId}`},${'client-voip:'+requestId}),(${requestId},'lawyer',${lawyerId},${'lawyer-voip:'+requestId})`;
    const subject: Subject = { role, id: role === 'client' ? clientId : lawyerId };
    const { proof } = await createDeletionProofStore(sql).issue(subject);
    return { subject, proof, clientId, lawyerId, requestId };
  }
  const service = async () => (await import('./deletion')).createAccountDeletionService(sql);
  it('stops the closing lawyer live GPS and availability while preserving the professional base address',async()=>{
    const f=await fixture('lawyer');
    await sql`UPDATE bahrain_lawyers SET live_location='{"lat":26,"lng":50}',live_location_updated_at=now(),
      is_emergency_ready=true,location_sharing_enabled=true,base_location='{"address":"Independent office"}' WHERE id=${f.lawyerId}`;
    await (await service())(f.subject,f.proof);
    expect((await sql`SELECT live_location,live_location_updated_at,is_emergency_ready,location_sharing_enabled,
      base_location FROM bahrain_lawyers WHERE id=${f.lawyerId}`)[0]).toEqual({live_location:null,
        live_location_updated_at:null,is_emergency_ready:false,location_sharing_enabled:false,
        base_location:{address:'Independent office'}});
  });
  it('rejects a delayed GPS or availability write after lawyer closure',async()=>{
    const f=await fixture('lawyer');
    await (await service())(f.subject,f.proof);
    await sql`UPDATE bahrain_lawyers SET live_location='{"lat":26,"lng":50}',live_location_updated_at=now(),
      is_emergency_ready=true,location_sharing_enabled=true WHERE id=${f.lawyerId}`;
    expect((await sql`SELECT live_location,live_location_updated_at,is_emergency_ready,location_sharing_enabled
      FROM bahrain_lawyers WHERE id=${f.lawyerId}`)[0]).toEqual({live_location:null,
        live_location_updated_at:null,is_emergency_ready:false,location_sharing_enabled:false});
  });
  it('removes token preference linkage during authenticated closure rather than losing its ownership mapping',async()=>{
    const f=await fixture('client');
    await sql`INSERT INTO mobile_notification_device_preferences(device_key) VALUES(${f.clientId})`;
    await sql`INSERT INTO mobile_notification_token_bindings(token_digest,device_key) VALUES(${tokenDigest('client-voip:'+f.requestId)},${f.clientId})`;
    await (await service())(f.subject,f.proof);
    expect(await sql`SELECT token_digest FROM mobile_notification_token_bindings WHERE device_key=${f.clientId}`).toHaveLength(0);
    expect(await sql`SELECT device_key FROM mobile_notification_device_preferences WHERE device_key=${f.clientId}`).toHaveLength(1);
  });
  it.each(['client','lawyer'] as const)('closes %s access, queues settlement and preserves payment and shared identity', async role => {
    const data = await fixture(role), close = await service();
    const receipt = await close(data.subject, data.proof);
    expect(receipt).toHaveProperty('cleanupRequestIds', role === 'client' ? [data.requestId] : []);
    const [access] = await sql`SELECT client_access_revoked_at FROM bahrain_emergency_requests WHERE id=${data.requestId}`;
    expect(access.client_access_revoked_at !== null).toBe(role === 'client');
    const { recoverDeletionReceipt } = await import('./deletion');
    expect(await recoverDeletionReceipt(sql, data.proof)).toEqual(receipt);
    expect(await recoverDeletionReceipt(sql, 'wrong-proof')).toBeNull();
    expect(Date.parse(receipt.purgeAfter)-Date.parse(receipt.requestedAt)).toBe(2592000000);
    expect(await sql`SELECT state FROM legalsos_account_lifecycle WHERE id=${receipt.id}`).toEqual([{ state: 'pending_deletion' }]);
    expect(await sql`SELECT service_status,payment_status,base_fee_bhd,tap_charge_id,refund_status FROM bahrain_emergency_requests WHERE id=${data.requestId}`)
      .toEqual([{ service_status:'in_progress',payment_status:'success',base_fee_bhd:'12.500',tap_charge_id:'synthetic-charge',refund_status:'none' }]);
    expect(await sql`SELECT password_hash,status,is_active FROM bahrain_lawyers WHERE id=${data.lawyerId}`)
      .toEqual([{password_hash:'unchanged-password',status:'approved',is_active:true}]);
    expect(await sql`SELECT request_id,state FROM legalsos_deletion_settlements WHERE lifecycle_id=${receipt.id}`)
      .toEqual([{request_id:data.requestId,state:'pending'}]);
    const remaining = await sql`SELECT actor_role FROM bahrain_communication_call_push_registrations WHERE request_id=${data.requestId}`;
    expect(remaining.map(row=>row.actor_role)).toEqual([role==='client'?'lawyer':'client']);
    if(role==='client') {
      expect(await sql`SELECT * FROM mobile_client_sessions WHERE client_id=${data.clientId}`).toHaveLength(0);
      expect(await sql`SELECT mobile_request_access_digest FROM bahrain_emergency_requests WHERE id=${data.requestId}`).toEqual([{mobile_request_access_digest:null}]);
      expect(await sql`SELECT * FROM mobile_client_accounts WHERE id=${data.clientId}`).toHaveLength(1);
    }
    await expect(close(data.subject,data.proof)).rejects.toMatchObject({code:'invalid_deletion_proof'});
    expect(await sql`SELECT * FROM legalsos_deletion_settlements WHERE lifecycle_id=${receipt.id}`).toHaveLength(1);
  });
  it('does not close a different account with a valid proof', async () => {
    const owner = await fixture('client'), other = await fixture('client'), close = await service();
    await expect(close(other.subject,owner.proof)).rejects.toMatchObject({code:'invalid_deletion_proof'});
    expect(await sql`SELECT * FROM legalsos_account_lifecycle WHERE subject_id=${other.subject.id}`).toHaveLength(0);
    expect(await sql`SELECT * FROM mobile_client_sessions WHERE client_id=${other.clientId}`).toHaveLength(1);
  });
  it('recovers a confirmed receipt after verification expires without authorizing another deletion', async () => {
    const data = await fixture('lawyer'), close = await service();
    const { recoverDeletionReceipt } = await import('./deletion');
    expect(await recoverDeletionReceipt(sql,data.proof)).toBeNull();
    const receipt = await close(data.subject,data.proof);
    await sql`UPDATE legalsos_deletion_proofs SET issued_at=now()-interval '5 minutes',expires_at=now() WHERE subject_id=${data.subject.id}`;
    expect(await recoverDeletionReceipt(sql,data.proof)).toEqual(receipt);
    await expect(close(data.subject,data.proof)).rejects.toMatchObject({code:'invalid_deletion_proof'});
    expect(await sql`SELECT * FROM legalsos_account_lifecycle WHERE subject_id=${data.subject.id}`).toHaveLength(1);
  });
  it('rolls back closure and proof consumption when settlement cannot be recorded', async () => {
    const data = await fixture('client'), close = await service();
    // A constraint failing on this one synthetic request simulates a settlement persistence failure.
    await sql.unsafe(`ALTER TABLE legalsos_deletion_settlements ADD CONSTRAINT simulated_failure CHECK (request_id <> '${data.requestId}'::uuid)`);
    try {
      await expect(close(data.subject,data.proof)).rejects.toThrow();
      expect(await sql`SELECT * FROM legalsos_account_lifecycle WHERE subject_id=${data.subject.id}`).toHaveLength(0);
      expect(await sql`SELECT * FROM mobile_client_sessions WHERE client_id=${data.clientId}`).toHaveLength(1);
      expect(await createDeletionProofStore(sql).consume(data.subject,data.proof)).toBe(true);
    } finally { await sql`ALTER TABLE legalsos_deletion_settlements DROP CONSTRAINT simulated_failure`; }
  });
});
