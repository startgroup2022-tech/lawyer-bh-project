import {
  ClipboardCheck,
  FileText,
  UserCog,
  LayoutDashboard,
  ArrowRight,
  UserPlus,
  MessageSquare,
  Search,
  Tag,
  ShieldCheck,
  BellRing,
  Globe,
  FileSpreadsheet,
  WalletCards,
  HelpCircle,
  Siren,
  BadgeDollarSign,
  ScrollText,
  Percent,
  BriefcaseBusiness,
  ShieldAlert,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCurrentAdmin } from "@/lib/auth/admin-access";
import { hasAdminPermission, type AdminPermission } from "@/lib/auth/admin-permissions";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};


function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-4 text-[#082B67] shadow-[0_10px_28px_rgba(7,17,31,0.035)]">
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
  if (!admin) redirect(`/${locale}/login/admin`);

  const allCards: Array<{
    title: string; description: string; href: string; icon: typeof Tag; category: string; permission?: AdminPermission; superOnly?: boolean;
  }> = [
    {
      title: isAr ? "بلاغات وسلامة المحادثة" : "Chat Reports & Safety",
      description: isAr ? "مراجعة البلاغات والتحذير وتعطيل المحادثة أو الحساب." : "Review reports, warn users, and suspend chat or accounts.",
      href: "/admin/moderation", icon: ShieldAlert, category: "operations", permission: "manage_moderation",
    },
    {
      title: isAr ? "طلبات التدريب" : "Training Applications",
      description: isAr ? "مراجعة طلبات التدريب والمرفقات ومتابعة الحالات والأرشيف." : "Review training applications, attachments, statuses and archive.",
      href: "/admin/training", icon: ClipboardCheck, category: "operations", permission: "manage_training",
    },
    {
      title: isAr ? "إدارة الوظائف" : "Careers Management",
      description: isAr ? "إضافة وتحرير ونشر وإغلاق وأرشفة الوظائف." : "Create, edit, publish, close and archive job openings.",
      href: "/admin/careers", icon: BriefcaseBusiness, category: "operations", permission: "manage_careers",
    },
    {
      title: isAr ? "المتقدمون للوظائف" : "Job Applicants",
      description: isAr ? "مراجعة طلبات التوظيف والسير الذاتية ومتابعة الحالات." : "Review applications, private CVs and recruitment progress.",
      href: "/admin/careers/applications", icon: ClipboardCheck, category: "operations", permission: "manage_careers",
    },
    {
      title: isAr ? "أنواع حالات النجدة القانونية" : "Legal SOS Case Types",
      description: isAr ? "إدارة الحالات والأسعار والأيقونات ومسار تنفيذ الطلب." : "Manage SOS cases, prices, icons, and workflows.",
      href: "/admin/sos-case-types", icon: Siren, category: "operations", permission: "manage_approvals",
    },
    {
      title: isAr ? "طلبات حذف الحساب (النجدة القانونية)" : "Account deletions (LegalSOS)",
      description: isAr ? "متابعة مواعيد الحذف ومراجعة تسويات الطلبات والمدفوعات." : "Track deletion deadlines and review request and payment settlements.",
      href: "/admin/legalsos-account-deletions", icon: UserCog, category: "operations", superOnly: true,
    },
    {
      title: isAr ? "إدارة الدول" : "Country management",
      description: isAr ? "تفعيل الدول للتطبيق والموقع ورفع الخلفيات." : "Manage app and website countries and backgrounds.",
      href: "/admin/countries", icon: Globe, category: "operations", superOnly: true,
    },
    {
      title: isAr ? "إدارة اللغات" : "Language management",
      description: isAr ? "إدارة كتالوج اللغات لبيانات الدول فقط؛ النشر لا ينشئ واجهة عامة." : "Manage the language catalogue for country data only; publishing does not create a public interface.",
      href: "/admin/languages", icon: Globe, category: "operations", superOnly: true,
    },
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
      title: isAr ? "المستخدمون" : "Users",
      description: isAr
        ? "عرض كل مستخدم مع طلباته ومحادثاته المرتبطة بحسابه."
        : "View each user with requests and conversations linked to their account.",
      href: "/admin/users",
      icon: UserCog,
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
      title: isAr ? "إشعارات التطبيق" : "App Notifications",
      description: isAr
        ? "إرسال إشعارات للأعضاء والمحامين حسب الفئة والحالة."
        : "Send targeted notifications to members and lawyers.",
      href: "/admin/mobile-notifications",
      icon: BellRing,
      category: "operations",
      permission: "manage_notifications",
    },
    {
      title: isAr ? "إدارة الأسئلة الشائعة" : "FAQ Management",
      description: isAr ? "إضافة وتصنيف ونشر وترتيب الأسئلة باللغتين." : "Create, categorize, publish, and order bilingual FAQs.",
      href: "/admin/faq", icon: HelpCircle, category: "operations", permission: "manage_faq",
    },
    {
      title: isAr ? "إدارة صفحة من نحن" : "About Page Management",
      description: isAr ? "إضافة وتعديل وترتيب وأرشفة أقسام وأعضاء الفريق." : "Create, edit, order, and archive team sections and members.",
      href: "/admin/about", icon: UserCog, category: "operations", permission: "manage_about",
    },
    {
      title: isAr ? "أنواع الاستشارة والأسعار" : "Consultation Types & Prices",
      description: isAr ? "إضافة وتعديل وأرشفة أنواع الاستشارة وأسعارها." : "Create, edit, and archive consultation methods and prices.",
      href: "/admin/consultation-types", icon: BadgeDollarSign, category: "operations", permission: "manage_consultation_types",
    },
    {
      title: isAr ? "السياسات العامة" : "Public Policies",
      description: isAr ? "إدارة الشروط والخصوصية والإلغاء والاسترداد باللغتين." : "Manage bilingual terms, privacy and cancellation/refund policies.",
      href: "/admin/terms", icon: ScrollText, category: "operations", permission: "manage_terms_commissions",
    },
    {
      title: isAr ? "الشروط والأحكام (النجدة القانونية)" : "Terms & Conditions (LegalSOS)",
      description: isAr ? "تعديل ونشر شروط التطبيق بالعربية والإنجليزية." : "Edit and publish bilingual app terms.",
      href: "/admin/legalsos-legal/terms", icon: ScrollText, category: "operations", permission: "manage_terms_commissions",
    },
    {
      title: isAr ? "سياسة الخصوصية (النجدة القانونية)" : "Privacy Policy (LegalSOS)",
      description: isAr ? "تعديل ونشر سياسة خصوصية التطبيق." : "Edit and publish the app privacy policy.",
      href: "/admin/legalsos-legal/privacy", icon: FileText, category: "operations", permission: "manage_terms_commissions",
    },
    {
      title: isAr ? "شروط تسجيل المحامين" : "Lawyer Registration Terms",
      description: isAr ? "إدارة شروط التسجيل ونسب المنصة الافتراضية." : "Manage registration terms and default platform percentages.",
      href: "/admin/lawyer-terms", icon: FileText, category: "operations", permission: "manage_terms_commissions",
    },
    {
      title: isAr ? "اتفاقية المحامي — PDF" : "Provider Agreement — PDF",
      description: isAr ? "تحرير الاتفاقية ومعاينة التوقيع التجريبي وإدارة النسخ." : "Edit agreement versions and preview a test signature.",
      href: "/admin/provider-agreement", icon: FileText, category: "operations", permission: "manage_terms_commissions",
    },
    {
      title: isAr ? "نسب المحامين" : "Lawyer Commissions",
      description: isAr ? "عرض وتخصيص نسبة المحامي ونسبة المنصة." : "View and customize lawyer and platform shares.",
      href: "/admin/lawyer-commissions", icon: Percent, category: "operations", permission: "manage_terms_commissions",
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
      title: isAr ? "رفع المحامين" : "Import Lawyers",
      description: isAr
        ? "رفع ملف Excel وإرسال دعوات إكمال الملف مع تقرير تفصيلي."
        : "Upload an Excel file, send completion invites, and review row results.",
      href: "/admin/lawyers/import",
      icon: FileSpreadsheet,
      category: "providers",
      permission: "manage_lawyers",
    },
    {
      title: isAr ? "الأرصدة وروابط الدفع" : "Balances & Payment Links",
      description: isAr
        ? "إدارة الأرصدة وإنشاء الروابط وعرض سجل دفع كل محامي."
        : "Manage balances, create links, and view each lawyer's payment history.",
      href: "/admin/provider-balances",
      icon: WalletCards,
      category: "operations",
      permission: "manage_finance",
    },
    {
      title: isAr ? "المحامون" : "Lawyers",
      description: isAr
        ? "عرض كل محامي مع طلباته ومحادثاته المسندة إليه."
        : "View each lawyer with requests and conversations assigned to them.",
      href: "/admin/lawyers",
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
        <div className="mb-8 rounded-3xl bg-[#B4232A] p-7 text-white shadow-xl">
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

        <div className="mb-6 rounded-2xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-3 shadow-sm">
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
                className="group rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-6 shadow-[0_18px_50px_rgba(7,17,31,0.06)] transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_70px_rgba(7,17,31,0.10)]"
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
