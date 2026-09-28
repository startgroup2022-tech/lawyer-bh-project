import {beforeEach,describe,expect,it,vi} from 'vitest';
const service = vi.hoisted(()=>({deleteAccount:vi.fn(async()=>undefined)}));
vi.mock('@/lib/client-auth/runtime',()=>({clientAuthService:()=>service}));
import {DELETE} from './route';

describe('legacy account deletion boundary',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('does not bypass the confirmed 30-day workflow with a legacy session-only DELETE',async()=>{
    const response=await DELETE(new Request('https://lawyers.bh/api/mobile/client-auth/account',{
      method:'DELETE',headers:{authorization:`Bearer ${'a'.repeat(64)}`},
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ok:false,error:'deletion_confirmation_required'});
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(service.deleteAccount).not.toHaveBeenCalled();
  });
  it('rejects a request without a session instead of reporting successful deletion',async()=>{
    const response=await DELETE(new Request('https://lawyers.bh/api/mobile/client-auth/account',{method:'DELETE'}));
    expect(response.status).toBe(401);
    expect(service.deleteAccount).not.toHaveBeenCalled();
  });
});
