import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import DeletionForm from './DeletionForm';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(!['ar','en'].includes(locale))notFound();setRequestLocale(locale);
  const ar=locale==='ar';
  return <main dir={ar?'rtl':'ltr'} className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <p>{ar?'النجدة القانونية':'LegalSOS'}</p>
    <h1 className="text-3xl font-bold">{ar?'حذف حساب التطبيق':'Delete your app account'}</h1>
    <DeletionForm ar={ar} enabled={process.env.LEGALSOS_DELETION_WORKFLOW_READY==='1'}/>
    <nav className="flex flex-wrap gap-6 text-sm" aria-label={ar?'روابط':'Links'}>
      <a href={`/${locale}/legalsos/legal/privacy`}>{ar?'سياسة الخصوصية':'Privacy policy'}</a>
      <a href={`/${ar?'en':'ar'}/legalsos/delete-account`}>{ar?'English':'العربية'}</a>
    </nav>
  </main>;
}
