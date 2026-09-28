import Link from "next/link";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { requireAdminPermission } from "@/lib/auth/admin-access";
import { sqlClient } from "@/lib/db/client";
import AdminServerPagination from "../_components/AdminServerPagination";
import { paginateItems } from "../_components/pagination";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ page?: string }> };
type ClientRow = { id: string; full_name: string; email: string; phone: string; is_active: boolean };

export default async function AdminUsersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_requests"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);
  const ar = locale === "ar";
  const users = await sqlClient<ClientRow[]>`
    SELECT id::text, full_name, email, phone, is_active
    FROM mobile_client_accounts
    ORDER BY created_at DESC
    LIMIT 500
  `;
  const pagination = paginateItems(users, Number((await searchParams)?.page ?? 1));

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div><h1 className="text-3xl font-black text-[#082B67]">{ar ? "المستخدمون" : "Users"}</h1><p className="mt-1 text-slate-500">{ar ? "اختر المستخدم لعرض طلباته ومحادثاته فقط." : "Select a user to view only their requests and conversations."}</p></div>
        </div>
        <div className="space-y-3">
          {pagination.items.map((user) => (
            <Link key={user.id} href={`/${locale}/admin/users/${user.id}`} className="block rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-[#B4232A] focus-visible:border-[#B4232A]">
              <div className="flex items-center justify-between gap-4"><div><p className="font-black text-[#082B67]">{user.full_name}</p><p className="text-sm text-slate-500">{user.email} · {user.phone}</p></div><span className="text-sm font-bold text-slate-500">{user.is_active ? (ar ? "نشط" : "Active") : (ar ? "موقوف" : "Inactive")}</span></div>
            </Link>
          ))}
          {users.length === 0 && <p className="rounded-3xl bg-white p-6 text-slate-500">{ar ? "لا يوجد مستخدمون" : "No users found"}</p>}
        </div>
        <AdminServerPagination isAr={ar} pathname={`/${locale}/admin/users`} currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
      </div>
    </main>
  );
}
