import {afterEach,expect,it,vi} from 'vitest';
import {handleInbox} from './http';
import {createMobileDispatchToken} from '../sos/mobile-dispatch-auth';
afterEach(()=>vi.unstubAllEnvs());
const page={items:[],unreadCount:0,snapshotAt:'2026-08-27T00:00:00.000Z',nextCursor:null};
const request=(body:unknown,authorization?:string)=>new Request('https://example.test/api/mobile/notifications',{method:'POST',headers:{'content-type':'application/json',...(authorization?{authorization}:{})},body:JSON.stringify(body)});
it('rejects expired or malformed account authorization without executing the inbox query',async()=>{
  for(const header of ['Bearer expired','Bearer '+'a'.repeat(64)]) {
    const result=await handleInbox(request({requests:[]},header),{session:async()=>null,authorizeRequests:async()=>true,run:async()=>{throw Error('Query must not run');}});
    expect(result.status).toBe(401);expect(result.headers.get('cache-control')).toBe('no-store');
  }
});
it('guest without request capabilities receives an empty inbox without a database query',async()=>{
  const result=await handleInbox(request({requests:[]}),{session:async()=>{throw Error('No session expected');},authorizeRequests:async()=>true,run:async()=>{throw Error('No query expected');}});
  expect(result.status).toBe(200);expect((await result.json()).items).toEqual([]);
});
it('passes only the server resolved account identity and rejects overlarge bodies',async()=>{
  const deps={session:async()=>({id:'real-account'}),authorizeRequests:async()=>true,run:async(_input:unknown,id:string|null)=>{if(id!=='real-account')throw Error('Identity mismatch');return page;}};
  const result=await handleInbox(request({requests:[],clientId:'forged'},'Bearer '+'a'.repeat(64)),deps);
  expect(result.status).toBe(200);expect((await result.json()).snapshotAt).toBe(page.snapshotAt);
  expect((await handleInbox(request({requests:[],padding:'x'.repeat(33000)}),deps)).status).toBe(413);
});
it('rejects a signed request capability when its account access has been closed',async()=>{
  vi.stubEnv('MOBILE_DISPATCH_SECRET','test-only-secret-'.repeat(3));
  const id='11111111-1111-4111-8111-111111111111';
  const result=await handleInbox(request({requests:[{id,token:createMobileDispatchToken(id)}]}),{
    session:async()=>null,authorizeRequests:async()=>false,run:async()=>page,
  });
  expect(result.status).toBe(403);
  expect(await result.json()).toEqual({ok:false,error:'forbidden'});
});
