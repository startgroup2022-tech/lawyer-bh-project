import {beforeAll,afterAll,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({closed:false}));
vi.mock('@/lib/sos/mobile-push',()=>({mobilePushSender:async()=>({sendClientPush:async()=>{},sendLawyerPush:async()=>{}})}));
vi.mock('@/lib/communications/server-access',()=>({resolveRequestCommunicationAccess:async()=>({actor:{role:'lawyer',id:'22222222-2222-4222-8222-222222222222'},peer:{role:'client',id:'client'},capabilities:{read:true,send:!state.closed}})}));
vi.mock('@/lib/db/client',async()=>{
  const {default:postgres}=await import('postgres');
  const url = process.env.ATTACHMENT_TEST_DATABASE_URL;
  if (process.env.RUN_LOCAL_ATTACHMENT_TEST === '1') {
    if (!url) throw new Error('isolated attachment database required');
    const parsed = new URL(url);
    if (parsed.hostname !== '127.0.0.1' || parsed.port !== '57583' || parsed.pathname !== '/legalsos_lifecycle_test') {
      throw new Error('isolated attachment database required');
    }
  }
  return {sqlClient:postgres(url ?? 'postgres://unused',{max:1})};
});
import {GET,PUT} from './route';
const run=process.env.RUN_LOCAL_ATTACHMENT_TEST==='1';
const context={params:Promise.resolve({requestId:'33333333-3333-4333-8333-333333333333',attachmentId:'44444444-4444-4444-8444-444444444444'})};
beforeAll(async()=>{
  if(!run)return;
  const {sqlClient:sql}=await import('@/lib/db/client');
  await sql`CREATE TEMP TABLE bahrain_emergency_requests(id uuid,service_status text,assigned_lawyer_id uuid)`;
  await sql`CREATE TEMP TABLE bahrain_communication_messages(id uuid DEFAULT gen_random_uuid(),request_id uuid,sender_role text,sender_id text,client_message_id uuid,body text)`;
  await sql`CREATE TEMP TABLE bahrain_communication_attachments(id uuid PRIMARY KEY,request_id uuid,sender_role text,sender_id text,name text,size int,content bytea DEFAULT ''::bytea,mime text,message_id uuid,created_at timestamptz DEFAULT now())`;
  await sql`CREATE TEMP TABLE bahrain_communication_blocks(blocker_role text,blocker_id text,blocked_role text,blocked_id text,revoked_at timestamptz)`;
  await sql`CREATE TEMP TABLE bahrain_communication_moderation_actions(action text,reversed_at timestamptz,expires_at timestamptz,target_role text,target_id text)`;
  await sql`INSERT INTO bahrain_emergency_requests VALUES('33333333-3333-4333-8333-333333333333','mobilizing','22222222-2222-4222-8222-222222222222')`;
});
afterAll(async()=>{if(run){const {sqlClient}=await import('@/lib/db/client');await sqlClient.end();}});
it.skipIf(!run)('round trips private bytes, retries without duplicate messages, retains download after completion',async()=>{
  const bytes=Buffer.alloc(524300,65); bytes.write('%PDF-1.7');
  const upload=(offset:number,part:Buffer)=>PUT(new Request('https://example.test/file',{method:'PUT',headers:{'x-file-name':'case.pdf','x-file-size':String(bytes.length),'x-file-offset':String(offset)},body:new Uint8Array(part)}),context);
  expect(await (await upload(0,bytes.subarray(0,524288))).json()).toMatchObject({offset:524288,complete:false});
  expect(await (await upload(0,bytes.subarray(0,524288))).json()).toMatchObject({offset:524288,complete:false});
  expect(await (await upload(524288,bytes.subarray(524288))).json()).toMatchObject({complete:true});
  expect(await (await upload(0,bytes.subarray(0,524288))).json()).toMatchObject({complete:true});
  const {sqlClient:sql}=await import('@/lib/db/client');
  const [count]=await sql`SELECT count(*)::int AS count FROM bahrain_communication_messages`;
  expect(count.count).toBe(1);
  state.closed=true;
  expect((await upload(0,bytes.subarray(0,20))).status).toBe(409);
  const first=await GET(new Request('https://example.test/file?offset=0'),context);
  const second=await GET(new Request('https://example.test/file?offset=524288'),context);
  expect(Buffer.concat([Buffer.from(await first.arrayBuffer()),Buffer.from(await second.arrayBuffer())])).toEqual(bytes);
});
