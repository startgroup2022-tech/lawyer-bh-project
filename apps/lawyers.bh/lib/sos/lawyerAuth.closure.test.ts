import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({closed:false,cookie:'',id:'11111111-1111-4111-8111-111111111111'}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:state.cookie}),set:(_name:string,value:string)=>{state.cookie=value;}}),headers:async()=>new Headers()}));
vi.mock('@/lib/db/client',()=>({sqlClient:async()=>state.closed?[{id:'lifecycle'}]:[],schema:{bahrainLawyers:{}},db:{select:()=>({from:()=>({where:()=>({limit:async()=>[{id:state.id,isActive:true,countryCode:'BH',fullName:'Test Lawyer'}]})})})}}));
import {createMagicLinkToken,consumeMagicLinkToken,setAdvocateSession,getCurrentAdvocate} from './lawyerAuth';
beforeEach(()=>{state.closed=false;state.cookie='';vi.stubEnv('LAWYER_AUTH_SECRET','isolated-cookie-test-secret-32-chars');});
afterEach(()=>vi.unstubAllEnvs());
it('revokes a previously issued SOS cookie while leaving the shared lawyer row unchanged',async()=>{
  await setAdvocateSession(state.id,'BH');
  expect((await getCurrentAdvocate())?.id).toBe(state.id);
  state.closed=true;
  expect(await getCurrentAdvocate()).toBeNull();
});
it('denies an old magic link and refuses creating a new SOS session for a closed lawyer',async()=>{
  const token=await createMagicLinkToken(state.id,'BH');
  expect(await consumeMagicLinkToken(token)).toEqual({advocateId:state.id,countryCode:'BH'});
  state.closed=true;
  expect(await consumeMagicLinkToken(token)).toBeNull();
  await expect(setAdvocateSession(state.id,'BH')).rejects.toThrow('account_unavailable');
  expect(state.cookie).toBe('');
});
