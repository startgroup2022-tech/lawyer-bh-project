import {expect,it} from 'vitest';
import {readAuthJson,bearerToken} from './http';

it('rejects oversized bodies before parsing',async()=>{
  const request=new Request('https://lawyers.bh/api/mobile/client-auth/request',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(5000)});
  await expect(readAuthJson(request)).rejects.toMatchObject({status:413});
});
it('rejects cross-origin and non-json requests',async()=>{
  await expect(readAuthJson(new Request('https://lawyers.bh/api/mobile/client-auth/request',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'}))).rejects.toMatchObject({status:403});
  await expect(readAuthJson(new Request('https://lawyers.bh/api/mobile/client-auth/request',{method:'POST',body:'{}'}))).rejects.toMatchObject({status:415});
});
it('never accepts arbitrary legacy client or lawyer tokens',()=>{
  expect(bearerToken(new Request('https://lawyers.bh',{headers:{authorization:'Bearer old-token'}}))).toBeNull();
  expect(bearerToken(new Request('https://lawyers.bh',{headers:{authorization:`Bearer ${'a'.repeat(64)}`}}))).toBe('a'.repeat(64));
});
