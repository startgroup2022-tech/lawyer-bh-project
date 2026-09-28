import {
  Building2,
  House,
  FileText,
  Bell,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Plus,
  ChevronRight,
  TrendingUp,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function OwnerDashboard({
  params,
}: Props) {
  const { locale } = await params;

  const t = await getTranslations({ locale });

  const isAr = locale === "ar";

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      {/* =====================================================
          DASHBOARD CONTENT
      ===================================================== */}

      <main className="p-4 sm:p-6 lg:p-10">

        {/* ===================================================
            WELCOME HEADER
        =================================================== */}

        <section
          className="
            relative
            mb-7
            overflow-hidden
            rounded-3xl
            border
            border-[#EAEAEC]
            bg-white
            px-6
            py-7
            shadow-[0_8px_30px_rgba(31,41,55,0.04)]
            sm:px-8
            sm:py-8
          "
        >

          {/* Decorative glow */}

          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-24
              h-64
              w-64
              rounded-full
              bg-[#03C39A]/10
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-24
              left-1/3
              h-48
              w-48
              rounded-full
              bg-[#2BD6AF]/5
              blur-3xl
            "
          />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>

              <div className="flex items-center gap-2">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#EAFBF6]
                    text-primary
                  "
                >
                  <Building2 size={18} />
                </div>

                <span className="text-xs font-bold text-primary">
                  {t("owner.title")}
                </span>

              </div>

              <h1
                className="
                  mt-4
                  text-2xl
                  font-extrabold
                  tracking-tight
                  text-text-primary
                  sm:text-3xl
                "
              >
                {t("owner.welcome")}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
                {isAr
                  ? "تابع عقاراتك ووحداتك وعقود الإيجار وكل ما يحتاج إلى إجراء منك."
                  : "Manage your properties, units, rental contracts and everything that needs your attention."}
              </p>

            </div>

            {/* Create contract */}

            <a
              href="/owner/contracts/create"
              className="
                group
                inline-flex
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-primary
                px-5
                py-3
                text-sm
                font-bold
                text-white
                shadow-[0_8px_20px_rgba(3,195,154,0.18)]
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-primary-dark
                hover:shadow-[0_14px_30px_rgba(3,195,154,0.24)]
              "
            >
              <Plus
                size={17}
                className="
                  transition-transform
                  duration-300
                  group-hover:rotate-90
                "
              />

              {t("owner.createContract")}
            </a>

          </div>
        </section>


        {/* ===================================================
            STATISTICS
        =================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            icon={Building2}
            label={t("owner.stats.properties")}
            value="#"
            subtitle={
              isAr
                ? "عقارات مسجلة"
                : "Registered properties"
            }
          />

          <StatCard
            icon={House}
            label={t("owner.stats.units")}
            value="#"
            subtitle={
              isAr
                ? "وحدة عقارية"
                : "Property units"
            }
          />

          <StatCard
            icon={FileText}
            label={t("owner.stats.activeContracts")}
            value="#"
            subtitle={
              isAr
                ? "عقد نشط"
                : "Active contracts"
            }
          />

          <StatCard
            icon={Bell}
            label={t("owner.stats.pending")}
            value="#"
            subtitle={
              isAr
                ? "تحتاج إلى إجراء"
                : "Need your action"
            }
            alert
          />

        </div>


        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">


          {/* =================================================
              RECENT CONTRACTS
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-3xl
              border
              border-[#EAEAEC]
              bg-white
              shadow-[0_6px_25px_rgba(31,41,55,0.035)]
            "
          >

            {/* Header */}

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-[#EAEAEC]
                px-6
                py-5
              "
            >

              <div>

                <div className="flex items-center gap-2">

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#EAFBF6]
                      text-primary
                    "
                  >
                    <FileText size={16} />
                  </div>

                  <h2 className="text-sm font-extrabold text-text-primary">
                    {t("owner.recentContracts")}
                  </h2>

                </div>

                <p className="mt-2 text-xs text-text-muted">
                  {t("owner.recentContractsDesc")}
                </p>

              </div>

              <a
                href="/owner/contracts"
                className="
                  group
                  flex
                  items-center
                  gap-1
                  text-xs
                  font-bold
                  text-primary
                  transition-colors
                  hover:text-primary-dark
                "
              >
                {t("owner.viewAll")}

                <Arrow
                  size={14}
                  className="
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                    rtl:group-hover:-translate-x-1
                  "
                />
              </a>

            </div>


            {/* Contract rows */}

            <div className="space-y-3 p-5">

              <ContractRow
                name="أحمد محمد"
                property="Seef Tower"
                status="pending"
                date={
                  isAr
                    ? "تم الإرسال اليوم"
                    : "Submitted today"
                }
                t={t}
              />

              <ContractRow
                name="محمد علي"
                property="Juffair Residence"
                status="approved"
                date={
                  isAr
                    ? "تم الاعتماد أمس"
                    : "Approved yesterday"
                }
                t={t}
              />

              <ContractRow
                name="Sara Ahmed"
                property="Amwaj Villa"
                status="expiring"
                date={
                  isAr
                    ? "ينتهي خلال 18 يوماً"
                    : "Expires in 18 days"
                }
                t={t}
              />

            </div>

          </section>


          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-3xl
              border
              border-[#EAEAEC]
              bg-white
              shadow-[0_6px_25px_rgba(31,41,55,0.035)]
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-[#EAEAEC]
                px-6
                py-5
              "
            >

              <div>

                <div className="flex items-center gap-2">

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#EAFBF6]
                      text-primary
                    "
                  >
                    <Bell size={16} />
                  </div>

                  <h2 className="text-sm font-extrabold text-text-primary">
                    {t("owner.nav.notifications")}
                  </h2>

                </div>

                <p className="mt-2 text-xs text-text-muted">
                  {isAr
                    ? "آخر التحديثات والتنبيهات"
                    : "Your latest updates and alerts"}
                </p>

              </div>

              <div
                className="
                  flex
                  h-8
                  min-w-8
                  items-center
                  justify-center
                  rounded-full
                  bg-[#EAFBF6]
                  px-2
                  text-xs
                  font-extrabold
                  text-primary
                "
              >
                3
              </div>

            </div>


            <div className="p-5">

              <div className="relative space-y-5">

                {/* Timeline */}

                <div
                  className="
                    absolute
                    bottom-5
                    top-5
                    w-px
                    bg-[#EAEAEC]
                    ltr:left-[17px]
                    rtl:right-[17px]
                  "
                />

                <Notification
                  icon={FileText}
                  title={t("owner.notification.newContract")}
                  time={
                    isAr
                      ? "منذ 10 دقائق"
                      : "10 minutes ago"
                  }
                  active
                />

                <Notification
                  icon={Clock3}
                  title={t("owner.notification.expiring")}
                  time={
                    isAr
                      ? "منذ ساعتين"
                      : "2 hours ago"
                  }
                />

                <Notification
                  icon={CheckCircle2}
                  title={t("owner.notification.approved")}
                  time={
                    isAr
                      ? "أمس"
                      : "Yesterday"
                  }
                />

              </div>

            </div>

          </section>

        </div>


        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <section className="mt-7">

          <div className="flex items-end justify-between">

            <div>

              <h2 className="text-base font-extrabold text-text-primary">
                {t("owner.quickActions")}
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                {isAr
                  ? "الوصول السريع إلى أهم خدمات إدارة العقارات."
                  : "Quick access to your most important property tools."}
              </p>

            </div>

          </div>


          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <QuickAction
              href="/owner/properties"
              icon={Building2}
              title={t("owner.nav.properties")}
              description={
                isAr
                  ? "إدارة عقاراتك"
                  : "Manage properties"
              }
            />

            <QuickAction
              href="/owner/units"
              icon={House}
              title={t("owner.nav.units")}
              description={
                isAr
                  ? "متابعة الوحدات"
                  : "Manage units"
              }
            />

            <QuickAction
              href="/owner/contracts"
              icon={FileText}
              title={t("owner.nav.contracts")}
              description={
                isAr
                  ? "إدارة العقود"
                  : "Manage contracts"
              }
            />

            <QuickAction
              href="/owner/contracts/create"
              icon={Plus}
              title={t("owner.createContract")}
              description={
                isAr
                  ? "إنشاء عقد جديد"
                  : "Create a contract"
              }
              primary
            />

          </div>

        </section>


        {/* ===================================================
            SECURITY FOOTER
        =================================================== */}

        <div
          className="
            mt-7
            flex
            flex-col
            items-center
            justify-between
            gap-3
            rounded-2xl
            border
            border-[#EAEAEC]
            bg-white
            px-5
            py-4
            sm:flex-row
          "
        >

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-[#EAFBF6]
                text-primary
              "
            >
              <ShieldCheck size={18} />
            </div>

            <div>

              <div className="text-xs font-bold text-text-primary">
                {isAr
                  ? "بياناتك محمية وآمنة"
                  : "Your data is protected"}
              </div>

              <div className="mt-0.5 text-[10px] text-text-muted">
                {isAr
                  ? "إدارة آمنة لعقاراتك وعقودك"
                  : "Secure management of your properties and contracts"}
              </div>

            </div>

          </div>

          <div className="flex items-center gap-2 text-[10px] font-semibold text-text-muted">

            <span className="h-2 w-2 rounded-full bg-primary" />

            {isAr
              ? "النظام يعمل بشكل طبيعي"
              : "All systems operational"}

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  alert = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#EAEAEC]
        bg-white
        p-5
        shadow-[0_5px_20px_rgba(31,41,55,0.025)]
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_12px_30px_rgba(3,195,154,0.08)]
      "
    >

      {/* Decorative corner */}

      <div
        className="
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-24
          w-24
          rounded-full
          bg-primary/5
          blur-2xl
          transition-transform
          duration-500
          group-hover:scale-150
        "
      />

      <div className="relative z-10 flex items-center justify-between">

        <div
          className={`
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            transition-all
            duration-300
            ${
              alert
                ? "bg-amber-50 text-amber-500"
                : "bg-[#EAFBF6] text-primary"
            }
            group-hover:scale-105
          `}
        >
          <Icon size={20} strokeWidth={1.7} />
        </div>

        {alert ? (
          <div
            className="
              flex
              items-center
              gap-1.5
              rounded-full
              bg-amber-50
              px-2.5
              py-1
              text-[9px]
              font-bold
              text-amber-600
            "
          >
            <AlertCircle size={12} />
            Action
          </div>
        ) : (
          <TrendingUp
            size={16}
            className="text-primary/40"
          />
        )}

      </div>

      <div className="relative z-10 mt-5">

        <div
          className="
            text-3xl
            font-extrabold
            tracking-tight
            text-text-primary
          "
        >
          {value}
        </div>

        <div className="mt-1 text-xs font-bold text-text-secondary">
          {label}
        </div>

        <div className="mt-1 text-[10px] text-text-muted">
          {subtitle}
        </div>

      </div>

    </div>
  );
}


/* =========================================================
   CONTRACT ROW
========================================================= */

function ContractRow({
  name,
  property,
  status,
  date,
  t,
}: {
  name: string;
  property: string;
  status: "pending" | "approved" | "expiring";
  date: string;
  t: any;
}) {

  const statusConfig = {
    pending: {
      label: t("owner.status.pending"),
      className: "bg-amber-50 text-amber-600",
      dot: "bg-amber-500",
    },

    approved: {
      label: t("owner.status.approved"),
      className: "bg-[#EAFBF6] text-primary",
      dot: "bg-primary",
    },

    expiring: {
      label: t("owner.status.expiring"),
      className: "bg-red-50 text-red-500",
      dot: "bg-red-500",
    },
  };

  const current = statusConfig[status];

  return (
    <div
      className="
        group
        flex
        items-center
        gap-4
        rounded-2xl
        border
        border-[#EAEAEC]
        bg-white
        px-4
        py-4
        transition-all
        duration-300
        hover:border-primary/20
        hover:bg-[#FBFEFD]
        hover:shadow-[0_8px_20px_rgba(3,195,154,0.06)]
      "
    >

      {/* Avatar */}

      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-[#EAFBF6]
          text-sm
          font-extrabold
          text-primary
        "
      >
        {name.charAt(0)}
      </div>


      {/* Info */}

      <div className="min-w-0 flex-1">

        <div className="truncate text-sm font-bold text-text-primary">
          {name}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">

          <span className="truncate">
            {property}
          </span>

          <span className="h-1 w-1 shrink-0 rounded-full bg-[#CBD5E1]" />

          <span className="shrink-0">
            {date}
          </span>

        </div>

      </div>


      {/* Status */}

      <div
        className={`
          flex
          shrink-0
          items-center
          gap-1.5
          rounded-full
          px-3
          py-1.5
          text-[9px]
          font-bold
          ${current.className}
        `}
      >
        <span
          className={`
            h-1.5
            w-1.5
            rounded-full
            ${current.dot}
          `}
        />

        {current.label}
      </div>


      {/* Arrow */}

      <div
        className="
          hidden
          h-8
          w-8
          items-center
          justify-center
          rounded-lg
          bg-[#F4F7FA]
          text-text-muted
          transition-all
          duration-300
          group-hover:bg-[#EAFBF6]
          group-hover:text-primary
          sm:flex
        "
      >
        <ChevronRight
          size={15}
          className={isRtlFix()}
        />
      </div>

    </div>
  );
}


/* =========================================================
   NOTIFICATION
========================================================= */

function Notification({
  icon: Icon,
  title,
  time,
  active = false,
}: {
  icon: React.ElementType;
  title: string;
  time: string;
  active?: boolean;
}) {
  return (
    <div className="relative z-10 flex gap-3">

      <div
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          border-4
          border-white
          ${
            active
              ? "bg-primary text-white shadow-[0_4px_12px_rgba(3,195,154,0.22)]"
              : "bg-[#EAFBF6] text-primary"
          }
        `}
      >
        <Icon size={15} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">

        <div className="text-xs font-bold leading-5 text-text-primary">
          {title}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-muted">

          <CalendarDays size={11} />

          {time}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        p-5
        transition-all
        duration-300
        hover:-translate-y-1
        ${
          primary
            ? `
              border-primary
              bg-primary
              text-white
              shadow-[0_8px_25px_rgba(3,195,154,0.16)]
              hover:bg-primary-dark
              hover:shadow-[0_14px_30px_rgba(3,195,154,0.22)]
            `
            : `
              border-[#EAEAEC]
              bg-white
              hover:border-primary/20
              hover:shadow-[0_12px_30px_rgba(3,195,154,0.08)]
            `
        }
      `}
    >

      {/* Glow */}

      <div
        className={`
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-24
          w-24
          rounded-full
          blur-2xl
          transition-transform
          duration-500
          group-hover:scale-150
          ${
            primary
              ? "bg-white/10"
              : "bg-primary/5"
          }
        `}
      />

      <div className="relative z-10 flex items-center gap-4">

        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            transition-all
            duration-300
            ${
              primary
                ? "bg-white/15 text-white"
                : "bg-[#EAFBF6] text-primary group-hover:bg-primary group-hover:text-white"
            }
          `}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">

          <div
            className={`
              text-sm
              font-extrabold
              ${
                primary
                  ? "text-white"
                  : "text-text-primary"
              }
            `}
          >
            {title}
          </div>

          <div
            className={`
              mt-1
              text-[10px]
              ${
                primary
                  ? "text-white/70"
                  : "text-text-muted"
              }
            `}
          >
            {description}
          </div>

        </div>

        <div
          className={`
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            transition-all
            duration-300
            group-hover:translate-x-1
            ${
              primary
                ? "bg-white/10 text-white"
                : "bg-[#F4F7FA] text-text-muted group-hover:bg-[#EAFBF6] group-hover:text-primary"
            }
          `}
        >
          
        </div>

      </div>

    </a>
  );
}


/* =========================================================
   RTL HELPER
========================================================= */

function isRtlFix() {
  return "transition-transform duration-300 group-hover:translate-x-0.5";
}