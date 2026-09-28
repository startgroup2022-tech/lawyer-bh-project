import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Landmark,
  ReceiptText,
  RotateCcw,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

import { getAdminSession } from "@/lib/auth/admin-session";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import {
  isPlatformOnlyAllocation,
  requiresProviderPayout,
} from "@/lib/payments/allocation-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    locale: string;
  }>;

  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

type AccountRow = {
  id: string;

  country_code: string;
  booking_request_id: string;
  provider_id: string | null;

  tap_charge_id: string;
  currency_code: string;

  gross_amount: string;
  platform_percentage: string;
  provider_percentage: string;

  platform_amount: string;
  provider_amount: string;
  gateway_fee_amount: string;
  split_mode: string;

  allocation_status: string;
  payout_status: string;

  captured_at: Date | string;
  paid_out_at: Date | string | null;
  created_at: Date | string;

  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service: string | null;

  lawyer_name_ar: string | null;
  lawyer_name_en: string | null;
  membership_no: string | null;
  iban_number: string | null;
};

type PayoutFilter = "all" | "platform" | "pending" | "paid";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(
  value: unknown,
  currencyCode: string,
  isAr: boolean,
) {
  const amount = toNumber(value);

  const formatted = new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);

  const normalizedCurrency =
    currencyCode?.trim().toUpperCase() || "SAR";

  const currencyLabel =
    normalizedCurrency === "SAR"
      ? isAr
        ? "ر.س"
        : "SAR"
      : normalizedCurrency;

  return `${formatted} ${currencyLabel}`;
}

function formatPercentage(value: unknown) {
  const percentage = toNumber(value);

  return `${new Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(percentage)}%`;
}

function formatDate(
  value: Date | string | null | undefined,
  isAr: boolean,
) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    isAr ? "ar-SA-u-nu-latn" : "en-GB",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function isPaidStatus(value: unknown) {
  const status = normalizeText(value);

  return (
    status === "paid" ||
    status === "paid_out" ||
    status === "completed"
  );
}

function getProviderName(
  row: AccountRow,
  isAr: boolean,
) {
  if (
    isPlatformOnlyAllocation({
      splitMode: row.split_mode,
      providerId: row.provider_id,
    })
  ) {
    return isAr ? "إيراد المنصة" : "Platform revenue";
  }

  return (
    (isAr
      ? row.lawyer_name_ar
      : row.lawyer_name_en) ||
    row.lawyer_name_ar ||
    row.lawyer_name_en ||
    (isAr ? "مزود خدمة غير محدد" : "Unspecified provider")
  );
}

