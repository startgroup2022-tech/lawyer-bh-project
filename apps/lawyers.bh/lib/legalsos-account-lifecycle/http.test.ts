import { beforeEach, expect, it, vi } from 'vitest';
import { ClientAuthError } from '../client-auth/validation';
import type { Subject } from './types';
const owner: Subject = { role:'client',id:'11111111-1111-4111-8111-111111111111' };
const receipt = { id:'receipt',requestedAt:'2026-09-13T10:00:00.000Z',purgeAfter:'2026-10-13T10:00:00.000Z' };
const proof='A'.repeat(43);
const dependencies = {
  enabled: () => true,
  subject: vi.fn<(request: Request) => Promise<Subject|null>>().mockResolvedValue(owner),
  reauthenticate: vi.fn<(subject: Subject,password: string) => Promise<{proof:string;expiresAt:string}>>()
    .mockResolvedValue({proof,expiresAt:'2026-09-13T10:05:00.000Z'}),
  close: vi.fn<(subject: Subject,proof: string) => Promise<typeof receipt>>().mockResolvedValue(receipt),
  recover: vi.fn<(proof: string) => Promise<typeof receipt>>().mockResolvedValue(receipt),
};
beforeEach(()=> { vi.clearAllMocks(); dependencies.subject.mockResolvedValue(owner); });
const handlers = async () => (await import('./http')).createDeletionHandlers(dependencies);
const request = (body:unknown) => new Request('https://lawyers.bh/api/mobile/account-deletion',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
});
it('keeps unfinished deletion unavailable without calling account services',async()=>{
  const {createDeletionHandlers}=await import('./http');
  const response=await createDeletionHandlers({...dependencies,enabled:()=>false}).POST(request({action:'confirm',proof}));
  expect(response.status).toBe(503); expect(dependencies.close).not.toHaveBeenCalled();
});
it('rejects anonymous and cookie-only callers',async()=>{
  dependencies.subject.mockResolvedValue(null);
  const response=await (await handlers()).POST(request({action:'verify',password:'test'}));
  expect(response.status).toBe(401); expect(dependencies.reauthenticate).not.toHaveBeenCalled();
});
it('passes the exact password and server-resolved identity for fresh verification',async()=>{
  const response=await (await handlers()).POST(request({action:'verify',password:' exact password '}));
  expect(response.status).toBe(200);
  expect(dependencies.reauthenticate).toHaveBeenCalledWith(owner,' exact password ');
  expect(await response.json()).toMatchObject({ok:true,proof});
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it.each([
  {action:'confirm',proof,subject:{role:'lawyer',id:'victim'}},
  {action:'confirm',proof,role:'lawyer'}, {action:'confirm',proof:''},
  {action:'verify',password:7}, {action:'unknown'},
])('rejects malformed or identity-selecting bodies %#',async body=>{
  expect((await (await handlers()).POST(request(body))).status).toBe(400);
  expect(dependencies.close).not.toHaveBeenCalled();
});
it('confirms only the authenticated subject and returns the persisted deadline',async()=>{
  const response=await (await handlers()).POST(request({action:'confirm',proof}));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ok:true,...receipt});
  expect(dependencies.close).toHaveBeenCalledWith(owner,proof);
});
it('does not turn a rejected or expired proof into success',async()=>{
  dependencies.close.mockRejectedValueOnce(new ClientAuthError('invalid_deletion_proof',401));
  const response=await (await handlers()).POST(request({action:'confirm',proof}));
  expect(response.status).toBe(401); expect(await response.json()).toEqual({ok:false,error:'invalid_deletion_proof'});
});
it('recovers the minimal receipt using a header without restoring account authentication',async()=>{
  const response=await (await handlers()).GET(new Request('https://lawyers.bh/api/mobile/account-deletion',{
    headers:{'x-deletion-proof':proof},
  }));
  expect(await response.json()).toEqual({ok:true,...receipt});
  expect(dependencies.subject).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('does not leak database errors or credentials',async()=>{
  dependencies.close.mockRejectedValueOnce(new Error('private-db-detail'));
  const response=await (await handlers()).POST(request({action:'confirm',proof}));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain('private-db-detail');
});
