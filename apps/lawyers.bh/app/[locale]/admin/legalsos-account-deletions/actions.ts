'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/auth/admin-access';
import { sqlClient } from '@/lib/db/client';
import { createDeletionAdminStore } from '@/lib/legalsos-account-lifecycle/admin';
import { ClientAuthError } from '@/lib/client-auth/validation';

export async function settleDeletion(locale:string,form:FormData) {
  const language=locale==='ar'?'ar':'en';
  const path=`/${language}/admin/legalsos-account-deletions`;
  const admin=await requireSuperAdmin();
  if(!admin) redirect(`/${language}/admin`);
  if(process.env.LEGALSOS_DELETION_WORKFLOW_READY!=='1') redirect(`${path}?result=unavailable`);
  const id=form.get('lifecycleId'),requestId=form.get('requestId');
  if(form.get('confirmation')!=='reviewed'||typeof id!=='string'||typeof requestId!=='string') redirect(`${path}?result=invalid`);
  let result='settled';
  try { await createDeletionAdminStore(sqlClient).settle(id,requestId,admin.id); }
  catch(error) {result=error instanceof ClientAuthError&&error.code==='settlement_unresolved'?'unresolved':'failed';}
  revalidatePath(path);
  redirect(`${path}?result=${result}`);
}
