import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import AccountActivitySections from "../../_components/AccountActivitySections";
import { getAdminClientDetail } from "@/lib/admin/account-detail";
import { requireAdminPermission } from "@/lib/auth/admin-access";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!(await requireAdminPermission("manage_requests"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);
  const detail = await getAdminClientDetail(id);
  if (!detail) notFound();
  const ar = locale === "ar";
  const account = detail.account as { full_name?: string; email?: string; phone?: string; is_active?: boolean };

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10" dir={ar ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href={`/${locale}/admin/users`} className="inline-flex rounded-xl border bg-white px-4 py-2 font-bold text-[#082B67]">{ar ? "العودة للمستخدمين" : "Back to users"}</Link>
        <section className="rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-6 shadow-sm">
          <h1 className="text-3xl font-black text-[#082B67]">{account.full_name || (ar ? "مستخدم" : "User")}</h1>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3"><p>{account.email || "—"}</p><p>{account.phone || "—"}</p><p>{account.is_active ? (ar ? "حساب نشط" : "Active account") : (ar ? "حساب موقوف" : "Inactive account")}</p></div>
        </section>
        <AccountActivitySections locale={locale} conversations={detail.conversations} requests={detail.requests} />
      </div>
    </main>
  );
}
