import {afterEach,expect,it,vi} from 'vitest';
import {parseInboxInput} from './input';
import {createMobileDispatchToken} from '../sos/mobile-dispatch-auth';
const id='11111111-1111-4111-8111-111111111111';
afterEach(()=>vi.unstubAllEnvs());
it('only authorizes exact request capabilities and deduplicates them',()=>{
  vi.stubEnv('MOBILE_DISPATCH_SECRET','test-only-secret-'.repeat(3));
  const token=createMobileDispatchToken(id);
  expect(parseInboxInput({requests:[{id,token},{id,token}]}).requestIds).toEqual([id]);
  expect(()=>parseInboxInput({requests:[{id,token:'x'.repeat(43)}]})).toThrow('forbidden');
  expect(()=>parseInboxInput({requests:[{id:'22222222-2222-4222-8222-222222222222',token}]})).toThrow('forbidden');
});
it('bounds credentials, timestamps and read actions',()=>{
  for(const input of [null,[],{requests:'all'},{requests:Array(101).fill({id,token:'x'})},{requests:[{id:'bad',token:'x'}]},{requests:[],readId:'bad'},{requests:[],before:'not-a-date'},{requests:[],readAll:true},{requests:[],filter:'mine'}]) {
    expect(()=>parseInboxInput(input)).toThrow();
  }
  expect(parseInboxInput({requests:[],filter:'unread',readId:id}).readId).toBe(id);
});
