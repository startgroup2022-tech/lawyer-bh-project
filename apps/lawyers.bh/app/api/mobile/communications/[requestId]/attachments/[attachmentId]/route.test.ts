import {beforeEach,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({participant:null as any,safety:{blockedByMe:false,blockedByPeer:false,chatSuspendedUntil:null as string|null}}));
vi.mock('@/lib/communications/server-access',()=>({resolveRequestCommunicationAccess:vi.fn(async()=>state.participant)}));
vi.mock('@/lib/communications/safety/store',()=>({getCommunicationSafetyState:vi.fn(async()=>state.safety)}));
import {GET,PUT} from './route';
const context={params:Promise.resolve({requestId:'8d983269-123f-49a8-9b62-ccaa7a4e496e',attachmentId:'11111111-1111-4111-8111-111111111111'})};
beforeEach(()=>{state.participant=null;state.safety={blockedByMe:false,blockedByPeer:false,chatSuspendedUntil:null};});
it('denies anonymous download and upload before accessing storage',async()=>{
  expect((await GET(new Request('https://example.test/file'),context)).status).toBe(403);
  expect((await PUT(new Request('https://example.test/file',{method:'PUT'}),context)).status).toBe(403);
});
it('denies new upload after completion',async()=>{
  state.participant={capabilities:{read:true,send:false}};
  expect((await PUT(new Request('https://example.test/file',{method:'PUT'}),context)).status).toBe(409);
});
it('rejects oversized upload metadata',async()=>{
  state.participant={capabilities:{read:true,send:true}};
  expect((await PUT(new Request('https://example.test/file',{method:'PUT',headers:{'x-file-name':'case.pdf','x-file-size':'10485761','x-file-offset':'0'},body:'file'}),context)).status).toBe(400);
});
it('blocks attachment uploads but not authenticated downloads when a user is blocked',async()=>{
  state.participant={actor:{role:'client',id:'client'},peer:{role:'lawyer',id:'lawyer'},capabilities:{read:true,send:true}};
  state.safety.blockedByMe=true;
  const response=await PUT(new Request('https://example.test/file',{method:'PUT'}),context);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({error:'communication_blocked'});
});
