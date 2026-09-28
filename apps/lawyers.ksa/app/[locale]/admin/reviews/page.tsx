import { db, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  Eye,
  EyeOff,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ShieldAlert,
  Star,
  User,
  Ban,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { requireAdminPermission } from "@/lib/auth/admin-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    q?: string;
    visibility?: string;
    status?: string;
  }>;
};

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function formatEnglishNumbers(value: unknown) {
  return toEnglishDigits(String(value));
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return (
      normalized !== "" &&
      normalized !== "null" &&
      normalized !== "undefined" &&
      normalized !== "none" &&
      normalized !== "—"
    );
  }

  return true;
}

function formatDate(value: Date | string | null | undefined, isAr: boolean) {
  if (!hasValue(value)) return "";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";

  return formatEnglishNumbers(
    new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-latn" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  );
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

function formatReviewStatus(value: string | null | undefined, isAr: boolean) {
  const normalized = normalizeText(value);

  const labels: Record<string, { ar: string; en: string; className: string }> = {
    pending: {
      ar: "بانتظار التقييم",
      en: "Pending Review",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    submitted: {
      ar: "تم التقييم",
      en: "Submitted",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    disabled: {
      ar: "معطل",
      en: "Disabled",
      className: "bg-red-50 text-red-700 ring-red-100",
    },
    expired: {
      ar: "انتهت صلاحية الرابط",
      en: "Expired",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    cancelled: {
      ar: "ملغي",
      en: "Cancelled",
      className: "bg-red-50 text-red-700 ring-red-100",
    },
  };

  return (
    labels[normalized] ?? {
      ar: value || "",
      en: value || "",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    }
  );
}

function formatEmailStatus(value: string | null | undefined, isAr: boolean) {
  const normalized = normalizeText(value);

  const labels: Record<string, { ar: string; en: string; className: string }> = {
    pending: {
      ar: "بانتظار الإرسال",
      en: "Pending",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    sent: {
      ar: "تم الإرسال",
      en: "Sent",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    skipped: {
      ar: "لم يتم الإرسال",
      en: "Skipped",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    failed: {
      ar: "فشل الإرسال",
      en: "Failed",
      className: "bg-red-50 text-red-700 ring-red-100",
    },
  };

  return (
    labels[normalized] ?? {
      ar: value || "",
      en: value || "",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    }
  );
}

function formatRating(value: unknown, isAr: boolean) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return "";

  const safe = Math.min(5, Math.max(1, Math.round(number)));

  return isAr ? `${safe} من 5` : `${safe}/5`;
}

function StarsRow({ rating }: { rating: unknown }) {
  const safeRating = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < safeRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-[#D0D5DD]"
          }`}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "red" | "amber" | "slate";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-100 bg-red-50 text-red-700"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : tone === "slate"
            ? "border-slate-200 bg-slate-100 text-slate-700"
            : "border-[#E6EAF0] bg-white text-[#082B67]";

  return (
    <div className={`rounded-3xl border p-4 shadow-[0_10px_28px_rgba(7,17,31,0.035)] ${toneClass}`}>
      <p className="text-xs font-extrabold opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none">
        {formatEnglishNumbers(value)}
      </p>
    </div>
  );
}

async function updateReviewModeration(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ar");
  const action = String(formData.get("action") ?? "");

  if (!id) return;

  const updates: {
    status?: string;
    publicComment?: boolean;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (action === "hide") {
    // مخفي عن العامة لكن التقييم يبقى محسوباً ضمن المتوسط والعدد.
    updates.status = "submitted";
    updates.publicComment = false;
  } else if (action === "show") {
    // ظاهر للعامة ومحسوب.
    updates.status = "submitted";
    updates.publicComment = true;
  } else if (action === "disable") {
    // معطل بالكامل: لا يظهر ولا يدخل في حساب التقييم.
    updates.status = "disabled";
    updates.publicComment = false;
  } else if (action === "enable_hidden") {
    // إعادة تفعيل التقييم كـ محسوب، لكن التعليق لا يظهر.
    updates.status = "submitted";
    updates.publicComment = false;
  } else {
    return;
  }

  await db
    .update(schema.bookingReviews)
    .set(updates)
    .where(eq(schema.bookingReviews.id, id));

  revalidatePath(`/${locale}/admin/reviews`);
  revalidatePath(`/${locale}/directory`);
}

export default async function AdminReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_reviews"))) redirect(`/${locale}/admin`);
  const query = (await searchParams) ?? {};
  setRequestLocale(locale);

  const isAr = locale === "ar";
  const q = String(query.q ?? "").trim();
  const rows = await db
    .select({
      id: schema.bookingReviews.id,
      bookingRequestId: schema.bookingReviews.bookingRequestId,
      lawyerId: schema.bookingReviews.lawyerId,
      customerName: schema.bookingReviews.customerName,
      customerEmail: schema.bookingReviews.customerEmail,
      customerPhone: schema.bookingReviews.customerPhone,
      service: schema.bookingReviews.service,
      consultationType: schema.bookingReviews.consultationType,
      appointmentDate: schema.bookingReviews.appointmentDate,
      appointmentTime: schema.bookingReviews.appointmentTime,
      providerName: schema.bookingReviews.providerName,
      status: schema.bookingReviews.status,
      reviewEmailStatus: schema.bookingReviews.reviewEmailStatus,
      lawyerRating: schema.bookingReviews.lawyerRating,
      serviceSpeedRating: schema.bookingReviews.serviceSpeedRating,
      serviceQualityRating: schema.bookingReviews.serviceQualityRating,
      providerCommunicationRating: schema.bookingReviews.providerCommunicationRating,
      appointmentCommitmentRating: schema.bookingReviews.appointmentCommitmentRating,
      platformEaseRating: schema.bookingReviews.platformEaseRating,
      overallRating: schema.bookingReviews.overallRating,
      lawyerComment: schema.bookingReviews.lawyerComment,
      serviceComment: schema.bookingReviews.serviceComment,
      publicComment: schema.bookingReviews.publicComment,
      submittedAt: schema.bookingReviews.submittedAt,
      createdAt: schema.bookingReviews.createdAt,
      updatedAt: schema.bookingReviews.updatedAt,
      lawyerNameAr: schema.saudiLawyers.fullNameAr,
      lawyerNameEn: schema.saudiLawyers.fullNameEn,
      lawyerEmail: schema.saudiLawyers.email,
    })
    .from(schema.bookingReviews)
    .leftJoin(
      schema.saudiLawyers,
      eq(schema.bookingReviews.lawyerId, schema.saudiLawyers.id),
    )
    .orderBy(desc(schema.bookingReviews.createdAt))
    .limit(500);

  const totalCount = rows.length;
  const submittedCount = rows.filter((review) => review.status === "submitted").length;
  const visibleCount = rows.filter(
    (review) => review.status === "submitted" && review.publicComment === true,
  ).length;
  const hiddenCount = rows.filter(
    (review) => review.status === "submitted" && review.publicComment === false,
  ).length;
  const disabledCount = rows.filter((review) => review.status === "disabled").length;
  const pendingCount = rows.filter(
    (review) => review.status !== "submitted" && review.status !== "disabled",
  ).length;

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-[#F7F8FA] px-5 py-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "رجوع للوحة التحكم" : "Back to Dashboard"}
          </Link>

          <AdminLogoutButton />
        </div>

        <div className="mb-7 rounded-3xl bg-[#006C32] p-7 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                {isAr ? "إدارة التقييمات والتعليقات" : "Reviews & Comments Moderation"}
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-white/65">
                {isAr
                  ? "إخفاء التعليق يعني أن التعليق لا يظهر للعامة لكنه يبقى محسوباً في التقييم. تعطيل التقييم يعني أنه لا يظهر ولا يدخل في حساب التقييم نهائياً."
                  : "Hiding a comment removes it from public display while keeping its rating counted. Disabling a review removes it from public display and excludes it from rating calculations."}
              </p>
            </div>


          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label={isAr ? "الإجمالي" : "Total"} value={totalCount} />
          <StatCard label={isAr ? "محسوب" : "Counted"} value={submittedCount} tone="green" />
          <StatCard label={isAr ? "ظاهر للعامة" : "Visible"} value={visibleCount} tone="green" />
          <StatCard label={isAr ? "مخفي ومحسوب" : "Hidden & Counted"} value={hiddenCount} tone="amber" />
          <StatCard label={isAr ? "معطل" : "Disabled"} value={disabledCount} tone="red" />
          <StatCard label={isAr ? "بانتظار" : "Pending"} value={pendingCount} tone="slate" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2" data-admin-review-filters>
          {[
            { key: "all", ar: "الكل", en: "All" },
            { key: "visible", ar: "ظاهر للعامة", en: "Visible" },
            { key: "hidden", ar: "مخفي ومحسوب", en: "Hidden & Counted" },
            { key: "disabled", ar: "معطل وغير محسوب", en: "Disabled & Excluded" },
            { key: "not_submitted", ar: "غير مكتمل", en: "Not Submitted" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              data-review-visibility={item.key}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                item.key === "all"
                  ? "border-[#082B67] bg-[#082B67] text-white"
                  : "border-[#E1E7F0] bg-white text-[#475467] hover:border-[#082B67]/30"
              }`}
            >
              {isAr ? item.ar : item.en}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="search"
              data-admin-review-search
              defaultValue={q}
              placeholder={
                isAr
                  ? "بحث بالاسم، البريد، الهاتف، التعليق، الخدمة..."
                  : "Search name, email, phone, comment, service..."
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pe-4 ps-10 text-sm font-bold text-[#07111F] outline-none transition focus:border-primary placeholder:text-[#98A2B3]"
            />
          </div>
        </div>

        <section className="mt-6 grid gap-4">
          {rows.length > 0 ? (
            rows.map((review) => {
              const reviewStatus = formatReviewStatus(review.status, isAr);
              const emailStatus = formatEmailStatus(review.reviewEmailStatus, isAr);
              const lawyerName =
                (isAr ? review.lawyerNameAr : review.lawyerNameEn) ||
                review.lawyerNameAr ||
                review.lawyerNameEn ||
                review.providerName ||
                review.lawyerEmail ||
                "";

              const isSubmitted = review.status === "submitted";
              const isDisabled = review.status === "disabled";
              const isPublic = isSubmitted && review.publicComment === true;
              const isHidden = isSubmitted && review.publicComment === false;

              return (
                <article
                  key={review.id}
                  data-admin-review-row
                  data-visibility={
                    isDisabled
                      ? "disabled"
                      : isPublic
                        ? "visible"
                        : isHidden
                          ? "hidden"
                          : "not_submitted"
                  }
                  data-search={[
                    review.customerName,
                    review.customerEmail,
                    review.customerPhone,
                    review.providerName,
                    review.lawyerNameAr,
                    review.lawyerNameEn,
                    review.lawyerEmail,
                    review.service,
                    review.consultationType,
                    review.lawyerComment,
                    review.serviceComment,
                    review.bookingRequestId,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()}
                  className="overflow-hidden rounded-[28px] border border-[#E1E7F0] bg-white shadow-[0_16px_44px_rgba(7,17,31,0.055)]"
                >
                  <div className="flex flex-col gap-4 border-b border-[#EAECF0] bg-white p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${reviewStatus.className}`}>
                          {reviewStatus[isAr ? "ar" : "en"]}
                        </span>

                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${emailStatus.className}`}>
                          {isAr ? "رابط التقييم: " : "Review email: "}
                          {emailStatus[isAr ? "ar" : "en"]}
                        </span>

                        {isPublic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                            <Eye className="h-3.5 w-3.5" />
                            {isAr ? "ظاهر ومحسوب" : "Visible & Counted"}
                          </span>
                        ) : null}

                        {isHidden ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                            <EyeOff className="h-3.5 w-3.5" />
                            {isAr ? "مخفي ومحسوب" : "Hidden & Counted"}
                          </span>
                        ) : null}

                        {isDisabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">
                            <Ban className="h-3.5 w-3.5" />
                            {isAr ? "معطل وغير محسوب" : "Disabled & Excluded"}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-3 text-lg font-black text-[#082B67]">
                        {lawyerName || (isAr ? "مقدم خدمة غير محدد" : "Unknown provider")}
                      </h2>

                      <p className="mt-1 text-sm font-semibold leading-6 text-[#667085]">
                        {review.service || "-"} {review.consultationType ? `— ${review.consultationType}` : ""}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#98A2B3]" dir="ltr">
                        {formatEnglishNumbers(review.bookingRequestId)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isSubmitted && !isPublic ? (
                        <form action={updateReviewModeration}>
                          <input type="hidden" name="id" value={review.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="action" value="show" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700"
                          >
                            <Eye className="h-4 w-4" />
                            {isAr ? "إظهار واحتساب" : "Show & Count"}
                          </button>
                        </form>
                      ) : null}

                      {isSubmitted && isPublic ? (
                        <form action={updateReviewModeration}>
                          <input type="hidden" name="id" value={review.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="action" value="hide" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-white transition hover:bg-amber-600"
                          >
                            <EyeOff className="h-4 w-4" />
                            {isAr ? "إخفاء فقط — محسوب" : "Hide only — counted"}
                          </button>
                        </form>
                      ) : null}

                      {isSubmitted ? (
                        <form action={updateReviewModeration}>
                          <input type="hidden" name="id" value={review.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="action" value="disable" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-xs font-black text-white transition hover:bg-red-700"
                          >
                            <Ban className="h-4 w-4" />
                            {isAr ? "تعطيل — غير محسوب" : "Disable — excluded"}
                          </button>
                        </form>
                      ) : null}

                      {isDisabled ? (
                        <>
                          <form action={updateReviewModeration}>
                            <input type="hidden" name="id" value={review.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="action" value="enable_hidden" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-white transition hover:bg-amber-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                              {isAr ? "تفعيل كمخفي ومحسوب" : "Enable hidden & counted"}
                            </button>
                          </form>

                          <form action={updateReviewModeration}>
                            <input type="hidden" name="id" value={review.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="action" value="show" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-700"
                            >
                              <Eye className="h-4 w-4" />
                              {isAr ? "تفعيل وإظهار" : "Enable & show"}
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-[0.72fr_1.28fr]">
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-[#EAECF0] bg-[#FCFCFD] p-4">
                        <p className="mb-3 text-xs font-black text-[#667085]">
                          {isAr ? "بيانات العميل" : "Client"}
                        </p>

                        <div className="space-y-2 text-sm font-bold text-[#475467]">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[#B6842B]" />
                            <span>{review.customerName || (isAr ? "عميل" : "Client")}</span>
                          </div>

                          {review.customerEmail ? (
                            <div className="flex items-center gap-2" dir="ltr">
                              <Mail className="h-4 w-4 text-[#B6842B]" />
                              <span className="break-all">{review.customerEmail}</span>
                            </div>
                          ) : null}

                          {review.customerPhone ? (
                            <div className="flex items-center gap-2" dir="ltr">
                              <Phone className="h-4 w-4 text-[#B6842B]" />
                              <span>{formatEnglishNumbers(review.customerPhone)}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[#EAECF0] bg-white p-4">
                        <p className="mb-3 text-xs font-black text-[#667085]">
                          {isAr ? "التقييمات" : "Ratings"}
                        </p>

                        <div className="space-y-3">
                          {[
                            {
                              label: isAr ? "المحامي" : "Lawyer",
                              value: review.lawyerRating,
                            },
                            {
                              label: isAr ? "السرعة" : "Speed",
                              value: review.serviceSpeedRating,
                            },
                            {
                              label: isAr ? "الجودة" : "Quality",
                              value: review.serviceQualityRating,
                            },
                            {
                              label: isAr ? "التواصل" : "Communication",
                              value: review.providerCommunicationRating,
                            },
                            {
                              label: isAr ? "الالتزام" : "Commitment",
                              value: review.appointmentCommitmentRating,
                            },
                            {
                              label: isAr ? "سهولة المنصة" : "Platform Ease",
                              value: review.platformEaseRating,
                            },
                            {
                              label: isAr ? "عام" : "Overall",
                              value: review.overallRating,
                            },
                          ]
                            .filter((item) => hasValue(item.value))
                            .map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="text-xs font-bold text-[#667085]">
                                  {item.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <StarsRow rating={item.value} />
                                  <span className="text-xs font-black text-[#9C6B1F]">
                                    {formatRating(item.value, isAr)}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-3xl border border-[#EAECF0] bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[#B6842B]" />
                          <p className="text-xs font-black text-[#667085]">
                            {isAr ? "تعليق المحامي المنشور" : "Public lawyer comment"}
                          </p>
                        </div>

                        <p className="whitespace-pre-line text-sm font-semibold leading-8 text-[#475467]">
                          {review.lawyerComment ||
                            (isAr ? "لا يوجد تعليق مكتوب." : "No written comment.")}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-[#EAECF0] bg-[#FCFCFD] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[#B6842B]" />
                          <p className="text-xs font-black text-[#667085]">
                            {isAr ? "تعليق الخدمة والمنصة" : "Service / platform comment"}
                          </p>
                        </div>

                        <p className="whitespace-pre-line text-sm font-semibold leading-8 text-[#475467]">
                          {review.serviceComment ||
                            (isAr ? "لا يوجد تعليق مكتوب." : "No written comment.")}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
                          <p className="text-xs font-black text-[#667085]">
                            {isAr ? "تاريخ التقييم" : "Submitted At"}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[#082B67]" dir="ltr">
                            {formatDate(review.submittedAt, isAr) || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
                          <p className="text-xs font-black text-[#667085]">
                            {isAr ? "آخر تحديث" : "Updated At"}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[#082B67]" dir="ltr">
                            {formatDate(review.updatedAt, isAr) || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#D0D5DD] bg-white p-10 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-[#98A2B3]" />
              <p className="mt-3 text-sm font-bold text-[#667085]">
                {isAr
                  ? "لا توجد تقييمات مطابقة للفلاتر الحالية."
                  : "No reviews match the current filters."}
              </p>
            </div>
          )}
        </section>


        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const root = document.currentScript?.closest('main');
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll('[data-review-visibility]'));
  const input = root.querySelector('[data-admin-review-search]');
  const rows = Array.from(root.querySelectorAll('[data-admin-review-row]'));
  let activeVisibility = 'all';

  function setActiveButton() {
    buttons.forEach((button) => {
      const isActive = button.getAttribute('data-review-visibility') === activeVisibility;
      button.className = isActive
        ? 'rounded-full border border-[#082B67] bg-[#082B67] px-4 py-2 text-xs font-black text-white transition'
        : 'rounded-full border border-[#E1E7F0] bg-white px-4 py-2 text-xs font-black text-[#475467] transition hover:border-[#082B67]/30';
    });
  }

  function applyFilters() {
    const query = String(input?.value || '').trim().toLowerCase();

    rows.forEach((row) => {
      const visibility = row.getAttribute('data-visibility') || '';
      const text = row.getAttribute('data-search') || '';
      const matchesVisibility = activeVisibility === 'all' || visibility === activeVisibility;
      const matchesSearch = !query || text.includes(query);
      row.style.display = matchesVisibility && matchesSearch ? '' : 'none';
    });
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      activeVisibility = button.getAttribute('data-review-visibility') || 'all';
      setActiveButton();
      applyFilters();
    });
  });

  input?.addEventListener('input', applyFilters);
  applyFilters();
})();
            `.trim(),
          }}
        />
      </div>
    </main>
  );
}
