import { expect,it,vi } from 'vitest';
import { resolveDeletionSubject } from './subject';
const id='11111111-1111-4111-8111-111111111111';
it('does not use cookies or caller-supplied identity as app authentication',async()=>{
  const client=vi.fn(),lawyer=vi.fn();
  expect(await resolveDeletionSubject(new Request('https://lawyers.bh/?id=victim',{headers:{cookie:'website-session=value'}}),{client,lawyer})).toBeNull();
  expect(client).not.toHaveBeenCalled(); expect(lawyer).not.toHaveBeenCalled();
});
it('resolves the account from a live client session, not a request body',async()=>{
  const client=vi.fn(async()=>({id})),lawyer=vi.fn();
  const request=new Request('https://lawyers.bh',{headers:{authorization:`Bearer ${'a'.repeat(64)}`}});
  expect(await resolveDeletionSubject(request,{client,lawyer})).toEqual({role:'client',id});
  expect(lawyer).not.toHaveBeenCalled();
});
it('does not fall back to lawyer credentials for a rejected client session',async()=>{
  const client=vi.fn(async()=>null),lawyer=vi.fn(async()=>({lawyerId:id,countryCode:'BH'}));
  expect(await resolveDeletionSubject(new Request('https://lawyers.bh',{headers:{authorization:`Bearer ${'a'.repeat(64)}`}}),{client,lawyer})).toBeNull();
  expect(lawyer).not.toHaveBeenCalled();
});
it('uses the verified mobile lawyer identity',async()=>{
  const client=vi.fn(),lawyer=vi.fn(async()=>({lawyerId:id,countryCode:'BH'}));
  expect(await resolveDeletionSubject(new Request('https://lawyers.bh',{headers:{authorization:'Bearer signed.mobile'}}),{client,lawyer})).toEqual({role:'lawyer',id});
});
