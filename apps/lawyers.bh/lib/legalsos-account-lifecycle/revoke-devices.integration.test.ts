import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import {tokenDigest} from '../notification-preferences/validation';
import {revokeOwnedDevices} from './revoke-devices';
const url=process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if(url&&url!=='postgres://127.0.0.1:57583/legalsos_lifecycle_test')throw new Error('isolated_database_required');
describe.skipIf(!url)('owned device revocation',()=>{
  const schema=`devices_${randomUUID().replaceAll('-','')}`;
  const sql=postgres(url??'postgres://127.0.0.1:57583/legalsos_lifecycle_test',{connection:{search_path:schema},onnotice:()=>{}});
  beforeAll(async()=>{
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await sql`CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY)`;
    await sql`CREATE TABLE bahrain_emergency_requests(id uuid PRIMARY KEY,client_account_id uuid)`;
    await sql.unsafe((await readFile('drizzle/0040_mobile_push_installations.sql','utf8')).replaceAll('"public".',`"${schema}".`));
    await sql`CREATE TABLE bahrain_communication_call_push_registrations(request_id uuid,actor_role text,actor_id text,token text)`;
    await sql.unsafe(await readFile('drizzle/0050_mobile_notification_preferences.sql','utf8'));
  });
  beforeEach(async()=>{
    await sql`DELETE FROM bahrain_mobile_push_request_subscriptions`;
    await sql`DELETE FROM bahrain_mobile_push_installations`;
    await sql`DELETE FROM bahrain_communication_call_push_registrations`;
    await sql`DELETE FROM bahrain_emergency_requests`;
    await sql`DELETE FROM bahrain_lawyers`;
    await sql`DELETE FROM mobile_notification_device_preferences`;
  });
  afterAll(async()=>{try{await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);}finally{await sql.end();}});
  async function seed(){
    const id=randomUUID(),request=randomUUID(),other=randomUUID(),own=randomUUID(),shared=randomUUID(),lawyer=randomUUID();
    await sql`INSERT INTO bahrain_lawyers VALUES(${id})`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES(${request},${id}),(${other},${randomUUID()})`;
    await sql`INSERT INTO bahrain_mobile_push_installations(id,fcm_token,lawyer_id)
      VALUES(${own},'own',NULL),(${shared},'shared',NULL),(${lawyer},'lawyer',${id})`;
    for(const [installation,req] of [[own,request],[shared,request],[shared,other],[lawyer,other]])
      await sql`INSERT INTO bahrain_mobile_push_request_subscriptions(installation_id,request_id) VALUES(${installation},${req})`;
    await sql`INSERT INTO bahrain_communication_call_push_registrations VALUES
      (${request},'client',${'client:'+request},'own-call'),(${request},'lawyer',${id},'lawyer-call')`;
    await sql`INSERT INTO mobile_notification_device_preferences(device_key) VALUES('device')`;
    for(const token of ['own','shared','lawyer','own-call','lawyer-call'])
      await sql`INSERT INTO mobile_notification_token_bindings(token_digest,device_key) VALUES(${tokenDigest(token)},'device')`;
    return{id,request,other,shared,lawyer};
  }
  it('removes exclusive client registrations while preserving a shared installation and lawyer capabilities',async()=>{
    const f=await seed();
    await sql.begin(tx=>revokeOwnedDevices(tx,{role:'client',id:f.id}));
    expect((await sql`SELECT fcm_token FROM bahrain_mobile_push_installations ORDER BY fcm_token`).map(r=>r.fcm_token)).toEqual(['lawyer','shared']);
    expect((await sql`SELECT token FROM bahrain_communication_call_push_registrations`).map(r=>r.token)).toEqual(['lawyer-call']);
    expect((await sql`SELECT token_digest FROM mobile_notification_token_bindings`).map(r=>r.token_digest).sort())
      .toEqual(['shared','lawyer','lawyer-call'].map(tokenDigest).sort());
    expect(await sql`SELECT device_key FROM mobile_notification_device_preferences`).toEqual([{device_key:'device'}]);
  });
  it('removes lawyer capabilities without removing client device subscriptions',async()=>{
    const f=await seed();
    await sql.begin(tx=>revokeOwnedDevices(tx,{role:'lawyer',id:f.id}));
    expect((await sql`SELECT fcm_token FROM bahrain_mobile_push_installations ORDER BY fcm_token`).map(r=>r.fcm_token)).toEqual(['own','shared']);
    expect((await sql`SELECT token FROM bahrain_communication_call_push_registrations`).map(r=>r.token)).toEqual(['own-call']);
    expect((await sql`SELECT token_digest FROM mobile_notification_token_bindings`).map(r=>r.token_digest).sort())
      .toEqual(['own','shared','own-call'].map(tokenDigest).sort());
    expect(await sql`SELECT id FROM bahrain_lawyers`).toEqual([{id:f.id}]);
  });
  it('is idempotent after owned subscriptions disappear',async()=>{
    const f=await seed();
    await sql.begin(tx=>revokeOwnedDevices(tx,{role:'client',id:f.id}));
    await sql.begin(tx=>revokeOwnedDevices(tx,{role:'client',id:f.id}));
    expect(await sql`SELECT id FROM bahrain_mobile_push_installations`).toHaveLength(2);
  });
});
