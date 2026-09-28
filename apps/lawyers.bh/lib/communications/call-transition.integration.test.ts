import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({role: 'lawyer'}));
vi.mock('@/lib/communications/server-access', () => ({resolveRequestCommunicationAccess: async()=>({actor:{role:state.role,id:'actor'},capabilities:{call:true}})}));
vi.mock('@/lib/db/client', () => ({get sqlClient(){return db;}}));
const url = process.env.CHAT_TEST_DATABASE_URL;
const db = postgres(url ?? 'postgres://unused', {max:1});
import { PATCH } from '../../app/api/mobile/communications/[requestId]/calls/[callId]/route';
describe.skipIf(!url)('call transition authorization in PostgreSQL',()=>{
  const schema = `call_qa_${randomUUID().replaceAll('-','')}`;
  beforeAll(async()=>{
    await db.unsafe(`CREATE SCHEMA ${schema}`); await db.unsafe(`SET search_path TO ${schema}`);
    await db`CREATE TABLE bahrain_communication_calls(id uuid PRIMARY KEY, request_id uuid, initiator_role text, media_kind text DEFAULT 'audio', status text DEFAULT 'ringing', ringing_at timestamptz DEFAULT now(), accepted_at timestamptz, connected_at timestamptz, ended_at timestamptz, duration_seconds int, end_reason text, ended_by_role text, updated_at timestamptz)`;
  });
  afterAll(async()=>{await db.unsafe(`DROP SCHEMA ${schema} CASCADE`);await db.end();});
  async function create(age=0){const id=randomUUID(),requestId=randomUUID();await db`INSERT INTO bahrain_communication_calls(id,request_id,initiator_role,ringing_at) VALUES(${id},${requestId},'client',now()-${age} * interval '1 second')`;return {id,requestId};}
  async function action(call:{id:string;requestId:string}, action:string){return PATCH(new Request('https://test.local',{method:'PATCH',body:JSON.stringify({action})}),{params:Promise.resolve({requestId:call.requestId,callId:call.id})});}
  it('caller cannot accept own call',async()=>{state.role='client';expect((await action(await create(),'accept')).status).toBe(409);});
  it('callee cannot cancel caller ringing',async()=>{state.role='lawyer';expect((await action(await create(),'cancel')).status).toBe(409);});
  it('expired call cannot be accepted',async()=>{state.role='lawyer';expect((await action(await create(46),'accept')).status).toBe(409);});
  it('both peers can report connected without resetting its timestamp',async()=>{state.role='lawyer';const call=await create();expect((await action(call,'accept')).status).toBe(200);const first=await (await action(call,'connect')).json();state.role='client';const second=await action(call,'connect');expect(second.status).toBe(200);expect((await second.json()).call.connectedAt).toBe(first.call.connectedAt);});
  it('microphone startup failure can close a ringing call',async()=>{state.role='client';expect((await action(await create(),'fail')).status).toBe(200);});
});