function getPayoutStatus(row: AccountRow, isAr: boolean) {
  if (
    isPlatformOnlyAllocation({
      splitMode: row.split_mode,
      providerId: row.provider_id,
    })
  ) {
    return {
      label: isAr ? "للمنصة بالكامل" : "Fully allocated to platform",
      className: "border-blue-200 bg-blue-50 text-blue-700",
      icon: Landmark,
    };
  }

  if (isPaidStatus(row.payout_status)) {
    return {
      label: isAr ? "مدفوع للمحامي" : "Paid to Provider",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  return {
    label: isAr ? "غير مدفوع للمحامي" : "Unpaid to Provider",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock3,
  };
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof WalletCards;
  tone?: "default" | "red" | "green" | "amber";
}) {
  const classes =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-[#E6EAF0] bg-white text-[#082B67]";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_10px_28px_rgba(7,17,31,0.04)] ${classes}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold opacity-70">
            {label}
          </p>

          <p className="mt-2 break-words text-2xl font-black leading-none sm:text-3xl">
            {value}
          </p>

          <p className="mt-3 text-xs leading-5 opacity-70">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

async function updatePayoutStatus(
  formData: FormData,
) {
  "use server";

  const locale =
    String(formData.get("locale") ?? "ar") === "en"
      ? "en"
      : "ar";

  const session = await getAdminSession();

  if (!session) {
    redirect(`/${locale}/join`);
  }

  const allocationId = String(
    formData.get("allocationId") ?? "",
  ).trim();

  const action = String(
    formData.get("action") ?? "",
  ).trim();

  if (!allocationId) {
    throw new Error("Allocation id is required");
  }

  if (
    action !== "mark_paid" &&
    action !== "mark_pending"
  ) {
    throw new Error("Invalid payout action");
  }

  const country = await getActiveCountry("SA");

  if (!country) {
    throw new Error(
      "Bahrain country tables are not ready",
    );
  }

  const tables = buildCountryTableSet(country);

  const payoutStatus =
    action === "mark_paid"
      ? "paid"
      : "pending";

  const paidOutAt =
    action === "mark_paid"
      ? new Date()
      : null;

  await sqlClient`
    UPDATE ${sqlClient(tables.payment_allocations)}
    SET
      payout_status = ${payoutStatus},
      paid_out_at = ${paidOutAt},
      updated_at = NOW()
    WHERE id = ${allocationId}::uuid
      AND country_code = ${country.code}
  `;

  revalidatePath(`/${locale}/admin/accounts`);
}

function PayoutAction({
  row,
  locale,
  isAr,
}: {
  row: AccountRow;
  locale: string;
  isAr: boolean;
}) {
  if (
    !requiresProviderPayout({
      splitMode: row.split_mode,
      providerId: row.provider_id,
    })
  ) {
    return (
      <span className="text-xs font-bold text-gray-400">
        {isAr ? "لا يوجد مستحق محامٍ" : "No provider payout"}
      </span>
    );
  }

  const paid = isPaidStatus(row.payout_status);

  return (
    <form action={updatePayoutStatus}>
      <input
        type="hidden"
        name="locale"
        value={locale}
      />

      <input
        type="hidden"
        name="allocationId"
        value={row.id}
      />

      <input
        type="hidden"
        name="action"
        value={
          paid
            ? "mark_pending"
            : "mark_paid"
        }
      />

      <button
        type="submit"
        className={
          paid
            ? "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            : "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#006C32] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#005126] sm:w-auto"
        }
      >
        {paid ? (
          <>
            <RotateCcw className="h-4 w-4" />
            {isAr
              ? "إرجاع لغير مدفوع"
              : "Mark as Unpaid"}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            {isAr
              ? "تسجيله كمدفوع"
              : "Mark as Paid"}
          </>
        )}
      </button>
    </form>
  );
}

export default async function AdminAccountsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_finance"))) redirect(`/${locale}/admin`);

  setRequestLocale(locale);

  const isAr = locale === "ar";

  const session = await getAdminSession();

  if (!session) {
    redirect(`/${locale}/join`);
  }

  const queryParams =
    (await searchParams) ?? {};

  const query = String(
    queryParams.q ?? "",
  ).trim();

  const requestedStatus = String(
    queryParams.status ?? "all",
  );

  const status: PayoutFilter =
    requestedStatus === "paid" ||
    requestedStatus === "platform" ||
    requestedStatus === "pending"
      ? requestedStatus
      : "all";

  const country = await getActiveCountry("SA");

  if (!country) {
    throw new Error(
      "Bahrain country tables are not ready",
    );
  }

  const tables = buildCountryTableSet(country);

  const rows = await sqlClient<AccountRow[]>`
    SELECT
      allocation.id,
      allocation.country_code,
      allocation.booking_request_id,
      allocation.provider_id,

      allocation.tap_charge_id,
      allocation.currency_code,

      allocation.gross_amount,
      allocation.platform_percentage,
      allocation.provider_percentage,

      allocation.platform_amount,
      allocation.provider_amount,
      allocation.gateway_fee_amount,
      allocation.split_mode,

      allocation.allocation_status,
      allocation.payout_status,

      allocation.captured_at,
      allocation.paid_out_at,
      allocation.created_at,

      booking.customer_name,
      booking.customer_phone,
      booking.customer_email,
      booking.service,

      lawyer.full_name_ar AS lawyer_name_ar,
      lawyer.full_name_en AS lawyer_name_en,
      lawyer.membership_no,
      lawyer.iban_number

    FROM ${sqlClient(tables.payment_allocations)}
      AS allocation

    LEFT JOIN ${sqlClient(tables.booking_requests)}
      AS booking
      ON booking.id =
        allocation.booking_request_id

    LEFT JOIN ${sqlClient(tables.lawyers)}
      AS lawyer
      ON lawyer.id =
        allocation.provider_id

    WHERE allocation.country_code =
      ${country.code}

    ORDER BY allocation.captured_at DESC

    LIMIT 1000
  `;

  const normalizedQuery =
    normalizeText(query);

  const filteredRows = rows.filter((row) => {
    const platformOnly = isPlatformOnlyAllocation({
      splitMode: row.split_mode,
      providerId: row.provider_id,
    });
    const paid = isPaidStatus(
      row.payout_status,
    );

    const matchesStatus =
      status === "all" ||
      (status === "platform" && platformOnly) ||
      (status === "paid" && !platformOnly && paid) ||
      (status === "pending" && !platformOnly && !paid);

    if (!matchesStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = normalizeText([
      row.tap_charge_id,
      row.booking_request_id,
      row.customer_name,
      row.customer_phone,
      row.customer_email,
      row.service,
      row.lawyer_name_ar,
      row.lawyer_name_en,
      row.membership_no,
      row.iban_number,
    ].join(" "));

    return searchableText.includes(
      normalizedQuery,
    );
  });

  const grossTotal = rows.reduce(
    (total, row) =>
      total + toNumber(row.gross_amount),
    0,
  );

  const platformTotal = rows.reduce(
    (total, row) =>
      total + toNumber(row.platform_amount),
    0,
  );

  const paidProviderTotal = rows.reduce(
    (total, row) =>
      requiresProviderPayout({
        splitMode: row.split_mode,
        providerId: row.provider_id,
      }) && isPaidStatus(row.payout_status)
        ? total + toNumber(row.provider_amount)
        : total,
    0,
  );

  const pendingProviderTotal = rows.reduce(
    (total, row) =>
      requiresProviderPayout({
        splitMode: row.split_mode,
        providerId: row.provider_id,
      }) && !isPaidStatus(row.payout_status)
        ? total + toNumber(row.provider_amount)
        : total,
    0,
  );

  const platformCount = rows.filter((row) =>
    isPlatformOnlyAllocation({
      splitMode: row.split_mode,
      providerId: row.provider_id,
    }),
  ).length;

  const paidCount = rows.filter(
    (row) =>
      requiresProviderPayout({
        splitMode: row.split_mode,
        providerId: row.provider_id,
      }) && isPaidStatus(row.payout_status),
  ).length;

  const pendingCount = rows.filter(
    (row) =>
      requiresProviderPayout({
        splitMode: row.split_mode,
        providerId: row.provider_id,
      }) && !isPaidStatus(row.payout_status),
  ).length;

  const filterItems: Array<{
    value: PayoutFilter;
    label: string;
    count: number;
  }> = [
    {
      value: "all",
      label: isAr ? "جميع العمليات" : "All Transactions",
      count: rows.length,
    },
    {
      value: "platform",
      label: isAr ? "إيرادات المنصة" : "Platform Revenue",
      count: platformCount,
    },
    {
      value: "pending",
      label: isAr ? "غير مدفوعة" : "Unpaid",
      count: pendingCount,
    },
    {
      value: "paid",
      label: isAr ? "مدفوعة" : "Paid",
      count: paidCount,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* أعلى الصفحة */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#082B67] shadow-sm transition hover:border-[#006C32]/30 hover:text-[#006C32]"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />

            {isAr
              ? "العودة للوحة التحكم"
              : "Back to Dashboard"}
          </Link>

          <AdminLogoutButton />
        </div>

        {/* الهيدر */}
        <section className="mb-6 rounded-3xl bg-[#006C32] p-5 text-white shadow-xl sm:p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <WalletCards className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {isAr
              ? "الحسابات والتسويات المالية"
              : "Accounts & Financial Settlements"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/75">
            {isAr
              ? "تعرض هذه الصفحة جميع المبالغ المحصلة، بما فيها إيرادات المنصة الكاملة للطلبات الموجهة إلى المكتب، إضافة إلى حصة المنصة ومستحقات المحامين وحالة تحويلها."
              : "View all collected payments, including full platform revenue from office bookings, alongside platform shares, provider entitlements, and payout status."}
          </p>
        </section>

        {/* الإحصائيات */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={
              isAr
                ? "إجمالي المبالغ المحصلة"
                : "Total Collected"
            }
            value={formatMoney(
              grossTotal,
              country.currencyCode,
              isAr,
            )}
            description={
              isAr
                ? `${rows.length} عملية مالية مسجلة`
                : `${rows.length} recorded transactions`
            }
            icon={CircleDollarSign}
          />

          <StatCard
            label={
              isAr
                ? "إجمالي حصة المنصة"
                : "Platform Share"
            }
            value={formatMoney(
              platformTotal,
              country.currencyCode,
              isAr,
            )}
            description={
              isAr
                ? "إجمالي المبالغ المستحقة للمنصة"
                : "Total amount allocated to the platform"
            }
            icon={Landmark}
            tone="red"
          />

          <StatCard
            label={
              isAr
                ? "مستحقات غير مدفوعة"
                : "Unpaid Provider Amount"
            }
            value={formatMoney(
              pendingProviderTotal,
              country.currencyCode,
              isAr,
            )}
            description={
              isAr
                ? `${pendingCount} عملية بانتظار التحويل`
                : `${pendingCount} payouts awaiting transfer`
            }
            icon={Clock3}
            tone="amber"
          />

          <StatCard
            label={
              isAr
                ? "مستحقات تم دفعها"
                : "Paid Provider Amount"
            }
            value={formatMoney(
              paidProviderTotal,
              country.currencyCode,
              isAr,
            )}
            description={
              isAr
                ? `${paidCount} عملية تم تحويلها`
                : `${paidCount} completed payouts`
            }
            icon={CheckCircle2}
            tone="green"
          />
        </section>

        {/* البحث والفلاتر */}
        <section className="mb-6 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <form
            method="GET"
            className="grid gap-3 lg:grid-cols-[1fr_auto]"
          >
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder={
                  isAr
                    ? "بحث باسم العميل، المحامي، رقم العملية أو IBAN..."
                    : "Search by client, provider, charge ID, or IBAN..."
                }
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pe-4 ps-10 text-sm font-bold text-[#082B67] outline-none transition focus:border-[#006C32] focus:ring-4 focus:ring-primary-light"
              />
            </div>

            <input
              type="hidden"
              name="status"
              value={status}
            />

            <button
              type="submit"
              className="h-12 rounded-xl bg-[#082B67] px-6 text-sm font-extrabold text-white transition hover:bg-[#061F4A]"
            >
              {isAr ? "بحث" : "Search"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {filterItems.map((item) => {
              const active =
                item.value === status;

              return (
                <Link
                  key={item.value}
                  href={{
                    pathname: "/admin/accounts",
                    query: {
                      status: item.value,
                      ...(query
                        ? { q: query }
                        : {}),
                    },
                  }}
                  className={
                    active
                      ? "inline-flex items-center gap-2 rounded-full border border-[#006C32] bg-[#006C32] px-4 py-2 text-xs font-extrabold text-white"
                      : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-600 transition hover:border-[#006C32]/30 hover:text-[#006C32]"
                  }
                >
                  {item.label}

                  <span
                    className={
                      active
                        ? "rounded-full bg-white/15 px-2 py-0.5"
                        : "rounded-full bg-gray-100 px-2 py-0.5"
                    }
                  >
                    {item.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* لا توجد نتائج */}
        {filteredRows.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
              <ReceiptText className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-lg font-extrabold text-[#082B67]">
              {isAr
                ? "لا توجد عمليات مطابقة"
                : "No matching transactions"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {isAr
                ? "لم يتم العثور على عمليات مالية بحسب البحث أو حالة الدفع المحددة."
                : "No financial transactions match the selected search or payout status."}
            </p>
          </section>
        ) : (
          <>
            {/* بطاقات الهاتف */}
            <section className="grid gap-4 lg:hidden">
              {filteredRows.map((row) => {
                const payout = getPayoutStatus(row, isAr);

                const StatusIcon =
                  payout.icon;

                return (
                  <article
                    key={row.id}
                    className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_12px_35px_rgba(7,17,31,0.06)]"
                  >
                    <div className="border-b border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-400">
                            {isAr
                              ? "رقم عملية Tap"
                              : "Tap Charge ID"}
                          </p>

                          <p className="mt-1 truncate font-mono text-xs font-bold text-[#082B67]">
                            {row.tap_charge_id}
                          </p>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold ${payout.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {payout.label}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="flex items-start gap-3">
                        <UserRound className="mt-1 h-4 w-4 shrink-0 text-[#006C32]" />

                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">
                            {isAr
                              ? "العميل"
                              : "Client"}
                          </p>

                          <p className="font-extrabold text-[#082B67]">
                            {row.customer_name || "—"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {row.customer_phone || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Landmark className="mt-1 h-4 w-4 shrink-0 text-[#006C32]" />

                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">
                            {isAr
                              ? "المحامي / مزود الخدمة"
                              : "Lawyer / Provider"}
                          </p>

                          <p className="font-extrabold text-[#082B67]">
                            {getProviderName(
                              row,
                              isAr,
                            )}
                          </p>

                          <p className="mt-1 break-all text-xs text-gray-500">
                            {row.iban_number
                              ? `IBAN: ${row.iban_number}`
                              : isAr
                                ? "لا يوجد IBAN"
                                : "No IBAN"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <p className="text-[10px] font-bold text-gray-400">
                            {isAr
                              ? "المبلغ الكلي"
                              : "Gross Amount"}
                          </p>

                          <p className="mt-1 text-sm font-black text-[#082B67]">
                            {formatMoney(
                              row.gross_amount,
                              row.currency_code,
                              isAr,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-red-50 p-3">
                          <p className="text-[10px] font-bold text-red-500">
                            {isAr
                              ? "حصة المنصة"
                              : "Platform Share"}
                          </p>

                          <p className="mt-1 text-sm font-black text-[#006C32]">
                            {formatMoney(
                              row.platform_amount,
                              row.currency_code,
                              isAr,
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-red-400">
                            {formatPercentage(
                              row.platform_percentage,
                            )}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-2xl bg-emerald-50 p-3">
                          <p className="text-[10px] font-bold text-emerald-600">
                            {isAr
                              ? "مستحق المحامي"
                              : "Provider Amount"}
                          </p>

                          <p className="mt-1 text-lg font-black text-emerald-700">
                            {formatMoney(
                              row.provider_amount,
                              row.currency_code,
                              isAr,
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-emerald-600">
                            {formatPercentage(
                              row.provider_percentage,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarDays className="h-4 w-4" />

                        <span>
                          {formatDate(
                            row.captured_at,
                            isAr,
                          )}
                        </span>
                      </div>

                      {row.paid_out_at ? (
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                          {isAr
                            ? "تاريخ التحويل:"
                            : "Paid at:"}{" "}
                          {formatDate(
                            row.paid_out_at,
                            isAr,
                          )}
                        </div>
                      ) : null}

                      <PayoutAction
                        row={row}
                        locale={locale}
                        isAr={isAr}
                      />
                    </div>
                  </article>
                );
              })}
            </section>

            {/* جدول الكمبيوتر */}
            <section className="hidden overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_12px_35px_rgba(7,17,31,0.05)] lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#F8FAFC] text-start">
                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "العملية"
                          : "Transaction"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "العميل"
                          : "Client"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "المحامي"
                          : "Provider"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "المبلغ الكلي"
                          : "Gross"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "حصة المنصة"
                          : "Platform"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "مستحق المحامي"
                          : "Provider Amount"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "الحالة"
                          : "Payout Status"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "التاريخ"
                          : "Date"}
                      </th>

                      <th className="px-4 py-4 text-start text-xs font-extrabold text-gray-500">
                        {isAr
                          ? "الإجراء"
                          : "Action"}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => {
                      const payout = getPayoutStatus(row, isAr);

                      const StatusIcon =
                        payout.icon;

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-gray-100 align-top transition last:border-b-0 hover:bg-gray-50/70"
                        >
                          <td className="px-4 py-4">
                            <div className="max-w-[180px]">
                              <p
                                className="truncate font-mono text-xs font-bold text-[#082B67]"
                                title={row.tap_charge_id}
                              >
                                {row.tap_charge_id}
                              </p>

                              <p className="mt-1 text-[10px] text-gray-400">
                                {row.service || "—"}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[160px] truncate text-sm font-extrabold text-[#082B67]">
                              {row.customer_name || "—"}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {row.customer_phone || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[190px] text-sm font-extrabold text-[#082B67]">
                              {getProviderName(
                                row,
                                isAr,
                              )}
                            </p>

                            <p className="mt-1 max-w-[190px] break-all text-[10px] text-gray-500">
                              {row.iban_number
                                ? `IBAN: ${row.iban_number}`
                                : "—"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="whitespace-nowrap text-sm font-black text-[#082B67]">
                              {formatMoney(
                                row.gross_amount,
                                row.currency_code,
                                isAr,
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="whitespace-nowrap text-sm font-black text-[#006C32]">
                              {formatMoney(
                                row.platform_amount,
                                row.currency_code,
                                isAr,
                              )}
                            </p>

                            <p className="mt-1 text-[10px] font-bold text-red-400">
                              {formatPercentage(
                                row.platform_percentage,
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="whitespace-nowrap text-sm font-black text-emerald-700">
                              {formatMoney(
                                row.provider_amount,
                                row.currency_code,
                                isAr,
                              )}
                            </p>

                            <p className="mt-1 text-[10px] font-bold text-emerald-500">
                              {formatPercentage(
                                row.provider_percentage,
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${payout.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {payout.label}
                            </span>

                            {row.paid_out_at ? (
                              <p className="mt-2 text-[10px] text-gray-400">
                                {formatDate(
                                  row.paid_out_at,
                                  isAr,
                                )}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-4">
                            <p className="max-w-[130px] text-xs leading-5 text-gray-500">
                              {formatDate(
                                row.captured_at,
                                isAr,
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <PayoutAction
                              row={row}
                              locale={locale}
                              isAr={isAr}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
