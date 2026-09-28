'use client';
import { useRef,useState } from 'react';

type Receipt={id:string;purgeAfter:string};
const endpoint='/api/legalsos/account-deletion';
async function send(body:Record<string,string>|null,proof?:string){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20_000);
  try{
    const response=await fetch(endpoint,{method:body?'POST':'GET',cache:'no-store',credentials:'omit',
      headers:body?{'Content-Type':'application/json'}:{'x-deletion-proof':proof??''},
      body:body?JSON.stringify(body):undefined,signal:controller.signal});
    const data=await response.json();
    if(!response.ok||data?.ok!==true)throw new Error(typeof data?.error==='string'?data.error:'unavailable');
    return data as Record<string,unknown>;
  }finally{clearTimeout(timer);}
}
export default function DeletionForm({ar,enabled}:{ar:boolean;enabled:boolean}){
  const t=(arabic:string,english:string)=>ar?arabic:english;
  const [role,setRole]=useState<'client'|'lawyer'>('client');
  const [identifier,setIdentifier]=useState(''),[password,setPassword]=useState('');
  const [proof,setProof]=useState<string|null>(null),[ack,setAck]=useState(false);
  const [receipt,setReceipt]=useState<Receipt|null>(null),[uncertain,setUncertain]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const inFlight=useRef(false);
  const button='rounded-xl bg-[#b88c3e] px-5 py-3 font-semibold text-white disabled:opacity-50';
  const field='mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3';
  function showError(e:unknown){
    const code=e instanceof Error?e.message:'';
    setError(code==='rate_limited'?t('محاولات كثيرة. حاول بعد 15 دقيقة.','Too many attempts. Try again in 15 minutes.'):
      code==='invalid_credentials'?t('تحقق من بيانات الحساب وكلمة المرور.','Check your account details and password.'):
      t('تعذر إكمال العملية. تحقق من الاتصال وحاول مجددًا.','The operation could not be completed. Check your connection and try again.'));
  }
  async function verify(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    const exactPassword=password;setPassword('');
    try{
      const data=await send({action:'verify',role,identifier,password:exactPassword});
      if(typeof data.proof!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(data.proof))throw new Error('invalid_response');
      setProof(data.proof);setIdentifier('');
    }catch(e){showError(e);}finally{inFlight.current=false;setBusy(false);}
  }
  async function confirm(recoverOnly=false){
    if(inFlight.current||!proof||(!recoverOnly&&!ack))return;inFlight.current=true;setBusy(true);setError('');
    try{
      const data=await send(recoverOnly?null:{action:'confirm',proof},proof);
      if(typeof data.id!=='string'||!/^[0-9a-f-]{36}$/i.test(data.id)||typeof data.purgeAfter!=='string'||
        !Number.isFinite(Date.parse(data.purgeAfter)))throw new Error('invalid_response');
      setReceipt({id:data.id,purgeAfter:data.purgeAfter});setProof(null);setUncertain(false);
    }catch(e){
      if(recoverOnly&&e instanceof Error&&e.message==='confirmation_not_received'){
        setUncertain(false);setError(t('لم يُنفّذ التأكيد بعد. يمكنك تأكيد الحذف الآن.','Confirmation has not been processed yet. You can confirm deletion now.'));
      }else{setUncertain(true);showError(e);}
    }finally{inFlight.current=false;setBusy(false);}
  }
  if(!enabled)return <p role="status">{t('خدمة حذف الحساب غير متاحة حاليًا. يرجى المحاولة لاحقًا.','Account deletion is currently unavailable. Please try again later.')}</p>;
  return <section aria-busy={busy} className="space-y-6 rounded-2xl border border-slate-300/50 p-6">
    <p>{t('يُغلق وصولك إلى النجدة القانونية فور تأكيد الحذف، وتُحذف بيانات حسابك بعد 30 يومًا.','Your LegalSOS access closes immediately after confirmation. Your account data is deleted after 30 days.')}</p>
    <p className="text-sm">{t('حذف حساب المحامي يخص التطبيق فقط؛ لا يحذف حسابه المهني المستقل في الموقع. ولا يؤدي طلب الحذف إلى إلغاء طلب أو استرداد مبلغ تلقائيًا.','Lawyer deletion applies only to the app, not the independent professional website account. Deletion does not automatically cancel a request or issue a refund.')}</p>
    {error?<p role="alert" className="text-red-600">{error}</p>:null}
    {receipt?<div role="status" className="space-y-3">
      <h2 className="text-xl font-bold">{t('تم استلام طلب الحذف','Deletion request received')}</h2>
      <p>{t('موعد الحذف:','Deletion date:')} <time dateTime={receipt.purgeAfter}>{new Intl.DateTimeFormat(ar?'ar-BH':'en-GB',{dateStyle:'long',timeZone:'Asia/Bahrain'}).format(new Date(receipt.purgeAfter))}</time></p>
      <p>{t('رقم التأكيد:','Confirmation reference:')} <bdi>{receipt.id}</bdi></p>
    </div>:proof?<div className="space-y-4">
      <h2 className="text-xl font-bold">{t('تأكيد حذف الحساب','Confirm account deletion')}</h2>
      {uncertain?<p role="status">{t('لم يصل تأكيد نهائي. تحقق من حالة الطلب قبل المحاولة من جديد.','Final confirmation was not received. Check the request status before trying again.')}</p>:null}
      <label className="flex items-start gap-3"><input type="checkbox" checked={ack} disabled={busy||uncertain} onChange={e=>setAck(e.target.checked)}/>
        {t('أفهم أن الوصول يُغلق فورًا وأؤكد رغبتي في الحذف.','I understand access closes immediately and confirm that I want to delete my account.')}</label>
      <div className="flex flex-wrap gap-3">
        {uncertain?<button className={button} disabled={busy} onClick={()=>confirm(true)}>{t('تحقق من حالة الطلب','Check request status')}</button>:
          <><button className={button} disabled={busy||!ack} onClick={()=>confirm()}>{t('تأكيد الحذف','Confirm deletion')}</button>
          <button className="rounded-xl border px-5 py-3" disabled={busy} onClick={()=>{setProof(null);setAck(false);setError('');}}>{t('إلغاء','Cancel')}</button></>}
      </div>
    </div>:<form onSubmit={verify} className="space-y-5">
      <label className="block">{t('نوع الحساب','Account type')}<select className={field} value={role} disabled={busy} onChange={e=>{setRole(e.target.value as 'client'|'lawyer');setIdentifier('');setPassword('');}}>
        <option value="client">{t('عميل','Client')}</option><option value="lawyer">{t('محامي','Lawyer')}</option></select></label>
      <label className="block">{role==='client'?t('البريد الإلكتروني','Email address'):t('رقم القيد','License number')}
        <input className={field} dir="ltr" type={role==='client'?'email':'text'} autoComplete="username" required maxLength={254} disabled={busy} value={identifier} onChange={e=>setIdentifier(e.target.value)}/></label>
      <label className="block">{t('كلمة المرور','Password')}<input className={field} dir="ltr" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button className={button} disabled={busy} type="submit">{busy?t('جاري التحقق…','Verifying…'):t('التحقق والمتابعة','Verify and continue')}</button>
    </form>}
  </section>;
}
