import {it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({access:vi.fn(),sql:vi.fn()}));
vi.mock('@/lib/communications/server-access',()=>({resolveRequestCommunicationAccess:mocks.access}));
vi.mock('@/lib/db/client',()=>({sqlClient:mocks.sql}));
import {POST} from './route';
const requestId='11111111-1111-4111-8111-111111111111';
const messageId='22222222-2222-4222-8222-222222222222';
const context={params:Promise.resolve({requestId})};
const request=(id=messageId)=>new Request('https://test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messageId:id})});
beforeEach(()=>{mocks.access.mockReset();mocks.sql.mockReset();});
it('refuses unauthorized reads before touching messages',async()=>{
 mocks.access.mockResolvedValue(null);expect((await POST(request(),context)).status).toBe(403);expect(mocks.sql).not.toHaveBeenCalled();
});
it('rejects malformed message id',async()=>{
 mocks.access.mockResolvedValue({actor:{role:'client'},canRead:true});expect((await POST(request('bad'),context)).status).toBe(400);
});
it('returns not found when boundary message is outside this request',async()=>{
 mocks.access.mockResolvedValue({actor:{role:'client'},canRead:true});mocks.sql.mockResolvedValue([]);
 expect((await POST(request(),context)).status).toBe(404);
});
it('acknowledges an authorized boundary',async()=>{
 mocks.access.mockResolvedValue({actor:{role:'lawyer'},canRead:true});mocks.sql.mockResolvedValue([{id:messageId}]);
 const result=await POST(request(),context);expect(result.status).toBe(200);expect(await result.json()).toEqual({ok:true});
});
