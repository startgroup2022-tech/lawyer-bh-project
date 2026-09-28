import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({admin:null as null|{id:string},mutations:[] as string[]}));
vi.mock('@/lib/auth/admin-access',()=>({requireSuperAdmin:async()=>state.admin}));
vi.mock('@/lib/db/client',()=>({sqlClient:{}}));
vi.mock('@/lib/legalsos-account-lifecycle/admin',()=>({createDeletionAdminStore:()=>({
  list:async(limit:number,offset:number)=>[{id:'example',limit,offset}],
  settle:async(_id:string,_requestId:string,actor:string)=>{state.mutations.push(actor);return {state:'settled',settledBy:actor};},
})}));
const endpoint='https://lawyers.bh/api/admin/legalsos-account-deletions';
const body={lifecycleId:'11111111-1111-4111-8111-111111111111',requestId:'22222222-2222-4222-8222-222222222222'};
const post=(value:unknown,origin='https://lawyers.bh')=>new Request(endpoint,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(value)});
const route=()=>import('./route');
beforeEach(()=>{state.admin={id:'trusted-admin'};state.mutations=[];vi.stubEnv('LEGALSOS_DELETION_WORKFLOW_READY','1');});
afterEach(()=>vi.unstubAllEnvs());
it('denies an anonymous or non-super-admin reader and writer',async()=>{
  state.admin=null;
  const api=await route();
  expect((await api.GET(new Request(endpoint))).status).toBe(403);
  expect((await api.POST(post(body))).status).toBe(403);
  expect(state.mutations).toEqual([]);
});
it('does not expose unfinished workflow while disabled',async()=>{
  vi.stubEnv('LEGALSOS_DELETION_WORKFLOW_READY','0');
  const api=await route();
  expect((await api.GET(new Request(endpoint))).status).toBe(503);
  expect((await api.POST(post(body))).status).toBe(503);
  expect(state.mutations).toEqual([]);
});
it('uses the server-resolved administrator and does not cache the result',async()=>{
  const response=await (await route()).POST(post(body));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ok:true,state:'settled',settledBy:'trusted-admin'});
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('rejects cross-origin writes and supplied actor identity',async()=>{
  const api=await route();
  expect((await api.POST(post(body,'https://untrusted.example'))).status).toBe(403);
  expect((await api.POST(post({...body,adminId:'attacker'}))).status).toBe(400);
  expect(state.mutations).toEqual([]);
});
it.each(['?limit=0','?limit=51','?offset=-1','?limit=NaN','?limit=2.5'])('rejects unsafe pagination %s',async query=>{
  expect((await (await route()).GET(new Request(endpoint+query))).status).toBe(400);
});
it('passes bounded pagination and disables caching',async()=>{
  const response=await (await route()).GET(new Request(endpoint+'?limit=10&offset=20'));
  expect(await response.json()).toEqual({ok:true,items:[{id:'example',limit:10,offset:20}]});
  expect(response.headers.get('cache-control')).toBe('no-store');
});
