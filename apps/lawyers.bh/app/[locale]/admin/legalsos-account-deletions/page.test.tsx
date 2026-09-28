import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const state=vi.hoisted(()=>({allowed:true,rows:[] as unknown[]}));
vi.mock('@/lib/auth/admin-access',()=>({requireSuperAdmin:async()=>state.allowed?{id:'admin'}:null}));
vi.mock('@/lib/db/client',()=>({sqlClient:{}}));
vi.mock('@/lib/legalsos-account-lifecycle/admin',()=>({createDeletionAdminStore:()=>({list:async()=>state.rows})}));
vi.mock('next-intl/server',()=>({setRequestLocale:()=>{}}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`redirect:${url}`);}}));
vi.mock('./actions',()=>({settleDeletion:async()=>{}}));
beforeEach(()=>{state.allowed=true;state.rows=[];vi.stubEnv('LEGALSOS_DELETION_WORKFLOW_READY','1');});
afterEach(()=>vi.unstubAllEnvs());
async function render(locale='ar') {
  const Page=(await import('./page')).default;
  return renderToStaticMarkup(await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve({})}));
}
it('redirects unauthorized readers without rendering account work',async()=>{
  state.allowed=false;await expect(render()).rejects.toThrow('redirect:/ar/admin');
});
it.each([['ar','لا توجد طلبات حذف معلّقة'],['en','No pending account deletions']])('renders a clear %s empty state',async(locale,label)=>{
  expect(await render(locale)).toContain(label);
});
it('shows disabled preparation, not a misleading empty queue',async()=>{
  vi.stubEnv('LEGALSOS_DELETION_WORKFLOW_READY','0');
  expect(await render()).toContain('المسار غير مفعّل');
});
it('renders real task amounts, urgency and a confirmation action without client contact data',async()=>{
  state.rows=[{id:'lifecycle-id',subjectRole:'client',state:'pending_deletion',requestedAt:'2026-09-01T00:00:00Z',purgeAfter:'2026-10-01T00:00:00Z',overdue:true,pendingSettlements:1,
    requests:[{requestId:'request-id',caseRef:'SOS-TEST',serviceStatus:'completed',paymentStatus:'success',refundStatus:'none',amountBhd:'12.500',chargeId:'synthetic-charge',state:'pending'}]}];
  const html=await render();
  expect(html).toContain('SOS-TEST');expect(html).toContain('12.500');
  expect(html).toContain('متأخر');expect(html).toContain('تأكيد مراجعة التسوية');
  expect(html).toContain('type="checkbox"');expect(html).toContain('required');
});
