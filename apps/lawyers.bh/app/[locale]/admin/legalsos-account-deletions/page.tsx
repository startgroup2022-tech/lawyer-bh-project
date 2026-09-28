import React from 'react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { requireSuperAdmin } from '@/lib/auth/admin-access';
import { sqlClient } from '@/lib/db/client';
import { createDeletionAdminStore,type DeletionQueueItem } from '@/lib/legalsos-account-lifecycle/admin';
import { settleDeletion } from './actions';

export const dynamic='force-dynamic';
const statusAr:Record<string,string>={pending:'معلّق',pending_deletion:'بانتظار الحذف',purging:'جاري التنظيف',
  completed:'مكتمل',cancelled:'ملغي',in_progress:'قيد التنفيذ',mobilizing:'في الطريق',arrived:'تم الوصول',
  disputed:'قيد المراجعة',success:'مدفوع',failed:'فشل',refunded:'مسترد',none:'لا يوجد',settled:'تمت المراجعة'};

export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {locale}=await params;setRequestLocale(locale);
  const ar=locale==='ar',language=ar?'ar':'en',t=(a:string,e:string)=>ar?a:e;
  if(!await requireSuperAdmin()) redirect(`/${language}/admin`);
  const query=await searchParams;
  const rawPage=Number(query.page??1),page=Number.isInteger(rawPage)&&rawPage>=1&&rawPage<=501?rawPage:1;
  const enabled=process.env.LEGALSOS_DELETION_WORKFLOW_READY==='1';
  let items:DeletionQueueItem[]=[],failed=false;
  if(enabled) {try {items=await createDeletionAdminStore(sqlClient).list(20,(page-1)*20);} catch {failed=true;}}
  const status=(value:string)=>ar?(statusAr[value]??'قيد المراجعة'):value.replaceAll('_',' ');
  const date=(value:string)=>new Intl.DateTimeFormat(ar?'ar-BH':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bahrain'}).format(new Date(value));
  const notice=query.result==='settled'?t('تم تسجيل مراجعة التسوية. لم يتغير موعد الحذف.','Settlement review recorded. The deletion deadline is unchanged.'):
    query.result?t('تعذر تأكيد المراجعة. تحقق من حالة الطلب والمدفوعات ثم أعد المحاولة.','Review could not be confirmed. Check the request and payments, then retry.'):null;
  return <main dir={ar?'rtl':'ltr'} className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
    <header className="rounded-3xl bg-[#B4232A] p-6 text-white">
      <h1 className="text-2xl font-bold">{t('طلبات حذف الحساب (النجدة القانونية)','Account deletions (LegalSOS)')}</h1>
      <p className="mt-3 text-sm">{t('مراجعة التسويات لا تسترد مبالغ ولا تلغي طلبات ولا تمدد مدة الاحتفاظ.','Review does not refund payments, cancel requests, or extend retention.')}</p>
    </header>
    {notice?<p role="status" className="rounded-xl bg-slate-100 p-4">{notice}</p>:null}
    {!enabled?<p role="status" className="rounded-2xl bg-amber-50 p-5">{t('المسار غير مفعّل — التحضير والاختبارات لم تكتمل بعد.','Workflow disabled — preparation and testing are not complete.')}</p>:
      failed?<p role="alert" className="rounded-2xl bg-red-50 p-5">{t('تعذر تحميل الطلبات. أعد تحميل الصفحة.','Could not load requests. Reload the page.')}</p>:
      items.length===0?<p className="rounded-2xl border bg-white p-6">{t('لا توجد طلبات حذف معلّقة','No pending account deletions')}</p>:
      items.map(item=><section key={item.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{item.subjectRole==='client'?t('حساب عميل','Client account'):t('حساب محامي','Lawyer account')}</h2>
          <span className={item.overdue?'rounded-full bg-red-100 px-3 py-1 text-red-800':'rounded-full bg-slate-100 px-3 py-1'}>{item.overdue?t('متأخر — يتطلب متابعة','Overdue — follow-up required'):status(item.state)}</span>
        </div>
        <p className="break-all text-xs text-slate-500" dir="ltr">{item.id}</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">{t('تاريخ الطلب','Requested')}</dt><dd>{date(item.requestedAt)}</dd></div>
          <div><dt className="text-slate-500">{t('موعد الحذف · توقيت البحرين','Deletion deadline · Bahrain time')}</dt><dd>{date(item.purgeAfter)}</dd></div>
          <div><dt className="text-slate-500">{t('تسويات بانتظار المراجعة','Reviews pending')}</dt><dd>{item.pendingSettlements}</dd></div>
        </dl>
        {item.requests.length===0?<p className="text-sm text-slate-500">{t('لا توجد تسويات مرتبطة','No linked settlements')}</p>:item.requests.map(request=>{
          const canReview=item.state==='pending_deletion'&&request.state==='pending'&&['completed','cancelled'].includes(request.serviceStatus)&&['success','failed','refunded'].includes(request.paymentStatus)&&['none','completed'].includes(request.refundStatus);
          return <article key={request.requestId} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold" dir="ltr">{request.caseRef}</h3>
            <div className="flex flex-wrap gap-4 text-sm"><span>{t('الخدمة: ','Service: ')}{status(request.serviceStatus)}</span><span>{t('الدفع: ','Payment: ')}{status(request.paymentStatus)}</span><span>{t('الاسترداد: ','Refund: ')}{status(request.refundStatus)}</span><span>{request.amountBhd} {t('د.ب','BHD')}</span></div>
            {request.chargeId?<p className="break-all text-xs text-slate-500">{t('مرجع الدفع: ','Payment reference: ')}<bdi>{request.chargeId}</bdi></p>:null}
            {canReview?<form action={settleDeletion.bind(null,language)} className="space-y-3 border-t pt-3">
              <input type="hidden" name="lifecycleId" value={item.id}/><input type="hidden" name="requestId" value={request.requestId}/>
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" name="confirmation" value="reviewed" required/>{t('راجعت الخدمة والمدفوعات وأؤكد انتهاء التسوية المطلوبة لهذا الطلب.','I reviewed the service and payments and confirm the required settlement is complete.')}</label>
              <button type="submit" className="rounded-xl bg-[#B4232A] px-4 py-2 font-bold text-white">{t('تأكيد مراجعة التسوية','Confirm settlement review')}</button>
            </form>:<p className="text-sm text-slate-600">{request.state==='settled'?t('تمت مراجعة التسوية','Settlement reviewed'):t('أكمل معالجة الطلب أو المدفوعات قبل تأكيد المراجعة.','Resolve the service or payments before confirming review.')}</p>}
          </article>;
        })}
      </section>)}
    {enabled&&!failed?<nav aria-label={t('صفحات الطلبات','Queue pages')} className="flex justify-between gap-4">
      {page>1?<a className="rounded-xl border px-4 py-2" href={`?page=${page-1}`}>{t('السابق','Previous')}</a>:<span/>}
      {items.length===20&&page<501?<a className="rounded-xl border px-4 py-2" href={`?page=${page+1}`}>{t('التالي','Next')}</a>:null}
    </nav>:null}
  </main>;
}
