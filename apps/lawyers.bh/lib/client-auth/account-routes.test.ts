import {beforeEach,expect,it,vi} from 'vitest';

const service=vi.hoisted(()=>({
  updatePersonalInfo:vi.fn(),
  requestEmailChange:vi.fn(),
  verifyEmailChange:vi.fn(),
  changePassword:vi.fn(),
  deleteAccount:vi.fn(),
}));
vi.mock('@/lib/client-auth/runtime',()=>({clientAuthService:()=>service}));

import {PATCH as updateAccount} from '@/app/api/mobile/client-auth/account/route';
import {DELETE as deleteAccount} from '@/app/api/mobile/client-auth/account/route';
import {POST as requestEmailChange} from '@/app/api/mobile/client-auth/email-change/request/route';
import {POST as verifyEmailChange} from '@/app/api/mobile/client-auth/email-change/verify/route';
import {PATCH as changePassword} from '@/app/api/mobile/client-auth/password/route';

const token='a'.repeat(64);
function jsonRequest(path:string,method:string,body:unknown,authorized=true) {
  return new Request(`https://lawyers.bh${path}`,{method,headers:{'content-type':'application/json',...(authorized?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
}
beforeEach(()=>vi.clearAllMocks());

it('requires an authenticated session for every account mutation',async()=>{
  const responses=await Promise.all([
    updateAccount(jsonRequest('/api/mobile/client-auth/account','PATCH',{},false)),
    deleteAccount(jsonRequest('/api/mobile/client-auth/account','DELETE',{},false)),
    requestEmailChange(jsonRequest('/api/mobile/client-auth/email-change/request','POST',{},false)),
    verifyEmailChange(jsonRequest('/api/mobile/client-auth/email-change/verify','POST',{},false)),
    changePassword(jsonRequest('/api/mobile/client-auth/password','PATCH',{},false)),
  ]);
  expect(responses.map(response=>response.status)).toEqual([401,401,401,401,401]);
  expect(service.updatePersonalInfo).not.toHaveBeenCalled();
  expect(service.deleteAccount).not.toHaveBeenCalled();
});

it('normalizes and updates personal information',async()=>{
  service.updatePersonalInfo.mockResolvedValue({id:'client-1',email:'client@example.com',fullName:'Test Client',phone:'+97336000000'});
  const response=await updateAccount(jsonRequest('/api/mobile/client-auth/account','PATCH',{fullName:'  Test   Client ',phone:'+973 3600 0000'}));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(service.updatePersonalInfo).toHaveBeenCalledWith(token,{fullName:'Test Client',phone:'+97336000000'});
  expect(await response.json()).toMatchObject({ok:true,client:{fullName:'Test Client'}});
});

it('deletes account and signs out all sessions',async()=>{
  service.deleteAccount.mockResolvedValue(undefined);
  const response=await deleteAccount(jsonRequest('/api/mobile/client-auth/account','DELETE',{}));
  expect(response.status).toBe(200);
  expect(service.deleteAccount).toHaveBeenCalledWith(token);
  expect(await response.json()).toEqual({ok:true});
});

it('requests and verifies a new email with the authenticated token',async()=>{
  service.requestEmailChange.mockResolvedValue({challengeId:'9a652acb-c0a6-4c71-a4fa-2764c08a749c',retryAfterSeconds:60,expiresInSeconds:600});
  const requestResponse=await requestEmailChange(jsonRequest('/api/mobile/client-auth/email-change/request','POST',{email:' NEW@Example.COM ',currentPassword:'old pass 123',locale:'en'}));
  expect(requestResponse.status).toBe(200);
  expect(service.requestEmailChange).toHaveBeenCalledWith(token,{email:'new@example.com',currentPassword:'old pass 123',locale:'en'},'local');
  service.verifyEmailChange.mockResolvedValue({id:'client-1',email:'new@example.com',fullName:'Test Client',phone:'+97336000000'});
  const verifyResponse=await verifyEmailChange(jsonRequest('/api/mobile/client-auth/email-change/verify','POST',{challengeId:'9a652acb-c0a6-4c71-a4fa-2764c08a749c',code:'123456'}));
  expect(service.verifyEmailChange).toHaveBeenCalledWith(token,'9a652acb-c0a6-4c71-a4fa-2764c08a749c','123456','local');
  expect(await verifyResponse.json()).toMatchObject({ok:true,client:{email:'new@example.com'}});
});

it('changes password without returning secret material',async()=>{
  service.changePassword.mockResolvedValue(undefined);
  const response=await changePassword(jsonRequest('/api/mobile/client-auth/password','PATCH',{currentPassword:'old pass 123',newPassword:'new pass 456'}));
  expect(service.changePassword).toHaveBeenCalledWith(token,{currentPassword:'old pass 123',newPassword:'new pass 456'},'local');
  expect(await response.json()).toEqual({ok:true});
});
