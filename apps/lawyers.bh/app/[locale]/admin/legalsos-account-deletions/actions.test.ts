import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const state=vi.hoisted(()=>({allowed:true,actors:[] as string[]}));
vi.mock('@/lib/auth/admin-access',()=>({requireSuperAdmin:async()=>state.allowed?{id:'trusted-admin'}:null}));
vi.mock('@/lib/db/client',()=>({sqlClient:{}}));
vi.mock('@/lib/legalsos-account-lifecycle/admin',()=>({createDeletionAdminStore:()=>({settle:async(_id:string,_request:string,actor:string)=>{state.actors.push(actor);}})}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);}}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
beforeEach(()=>{state.allowed=true;state.actors=[];vi.stubEnv('LEGALSOS_DELETION_WORKFLOW_READY','1');});
afterEach(()=>vi.unstubAllEnvs());
const form=()=>{const f=new FormData();f.set('lifecycleId','11111111-1111-4111-8111-111111111111');f.set('requestId','22222222-2222-4222-8222-222222222222');f.set('confirmation','reviewed');return f;};
it('rechecks authorization when the server action is directly invoked',async()=>{
  state.allowed=false;
  await expect((await import('./actions')).settleDeletion('ar',form())).rejects.toThrow('redirect:/ar/admin');
  expect(state.actors).toEqual([]);
});
it('requires enabled workflow and explicit review acknowledgement',async()=>{
  const action=(await import('./actions')).settleDeletion;
  const f=form();f.delete('confirmation');
  await expect(action('ar',f)).rejects.toThrow('result=invalid');
  vi.stubEnv('LEGALSOS_DELETION_WORKFLOW_READY','0');
  await expect(action('ar',form())).rejects.toThrow('result=unavailable');
  expect(state.actors).toEqual([]);
});
it('ignores supplied administrator identity and redirects after settlement',async()=>{
  const f=form();f.set('adminId','attacker');
  await expect((await import('./actions')).settleDeletion('en',f)).rejects.toThrow('result=settled');
  expect(state.actors).toEqual(['trusted-admin']);
});
