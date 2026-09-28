import { describe,expect,it,vi } from 'vitest';
import { createWebDeletionHandlers } from './web-http';
const proof='a'.repeat(43),id='11111111-1111-4111-8111-111111111111';
const receipt={id,requestedAt:'2026-09-13T08:00:00Z',purgeAfter:'2026-10-13T08:00:00Z',cleanupRequestIds:[]};
function setup(){
  const deps={enabled:()=>true,verify:vi.fn(async()=>({proof,expiresAt:'2026-09-13T08:05:00Z'})),
    resolve:vi.fn(async()=>({role:'client' as const,id})),close:vi.fn(async()=>receipt),recover:vi.fn(async():Promise<typeof receipt|null>=>null)};
  return {deps,handlers:createWebDeletionHandlers(deps)};
}
const post=(body:unknown,origin='https://www.lawyers.bh')=>new Request('https://www.lawyers.bh/api/legalsos/account-deletion',{
  method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
describe('web deletion HTTP boundary',()=>{
  it('verifies exact credentials and does not close until explicit confirmation',async()=>{
    const {deps,handlers}=setup();
    const response=await handlers.POST(post({action:'verify',role:'client',identifier:'a@example.invalid',password:' exact '}));
    expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,proof});
    expect(deps.verify).toHaveBeenCalledWith('client','a@example.invalid',' exact ','local');expect(deps.close).not.toHaveBeenCalled();
  });
  it('derives the confirmed identity from the proof, not supplied IDs',async()=>{
    const {deps,handlers}=setup();
    expect((await handlers.POST(post({action:'confirm',proof,id}))).status).toBe(400);
    expect(deps.close).not.toHaveBeenCalled();
    const response=await handlers.POST(post({action:'confirm',proof}));
    expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,...receipt});
    expect(deps.close).toHaveBeenCalledWith({role:'client',id},proof);
  });
  it('rejects cross-origin and invalid proof requests without closing an account',async()=>{
    const {deps,handlers}=setup();
    expect((await handlers.POST(post({action:'confirm',proof},'https://untrusted.invalid'))).status).toBe(403);
    expect((await handlers.POST(post({action:'confirm',proof:'bad'}))).status).toBe(400);
    deps.resolve.mockResolvedValueOnce(null as never);
    expect((await handlers.POST(post({action:'confirm',proof}))).status).toBe(401);
    expect(deps.close).not.toHaveBeenCalled();
  });
  it('recovers a confirmed receipt without repeating deletion and sends no-store responses',async()=>{
    const {deps,handlers}=setup();deps.recover.mockResolvedValue(receipt);
    const response=await handlers.GET(new Request('https://www.lawyers.bh/api/legalsos/account-deletion',{headers:{'x-deletion-proof':proof}}));
    expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ok:true,...receipt});
    expect((await handlers.POST(post({action:'confirm',proof}))).status).toBe(200);expect(deps.close).not.toHaveBeenCalled();
  });
  it('does not expose the workflow before activation',async()=>{
    const {deps}=setup();deps.enabled=()=>false;const handlers=createWebDeletionHandlers(deps);
    expect((await handlers.POST(post({action:'confirm',proof}))).status).toBe(503);
    expect(deps.resolve).not.toHaveBeenCalled();expect(deps.close).not.toHaveBeenCalled();
  });
  it('distinguishes an unconfirmed valid proof so the user may explicitly retry confirmation',async()=>{
    const {deps,handlers}=setup();
    const response=await handlers.GET(new Request('https://www.lawyers.bh/api/legalsos/account-deletion',{headers:{'x-deletion-proof':proof}}));
    expect(response.status).toBe(409);expect(await response.json()).toEqual({ok:false,error:'confirmation_not_received'});
    expect(deps.close).not.toHaveBeenCalled();
  });
});
