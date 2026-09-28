import Link from "next/link";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { requireAdminPermission } from "@/lib/auth/admin-access";
import { sqlClient } from "@/lib/db/client";
import AdminServerPagination from "../_components/AdminServerPagination";
import { paginateItems } from "../_components/pagination";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ page?: string }> };
type LawyerRow = { id: string; full_name_ar: string; full_name_en: string; email: string; status: string; country_code: string };

export default async function AdminLawyersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_lawyers")) || !(await requireAdminPermission("manage_requests"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);
  const ar = locale === "ar";
  const lawyers = await sqlClient<LawyerRow[]>`
    SELECT id::text, full_name_ar, full_name_en, email, status, country_code
    FROM bahrain_lawyers
    ORDER BY created_at DESC
    LIMIT 500
  `;
  const pagination = paginateItems(lawyers, Number((await searchParams)?.page ?? 1));

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6"><h1 className="text-3xl font-black text-[#082B67]">{ar ? "المحامون" : "Lawyers"}</h1><p className="mt-1 text-slate-500">{ar ? "اختر المحامي لعرض طلباته ومحادثاته فقط." : "Select a lawyer to view only their requests and conversations."}</p></div>
        <div className="space-y-3">
          {pagination.items.map((lawyer) => <Link key={lawyer.id} href={`/${locale}/admin/lawyers/${lawyer.id}`} className="block rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-[#B4232A] focus-visible:border-[#B4232A]"><div className="flex items-center justify-between gap-4"><div><p className="font-black text-[#082B67]">{(ar ? lawyer.full_name_ar : lawyer.full_name_en) || lawyer.full_name_ar || lawyer.full_name_en}</p><p className="text-sm text-slate-500">{lawyer.email} · {lawyer.country_code}</p></div><span className="text-sm font-bold text-slate-500">{lawyer.status}</span></div></Link>)}
          {lawyers.length === 0 && <p className="rounded-3xl bg-white p-6 text-slate-500">{ar ? "لا يوجد محامون" : "No lawyers found"}</p>}
        </div>
        <AdminServerPagination isAr={ar} pathname={`/${locale}/admin/lawyers`} currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
      </div>
    </main>
  );
}
