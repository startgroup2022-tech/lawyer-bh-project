import {
  ClipboardCheck,
  FileText,
  UserCog,
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  MessageSquare,
  Search,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { getCurrentAdmin } from "@/lib/auth/admin-access";
import { hasAdminPermission, type AdminPermission } from "@/lib/auth/admin-permissions";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};


function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[#E6EAF0] bg-white p-4 text-[#082B67] shadow-[0_10px_28px_rgba(7,17,31,0.035)]">
      <p className="text-xs font-extrabold opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isAr = locale === "ar";
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/${locale}/join`);

  const allCards: Array<{
    title: string; description: string; href: string; icon: typeof Tag; category: string; permission?: AdminPermission; superOnly?: boolean;
  }> = [
    {
      title: isAr ? "إدارة الأدمن والصلاحيات" : "Admins & Permissions",
      description: isAr ? "إضافة الأدمن والتحكم الدقيق في صلاحيات كل حساب." : "Add admins and control each account's permissions.",
      href: "/admin/admin-users", icon: ShieldCheck, category: "account", superOnly: true,
    },
    {
      title: isAr ? "أكواد الخصم" : "Discount Codes",
      description: isAr ? "إنشاء الخصومات وإدارة صلاحيتها وحدود استخدامها." : "Create discounts and manage validity and usage limits.",
      href: "/admin/discount-codes",
      icon: Tag,
      category: "operations",
      permission: "manage_discounts",
    },
    {
      title: isAr ? "الموافقات" : "Approvals",
      description: isAr
        ? "مراجعة طلبات انضمام المحامين ومقدمي الخدمات."
        : "Review provider and lawyer join applications.",
      href: "/admin/approvals",
      icon: ClipboardCheck,
      category: "operations",
      permission: "manage_approvals",
    },
    {
      title: isAr ? "الطلبات" : "Requests",
      description: isAr
        ? "متابعة طلبات العملاء والخدمات القانونية."
        : "View client legal service requests.",
      href: "/admin/requests",
      icon: FileText,
      category: "operations",
      permission: "manage_requests",
    },
    {
      title: isAr ? "الحساب" : "accounts",
      description: isAr
        ? "متابعة طلبات العملاء والخدمات القانونية."
        : "View client legal service requests.",
      href: "/admin/accounts",
      icon: FileText,
      category: "operations",
      permission: "manage_finance",
    },
    {
      title: isAr ? "التقييمات والتعليقات" : "Reviews & Comments",
      description: isAr
        ? "إدارة تعليقات العملاء وإخفاء التعليقات المسيئة أو غير المناسبة."
        : "Manage client reviews and hide abusive or inappropriate comments.",
      href: "/admin/reviews",
      icon: MessageSquare,
      category: "operations",
      permission: "manage_reviews",
    },
    {
      title: isAr ? "إضافة محامي" : "Add Lawyer",
      description: isAr
        ? "إضافة محامي بالمعلومات الأساسية وإرسال رابط إكمال البيانات."
        : "Add a lawyer with basic details and send a completion link.",
      href: "/admin/lawyers/new",
      icon: UserPlus,
      category: "providers",
      permission: "manage_lawyers",
    },
    {
      title: isAr ? "تعديل البروفايل" : "Edit Profile",
      description: isAr
        ? "تعديل بيانات حساب الأدمن وكلمة المرور."
        : "Update admin account details and password.",
      href: "/admin/profile",
      icon: UserCog,
      category: "account",
    },
  ];
  const cards = allCards.filter((card) =>
    card.superOnly ? admin.role === "super_admin" : !card.permission || hasAdminPermission(admin, card.permission),
  );

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "رجوع للموقع" : "Back to Website"}
          </Link>

          <AdminLogoutButton />
        </div>

        <div className="mb-8 rounded-3xl bg-[#006C32] p-7 text-white shadow-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <LayoutDashboard className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {isAr ? "لوحة تحكم الأدمن" : "Admin Dashboard"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
            {isAr
              ? "من هنا يمكنك إدارة الموافقات، طلبات العملاء، التقييمات، وبيانات حساب الأدمن."
              : "Manage approvals, client requests, reviews, and admin profile settings from one place."}
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={isAr ? "إجمالي الصفحات" : "Total Pages"} value={cards.length} />
          <StatCard label={isAr ? "الإدارة والمتابعة" : "Operations"} value={cards.filter((card) => card.category === "operations").length} />
          <StatCard label={isAr ? "مقدمو الخدمات" : "Providers"} value={cards.filter((card) => card.category === "providers").length} />
          <StatCard label={isAr ? "الحساب" : "Account"} value={cards.filter((card) => card.category === "account").length} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2" data-admin-dashboard-filters>
          {[
            { key: "all", ar: "الكل", en: "All" },
            { key: "operations", ar: "الإدارة والمتابعة", en: "Operations" },
            { key: "providers", ar: "مقدمو الخدمات", en: "Providers" },
            { key: "account", ar: "الحساب", en: "Account" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              data-dashboard-filter={item.key}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                item.key === "all"
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 bg-white text-text-muted hover:text-text-primary"
              }`}
            >
              {isAr ? item.ar : item.en}
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              data-dashboard-search
              placeholder={
                isAr
                  ? "بحث في صفحات لوحة التحكم..."
                  : "Search admin pages..."
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pe-4 ps-10 text-sm font-bold text-text-primary outline-none transition focus:border-primary"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                data-dashboard-card
                data-category={card.category}
                data-search={`${card.title} ${card.description}`.toLowerCase()}
                className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(7,17,31,0.06)] transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_70px_rgba(7,17,31,0.10)]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="text-lg font-extrabold text-text-primary">
                  {card.title}
                </h2>

                <p className="mt-2 min-h-[56px] text-sm leading-7 text-text-muted">
                  {card.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary">
                  {isAr ? "فتح الصفحة" : "Open page"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>


        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const root = document.currentScript?.closest('main');
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll('[data-dashboard-filter]'));
  const input = root.querySelector('[data-dashboard-search]');
  const cards = Array.from(root.querySelectorAll('[data-dashboard-card]'));
  let activeFilter = 'all';

  function setActiveButton() {
    buttons.forEach((button) => {
      const isActive = button.getAttribute('data-dashboard-filter') === activeFilter;
      button.className = isActive
        ? 'rounded-full border border-primary bg-primary px-4 py-2 text-sm font-bold text-white transition'
        : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-text-muted transition hover:text-text-primary';
    });
  }

  function applyFilters() {
    const query = String(input?.value || '').trim().toLowerCase();

    cards.forEach((card) => {
      const category = card.getAttribute('data-category') || '';
      const text = card.getAttribute('data-search') || '';
      const visible = (activeFilter === 'all' || category === activeFilter) && (!query || text.includes(query));
      card.style.display = visible ? '' : 'none';
    });
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.getAttribute('data-dashboard-filter') || 'all';
      setActiveButton();
      applyFilters();
    });
  });

  input?.addEventListener('input', applyFilters);
})();
            `.trim(),
          }}
        />
      </div>
    </main>
  );
}
