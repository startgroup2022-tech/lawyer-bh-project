import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({start:vi.fn(),beginFile:vi.fn(),finish:vi.fn(),append:vi.fn(),download:vi.fn(),session:vi.fn(),auth:vi.fn()}));
vi.mock('@/lib/provider-agreement/repository',()=>({agreementFiles:mocks}));
vi.mock('@/lib/auth/admin-access',()=>({requireAdminPermission:mocks.auth}));
vi.mock('@/app/api/provider/_session',()=>({getProviderSessionFromRequest:mocks.session}));
import {POST,PATCH} from '@/app/api/public/provider-agreement/upload/route';
import {GET} from '@/app/api/provider/agreement-file/route';
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue(null);mocks.session.mockReturnValue({providerId:'owner',countryCode:'BH'});});
it('rejects cross-origin file writes before touching upload storage',async()=>{
  const request=new Request('https://test.invalid/api/public/provider-agreement/upload',{method:'POST',headers:{origin:'https://other.invalid'},body:'{"action":"start"}'});
  expect((await POST(request)).status).toBe(403);expect(mocks.start).not.toHaveBeenCalled();
});
it('bounds raw chunks and rejects malformed offsets',async()=>{
  const request=(body:string,offset?:string)=>new Request('https://test.invalid/api/public/provider-agreement/upload',{method:'PATCH',headers:{origin:'https://test.invalid',...(offset?{'x-upload-offset':offset}:{})},body});
  expect((await PATCH(request('x','bad'))).status).toBe(400);
  expect((await PATCH(request('x'.repeat(1048577),'0'))).status).toBe(413);
  expect(mocks.append).not.toHaveBeenCalled();
});
it('denies another provider access and forces private attachment downloads for the owner',async()=>{
  expect((await GET(new NextRequest('https://test.invalid/api/provider/agreement-file?providerId=other&fileId=one'))).status).toBe(403);
  expect(mocks.download).not.toHaveBeenCalled();
  mocks.download.mockResolvedValue({name:'مرفق.pdf',mime:'application/pdf',bytes:Buffer.from('test')});
  const response=await GET(new NextRequest('https://test.invalid/api/provider/agreement-file?fileId=one'));
  expect(response.status).toBe(200);expect(await response.text()).toBe('test');
  expect(response.headers.get('content-disposition')).toMatch(/^attachment;/);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('content-security-policy')).toContain('sandbox');
});
