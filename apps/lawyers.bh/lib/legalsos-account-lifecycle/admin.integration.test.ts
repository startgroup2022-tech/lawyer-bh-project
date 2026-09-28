import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url && url !== 'postgres://127.0.0.1:57583/legalsos_lifecycle_test') throw new Error('Isolated database required');
describe.skipIf(!url)('deletion settlement administration', () => {
  const namespace = `deletion_admin_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', { connection: { search_path: namespace } });
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql', 'utf8'));
    await sql`CREATE TABLE bahrain_emergency_requests (id uuid PRIMARY KEY,case_ref text,service_status text,payment_status text,refund_status text,base_fee_bhd numeric(10,3),tap_charge_id text,contact_phone text)`;
    await sql.unsafe(await readFile('drizzle/0093_legalsos_deletion_settlements.sql', 'utf8'));
  });
  afterAll(async () => { try { await sql.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`); } finally { await sql.end(); } });
  async function fixture(service='completed', payment='success', refund='none', days=0) {
    const id=randomUUID(), requestId=randomUUID();
    await sql`INSERT INTO legalsos_account_lifecycle(id,subject_role,subject_id,requested_at,purge_after)
      VALUES (${id},'client',${randomUUID()},now()-${days}*interval '24 hours',now()+(30-${days})*interval '24 hours')`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES (${requestId},'SOS-TEST',${service},${payment},${refund},12.500,'synthetic-charge','private-phone')`;
    await sql`INSERT INTO legalsos_deletion_settlements(lifecycle_id,request_id) VALUES (${id},${requestId})`;
    return {id,requestId};
  }
  const admin = async () => (await import('./admin')).createDeletionAdminStore(sql);
  it('lists deadline-prioritized work with payment references but no contact data', async () => {
    const recent=await fixture(), urgent=await fixture('in_progress','success','none',31);
    const rows=await (await admin()).list(50,0);
    expect(rows[0]).toMatchObject({id:urgent.id,subjectRole:'client',overdue:true,pendingSettlements:1});
    expect(rows.find(row=>row.id===recent.id)?.requests[0]).toMatchObject({caseRef:'SOS-TEST',amountBhd:'12.500',chargeId:'synthetic-charge'});
    expect(JSON.stringify(rows)).not.toContain('private-phone');
    expect(await (await admin()).list(1,0)).toHaveLength(1);
  });
  it.each([
    ['in_progress','success','none'], ['disputed','success','none'],
    ['completed','pending','none'], ['completed','success','pending'], ['completed','success','failed'],
  ])('cannot settle unresolved service/payment/refund %s %s %s',async(service,payment,refund)=>{
    const f=await fixture(service,payment,refund);
    await expect((await admin()).settle(f.id,f.requestId,'admin-1')).rejects.toMatchObject({code:'settlement_unresolved'});
    expect((await sql`SELECT state FROM legalsos_deletion_settlements WHERE lifecycle_id=${f.id}`)[0].state).toBe('pending');
  });
  it('records one administrator without altering payment or the deletion deadline', async () => {
    const f=await fixture(), store=await admin();
    const before=(await sql`SELECT * FROM bahrain_emergency_requests WHERE id=${f.requestId}`)[0];
    const deadline=(await sql`SELECT purge_after FROM legalsos_account_lifecycle WHERE id=${f.id}`)[0].purge_after;
    const first=await store.settle(f.id,f.requestId,'admin-1');
    expect(first).toMatchObject({state:'settled',settledBy:'admin-1'});
    expect(await store.settle(f.id,f.requestId,'admin-2')).toEqual(first);
    expect((await sql`SELECT * FROM bahrain_emergency_requests WHERE id=${f.requestId}`)[0]).toEqual(before);
    expect((await sql`SELECT purge_after FROM legalsos_account_lifecycle WHERE id=${f.id}`)[0].purge_after).toEqual(deadline);
  });
  it('rejects mismatched task identity and invalid pagination',async()=>{
    const a=await fixture(),b=await fixture(),store=await admin();
    await expect(store.settle(a.id,b.requestId,'admin-1')).rejects.toMatchObject({code:'settlement_not_found'});
    await expect(store.list(1000,0)).rejects.toMatchObject({code:'invalid_input'});
    await expect(store.list(20,-1)).rejects.toMatchObject({code:'invalid_input'});
  });
});
