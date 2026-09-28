import {expect,it} from 'vitest';
import {handlePreferences} from './http';
const preferences={enabled:true,requests:false,communications:true,advertising:false};
const request=(method:string,token?:string,body?:unknown)=>new Request('https://example.test/api/mobile/notification-preferences',{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
it('rejects missing capability before accessing storage',async()=>{
  const result=await handlePreferences(request('GET'),{get:async()=>{throw Error('Do not query');},save:async()=>{throw Error('Do not write');}});
  expect(result.status).toBe(401);
});
it('does not use a caller-selected key and returns saved server state',async()=>{
  const result=await handlePreferences(request('PUT','a'.repeat(64),{deviceKey:'forged',preferences}),{get:async()=>preferences,save:async(key,input)=>{expect(key).not.toBe('forged');expect(key).not.toBe('a'.repeat(64));expect(input.preferences).toEqual(preferences);return preferences;}});
  expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('no-store');expect((await result.json()).preferences.requests).toBe(false);
});
