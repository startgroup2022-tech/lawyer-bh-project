import postgres from 'postgres';
import {it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({role:'client',run:undefined as undefined|((parts:TemplateStringsArray,...values:unknown[])=>Promise<unknown>)}));
vi.mock('@/lib/communications/server-access',()=>({resolveRequestCommunicationAccess:async()=>({actor:{role:mocks.role}})}));
vi.mock('@/lib/db/client',()=>({sqlClient:(parts:TemplateStringsArray,...values:unknown[])=>mocks.run!(parts,...values)}));
import {POST} from './route';
const url=process.env.SERVICE_TEST_DATABASE_URL;
it.skipIf(!url)('read boundary updates only peer messages in the authorized request, once',async()=>{
 const u=new URL(url!);if(u.hostname!=='127.0.0.1'||u.port!=='57583'||u.pathname!=='/legalsos_service_test')throw Error('isolated database required');
 const sql=postgres(url!,{max:1});
 const r='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 const ids=['33333333-3333-4333-8333-333333333331','33333333-3333-4333-8333-333333333332','33333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333334'];
 try{
  await sql`CREATE SCHEMA read_receipt_test`;
  await sql`SET search_path TO read_receipt_test`;
  await sql`CREATE TABLE bahrain_communication_messages(id uuid primary key,request_id uuid,sender_role text,created_at timestamptz,read_at timestamptz)`;
  await sql`INSERT INTO bahrain_communication_messages VALUES(${ids[0]},${r},'lawyer','2026-01-01',null),(${ids[1]},${r},'client','2026-01-01',null),(${ids[2]},${r},'lawyer','2026-01-03',null),(${ids[3]},${other},'lawyer','2026-01-01',null)`;
  mocks.run=(parts,...values)=>sql.unsafe(parts.reduce((q,s,i)=>q+(i?'$'+i:'')+s,''),values as never[]);
  const call=(messageId:string)=>POST(new Request('https://test',{method:'POST',body:JSON.stringify({messageId})}),{params:Promise.resolve({requestId:r})});
  expect((await call(ids[3])).status).toBe(404);
  expect((await call(ids[1])).status).toBe(200);
  const first=await sql`SELECT id,read_at FROM bahrain_communication_messages ORDER BY id`;
  expect(first.map(x=>Boolean(x.read_at))).toEqual([true,false,false,false]);
  await call(ids[1]);
  expect((await sql`SELECT read_at FROM bahrain_communication_messages WHERE id=${ids[0]}`)[0].read_at).toEqual(first[0].read_at);
  mocks.role='lawyer';await call(ids[2]);
  expect((await sql`SELECT read_at FROM bahrain_communication_messages WHERE id=${ids[1]}`)[0].read_at).not.toBeNull();
 }finally{await sql`DROP SCHEMA IF EXISTS read_receipt_test CASCADE`;await sql.end();}
});
