import {describe,it,expect} from 'vitest';
import {createPurgeCron} from './cron';
const request=(token='test-secret',query='')=>new Request('https://example.invalid/api/cron/legalsos-account-purge'+query,{headers:{authorization:'Bearer '+token}});
describe('purge cron boundary',()=>{
  it('rejects absent, wrong and unconfigured secrets before accessing storage',async()=>{
    for(const configured of ['test-secret',undefined]){
      const handler=createPurgeCron({secret:()=>configured,enabled:()=>true,run:async()=>{throw new Error('must not run');},status:async()=>{throw new Error('must not read');}});
      for(const r of [request('wrong'),new Request('https://example.invalid/')])expect((await handler(r)).status).toBe(401);
    }
  });
  it('refuses destructive runs while release is disabled',async()=>{
    const handler=createPurgeCron({secret:()=> 'test-secret',enabled:()=>false,run:async()=>{throw new Error('must not run');},status:async()=>({due:2,pending:4})});
    expect((await handler(request())).status).toBe(503);
  });
  it('allows an authenticated read-only readiness probe without invoking deletion',async()=>{
    const handler=createPurgeCron({secret:()=> 'test-secret',enabled:()=>false,run:async()=>{throw new Error('must not run');},status:async()=>({due:2,pending:4})});
    const result=await handler(request('test-secret','?dryRun=1'));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ok:true,dryRun:true,enabled:false,due:2,pending:4});
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('reports failed cleanup as a failed job, not a successful run',async()=>{
    const handler=createPurgeCron({secret:()=> 'test-secret',enabled:()=>true,run:async()=>({processed:1,failed:1}),status:async()=>({due:0,pending:0})});
    const result=await handler(request());
    expect(result.status).toBe(500);expect(await result.json()).toEqual({ok:false,processed:1,failed:1});
  });
  it('does not leak database errors or private payloads',async()=>{
    const handler=createPurgeCron({secret:()=> 'test-secret',enabled:()=>true,run:async()=>{throw new Error('private@example.invalid');},status:async()=>({due:0,pending:0})});
    const result=await handler(request());expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ok:false,error:'purge_failed'});
  });
  it('reports a successful bounded run',async()=>{
    const handler=createPurgeCron({secret:()=> 'test-secret',enabled:()=>true,run:async()=>({processed:3,failed:0}),status:async()=>({due:0,pending:0})});
    const result=await handler(request());expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ok:true,processed:3,failed:0});
  });
});
