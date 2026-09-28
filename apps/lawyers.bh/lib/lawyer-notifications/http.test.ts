import {it,expect,vi} from 'vitest';
import {handleLawyerInbox} from './http';
it('rejects cross-origin mutations',async()=>{
 const run=vi.fn();
 const response=await handleLawyerInbox(new Request('https://test',{method:'POST',headers:{origin:'https://other'},body:'{}'}),'owner',run);
 expect(response.status).toBe(403);expect(run).not.toHaveBeenCalled();
});
it('rejects missing identity without reading inbox',async()=>{
  const run=vi.fn();
  const response=await handleLawyerInbox(new Request('https://test',{method:'POST',body:'{}'}),null,run);
  expect(response.status).toBe(401); expect(run).not.toHaveBeenCalled();
});
it('rejects caller-supplied owner and malformed cursors',async()=>{
  for(const input of [{lawyerId:'other'},{readId:'bad'},{before:'bad',beforeId:'bad'}]){
    const run=vi.fn();
    const response=await handleLawyerInbox(new Request('https://test',{method:'POST',body:JSON.stringify(input)}),'owner',run);
    expect(response.status).toBe(400); expect(run).not.toHaveBeenCalled();
  }
});
it('uses authenticated owner and prevents caching',async()=>{
  const run=vi.fn(async()=>({items:[],unreadCount:0,snapshotAt:'2026-09-12T00:00:00Z',nextCursor:null}));
  const response=await handleLawyerInbox(new Request('https://test',{method:'POST',body:'{}'}),'owner',run);
  expect(response.status).toBe(200); expect(run).toHaveBeenCalledWith('owner',expect.any(Object));
  expect(response.headers.get('cache-control')).toBe('no-store');
});
