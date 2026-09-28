"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  FileText,
  User,
  BadgeCheck,
  ShieldCheck,
  Ban,
  RotateCcw,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

type ApplicationStatus = "pending" | "approved" | "rejected" | "suspended";
type TapOnboardingStage = "pending_admin" | "tap_uploading_files" | "tap_creating_lead" | "tap_creating_retailer" | "tap_kyc_pending" | "tap_failed" | "active";

type SuspensionType =
  | "bad_service"
  | "license_expired"
  | "complaints"
  | "documents_invalid"
  | "other";

type SubscriptionType =
  | "lawyer"
  | "consultant"
  | "mediator"
  | "arbitrator"
  | "expert"
  | "private_executor"
  | "private_notary"
  | "translator";

export type ApplicationItem = {
  id: string;
  subscriptionType: SubscriptionType;

  fullNameAr: string;
  fullNameEn: string;

  email: string;
  phone: string;
  language: string;

  licenseNumber: string;
  licenseExpiryDate: string | null;

  registrationLevel: string | null;
  experienceYears: number;
  specialtyMain: string | null;
  specialtySubs: string[];
  specialties: {
    main?: string;
    subs?: string[];
  } | null;

  notaryId: string | null;
  agreementAccepted: boolean;
  locale: string | null;

  status: ApplicationStatus;
  isActive: boolean;
  rejectionReason: string | null;

  suspensionType: SuspensionType | null;
  suspensionReason: string | null;
  suspendedAt: string | null;

  approvedLawyerId: string | null;

  profileImageFileName: string | null;
  licenseFileName: string | null;

  reviewedBy: string | null;
  reviewedByName: string | null;

  createdAt: string;
  reviewedAt: string | null;
  updatedAt: string | null;
  tapOnboarding: {
    stage: TapOnboardingStage;
    retailerId: string | null;
    leadId: string | null;
    destinationId: string | null;
    kycStatus: string;
    payoutEnabled: boolean;
    lastErrorMessage: string | null;
    lastAttemptAt: string | null;
  } | null;
};


const registrationLevelLabels: Record<string, { ar: string; en: string }> = {
  cassation_lawyer: {
    ar: "محامي أمام التمييز",
    en: "Lawyer before Court of Cassation",
  },
  practicing_lawyer: {
    ar: "محامي مشتغل",
    en: "Practicing Lawyer",
  },
  trainee_lawyer: {
    ar: "محامي تحت التمرين",
    en: "Trainee Lawyer",
  },
};

const specialtyLabels: Record<string, { ar: string; en: string }> = {
  administrative: { ar: "إدارية", en: "Administrative" },
  civil: { ar: "مدنية", en: "Civil" },
  commercial: { ar: "تجارية", en: "Commercial" },
  labor: { ar: "عمالية", en: "Labor" },
  criminal: { ar: "جنائية", en: "Criminal" },
  sharia: { ar: "شرعية", en: "Sharia" },
  constitutional: { ar: "دستورية", en: "Constitutional" },
  cassation: { ar: "تمييز", en: "Cassation" },
  sports: { ar: "رياضية", en: "Sports" },
};

function labelFromMap(
  value: string | null | undefined,
  labels: Record<string, { ar: string; en: string }>,
  isAr: boolean,
) {
  if (!value) return "-";
  return labels[value]?.[isAr ? "ar" : "en"] ?? value;
}


function isTemporaryInviteLicenseNumber(value: string | null | undefined) {
  return /^INV-[0-9a-f-]{8,}$/i.test(String(value ?? "").trim());
}

function getDisplayLicenseNumber(
  value: string | null | undefined,
  isAr: boolean,
) {
  const text = String(value ?? "").trim();

  if (!text || isTemporaryInviteLicenseNumber(text)) {
    return isAr ? "بانتظار إكماله" : "Pending completion";
  }

  return text;
}

const subscriptionLabels: Record<
  SubscriptionType,
  { ar: string; en: string }
> = {
  lawyer: { ar: "محامي", en: "Lawyer" },
  consultant: { ar: "مستشار", en: "Consultant" },
  mediator: { ar: "وسيط", en: "Mediator" },
  arbitrator: { ar: "محكم", en: "Arbitrator" },
  expert: { ar: "خبير", en: "Expert" },
  private_executor: { ar: "منفذ خاص", en: "Private Executor" },
  private_notary: { ar: "موثق خاص", en: "Private Notary" },
  translator: { ar: "مترجم", en: "Translator" },
};

const statusLabels: Record<
  ApplicationStatus,
  { ar: string; en: string; className: string }
> = {
  pending: {
    ar: "بانتظار الموافقة",
    en: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    ar: "مقبول",
    en: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    ar: "مرفوض",
    en: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  suspended: {
  ar: "موقوف",
  en: "Suspended",
  className: "border-orange-200 bg-orange-50 text-orange-700",
},
};

const tapStageLabels: Record<TapOnboardingStage, { ar: string; en: string }> = {
  pending_admin: { ar: "بانتظار بدء Tap", en: "Tap pending" },
  tap_uploading_files: { ar: "رفع المستندات", en: "Uploading documents" },
  tap_creating_lead: { ar: "إنشاء الطلب", en: "Creating lead" },
  tap_creating_retailer: { ar: "إنشاء حساب Tap", en: "Creating retailer" },
  tap_kyc_pending: { ar: "بانتظار اعتماد KYC", en: "KYC pending" },
  tap_failed: { ar: "فشل الربط مع Tap", en: "Tap failed" },
  active: { ar: "Tap نشط", en: "Tap active" },
};

export default function Content({
  applications,
}: {
  applications: ApplicationItem[];
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [items, setItems] = useState(applications);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("pending");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.status === filter;

      const searchableText = [
        item.fullNameAr,
        item.fullNameEn,
        item.email,
        item.phone,
        isTemporaryInviteLicenseNumber(item.licenseNumber)
          ? ""
          : item.licenseNumber,
        item.registrationLevel,
        item.subscriptionType,
        item.specialtyMain,
        ...(item.specialtySubs ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [items, filter, search]);

  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      suspended: items.filter((item) => item.status === "suspended").length,
    };
  }, [items]);

  async function approve(id: string) {
    if (loadingId) return;

    setLoadingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/provider-applications/${id}/approve`, {
        method: "POST",
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        approvedLawyerId?: string | null;
        tapOnboarding?: { stage: TapOnboardingStage };
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Approval failed");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
    ...item,
    status: "approved",
    approvedLawyerId: data.approvedLawyerId ?? null,
    reviewedBy: "admin",
    reviewedByName: isAr ? "الإدارة" : "Admin",
    reviewedAt: new Date().toISOString(),
    tapOnboarding: {
      stage: data.tapOnboarding?.stage ?? "pending_admin",
      retailerId: null,
      leadId: null,
      destinationId: null,
      kycStatus: "pending",
      payoutEnabled: false,
      lastErrorMessage: null,
      lastAttemptAt: null,
    },
  }
            : item,
        ),
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذرت الموافقة"
            : "Approval failed",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function retryTap(id: string) {
    if (loadingId) return;
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/provider-applications/${id}/tap-retry`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; stage?: TapOnboardingStage; payoutEnabled?: boolean };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Tap retry failed");
      setItems((prev) => prev.map((item) => item.id === id && item.tapOnboarding ? {
        ...item,
        tapOnboarding: { ...item.tapOnboarding, stage: data.stage ?? item.tapOnboarding.stage, payoutEnabled: data.payoutEnabled ?? item.tapOnboarding.payoutEnabled, lastErrorMessage: null, lastAttemptAt: new Date().toISOString() },
      } : item));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : isAr ? "تعذرت إعادة محاولة Tap" : "Tap retry failed");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function reject(id: string) {
    if (loadingId) return;

    const reason =
      window.prompt(
        isAr ? "اكتب سبب الرفض" : "Enter rejection reason",
        isAr ? "المستندات غير مكتملة" : "Documents are incomplete",
      ) ?? "";

    const rejectionReason = reason.trim();

    if (!rejectionReason) return;

    setLoadingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/provider-applications/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Reject failed");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
    ...item,
    status: "rejected",
    rejectionReason,
    reviewedBy: "admin",
    reviewedByName: isAr ? "الإدارة" : "Admin",
    reviewedAt: new Date().toISOString(),
  }
            : item,
        ),
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر الرفض"
            : "Reject failed",
      );
    } finally {
      setLoadingId(null);
    }
  }


async function suspend(id: string) {
  if (loadingId) return;

  const type =
    window.prompt(
      isAr
        ? "سبب الإيقاف: bad_service / license_expired / complaints / documents_invalid / other"
        : "Suspension type: bad_service / license_expired / complaints / documents_invalid / other",
      "bad_service",
    ) ?? "";

  const reason =
    window.prompt(
      isAr ? "اكتب تفاصيل سبب الإيقاف" : "Enter suspension reason",
      isAr ? "سوء خدمة" : "Bad service",
    ) ?? "";

  const suspensionType = type.trim();
  const suspensionReason = reason.trim();

  if (!suspensionType || !suspensionReason) return;

  setLoadingId(id);
  setError(null);

  try {
    const res = await fetch(`/api/admin/provider-applications/${id}/suspend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: suspensionType,
        reason: suspensionReason,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Suspend failed");
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "suspended",
              suspensionType: suspensionType as SuspensionType,
              suspensionReason,
              suspendedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    router.refresh();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : isAr
          ? "تعذر الإيقاف"
          : "Suspend failed",
    );
  } finally {
    setLoadingId(null);
  }
}

async function reactivate(id: string) {
  if (loadingId) return;

  const ok = window.confirm(
    isAr
      ? "هل تريد إعادة تفعيل مقدم الخدمة؟"
      : "Do you want to reactivate this provider?",
  );

  if (!ok) return;

  setLoadingId(id);
  setError(null);

  try {
    const res = await fetch(
      `/api/admin/provider-applications/${id}/reactivate`,
      {
        method: "POST",
      },
    );

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Reactivate failed");
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "approved",
              suspensionType: null,
              suspensionReason: null,
              suspendedAt: null,
              reviewedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    router.refresh();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : isAr
          ? "تعذرت إعادة التفعيل"
          : "Reactivate failed",
    );
  } finally {
    setLoadingId(null);
  }
}

  return (
    <main className="min-h-screen bg-[#F7F8FA] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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

        <div className="mb-8 rounded-3xl bg-[#006C32] p-7 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {isAr ? "موافقات مقدمي الخدمات" : "Provider Approvals"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">
                {isAr
                  ? "راجع طلبات الانضمام وقم بالموافقة أو الرفض."
                  : "Review provider join applications and approve or reject them."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:min-w-[560px]">
              <StatCard label={isAr ? "الكل" : "All"} value={counts.all} />
              <StatCard label={isAr ? "بانتظار" : "Pending"} value={counts.pending} />
              <StatCard label={isAr ? "مقبول" : "Approved"} value={counts.approved} />
              <StatCard label={isAr ? "مرفوض" : "Rejected"} value={counts.rejected} />
              <StatCard label={isAr ? "موقوف" : "Suspended"} value={counts.suspended} />
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["pending", "all", "approved", "rejected", "suspended"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                filter === key
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 bg-white text-text-muted hover:text-text-primary"
              }`}
            >
              {key === "all"
                ? isAr
                  ? "الكل"
                  : "All"
                : statusLabels[key][isAr ? "ar" : "en"]}
              <span className="ms-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isAr
                  ? "بحث بالاسم، البريد، الهاتف، رقم الرخصة..."
                  : "Search name, email, phone, license number..."
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pe-4 ps-10 text-sm font-bold text-text-primary outline-none transition focus:border-primary"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <Clock className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <h2 className="text-lg font-extrabold text-text-primary">
              {isAr ? "لا توجد طلبات" : "No applications"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {isAr
                ? "لا توجد طلبات ضمن هذا التصنيف."
                : "There are no applications in this filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredItems.map((item) => {
              const status = statusLabels[item.status];
              const subscription = subscriptionLabels[item.subscriptionType];

              return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-extrabold ${status.className}`}
                        >
                          {item.status === "pending" ? (
                            <Clock size={13} />
                          ) : item.status === "approved" ? (
                            <CheckCircle size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          {status[isAr ? "ar" : "en"]}
                        </span>

                        <span className="rounded-full border border-[#2c3e5a]/10 bg-[#2c3e5a]/[0.04] px-3 py-1 text-xs font-extrabold text-[#2c3e5a]">
                          {subscription[isAr ? "ar" : "en"]}
                        </span>

                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-text-muted">
                          {new Date(item.createdAt).toLocaleDateString(
                            isAr ? "ar-SA" : "en-US",
                          )}
                        </span>
                      </div>

                      <h2 className="text-xl font-extrabold text-white">
                        {isAr ? item.fullNameAr : item.fullNameEn}
                      </h2>

                      <p className="mt-1 text-sm font-bold text-text-muted">
                        {isAr ? item.fullNameEn : item.fullNameAr}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Info icon={Mail} label={isAr ? "الإيميل" : "Email"}>
                          {item.email}
                        </Info>

                        <Info icon={Phone} label={isAr ? "الهاتف" : "Phone"}>
                          {item.phone}
                        </Info>

                        <Info
                          icon={BadgeCheck}
                          label={isAr ? "رقم الرخصة" : "License No."}
                        >
                          <span
                            className={
                              isTemporaryInviteLicenseNumber(item.licenseNumber)
                                ? "text-amber-700"
                                : undefined
                            }
                          >
                            {getDisplayLicenseNumber(item.licenseNumber, isAr)}
                          </span>
                        </Info>

                        <Info
                          icon={Clock}
                          label={
                            isAr ? "انتهاء الرخصة" : "License Expiry"
                          }
                        >
                          {item.licenseExpiryDate || "-"}
                        </Info>

                        <Info icon={User} label={isAr ? "اللغة" : "Language"}>
                          {item.language}
                        </Info>
<Info icon={BadgeCheck} label={isAr ? "نوع القيد" : "Registration Level"}>
  {labelFromMap(item.registrationLevel, registrationLevelLabels, isAr)}
</Info>

<Info icon={Clock} label={isAr ? "سنوات الخبرة" : "Experience Years"}>
  {item.experienceYears}
</Info>

<Info icon={ShieldCheck} label={isAr ? "التخصص الرئيسي" : "Main Specialty"}>
  {labelFromMap(item.specialtyMain, specialtyLabels, isAr)}
</Info>

<Info icon={FileText} label={isAr ? "التخصصات الفرعية" : "Sub-specialties"}>
  {item.specialtySubs.length > 0
    ? item.specialtySubs
        .map((value) => labelFromMap(value, specialtyLabels, isAr))
        .join("، ")
    : "-"}
</Info>

<Info icon={ShieldCheck} label={isAr ? "الموافقة على الاتفاقية" : "Agreement"}>
  {item.agreementAccepted
    ? isAr
      ? "نعم"
      : "Yes"
    : isAr
      ? "لا"
      : "No"}
</Info>

<Info icon={FileText} label={isAr ? "مصدر التسجيل" : "Registration Source"}>
  {item.notaryId || (isAr ? "تسجيل مباشر" : "Direct registration")}
</Info>

<Info icon={User} label={isAr ? "اللغة / الصفحة" : "Locale"}>
  {item.locale || "-"}
</Info>

<Info icon={User} label={isAr ? "تمت المراجعة بواسطة" : "Reviewed By"}>
  {item.reviewedByName ||
    (item.reviewedBy === "admin"
      ? isAr
        ? "الإدارة"
        : "Admin"
      : item.reviewedBy || "-")}
</Info>

<Info icon={Clock} label={isAr ? "آخر تحديث" : "Updated At"}>
  {item.updatedAt
    ? new Date(item.updatedAt).toLocaleString(isAr ? "ar-SA" : "en-US")
    : "-"}
</Info>
                        <Info icon={FileText} label={isAr ? "الملفات" : "Files"}>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/api/admin/provider-applications/${item.id}/file/profile`}
                              target="_blank"
                              className="font-bold text-primary hover:text-primary-dark"
                            >
                              {isAr ? "الصورة" : "Photo"}
                            </a>
                            <span className="text-gray-300">|</span>
                            <a
                              href={`/api/admin/provider-applications/${item.id}/file/license`}
                              target="_blank"
                              className="font-bold text-primary hover:text-primary-dark"
                            >
                              {isAr ? "الرخصة" : "License"}
                            </a>
                          </div>
                        </Info>
                      </div>

                      {item.rejectionReason && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                          <strong>{isAr ? "سبب الرفض: " : "Reason: "}</strong>
                          {item.rejectionReason}
                        </div>
                      )}

{item.suspensionReason && (
  <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
    <strong>{isAr ? "سبب الإيقاف: " : "Suspension reason: "}</strong>
    {item.suspensionReason}
  </div>
)}
                      {item.tapOnboarding && (
                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${item.tapOnboarding.stage === "tap_failed" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-100 bg-blue-50 text-blue-900"}`}>
                          <div className="font-extrabold">
                            Tap Marketplace: {tapStageLabels[item.tapOnboarding.stage][isAr ? "ar" : "en"]}
                          </div>
                          <div className="mt-2 grid gap-1 text-xs font-semibold sm:grid-cols-2">
                            <span>Retailer: {item.tapOnboarding.retailerId || "-"}</span>
                            <span>Lead: {item.tapOnboarding.leadId || "-"}</span>
                            <span>Destination: {item.tapOnboarding.destinationId || "-"}</span>
                            <span>KYC: {item.tapOnboarding.kycStatus}</span>
                            <span>{isAr ? "الدفع" : "Payout"}: {item.tapOnboarding.payoutEnabled ? (isAr ? "مفعل" : "Enabled") : (isAr ? "غير مفعل" : "Disabled")}</span>
                            <span>{isAr ? "آخر محاولة" : "Last attempt"}: {item.tapOnboarding.lastAttemptAt ? new Date(item.tapOnboarding.lastAttemptAt).toLocaleString(isAr ? "ar-SA" : "en-US") : "-"}</span>
                          </div>
                          {item.tapOnboarding.lastErrorMessage && <p className="mt-2 text-xs font-bold">{item.tapOnboarding.lastErrorMessage}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-[220px] flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => approve(item.id)}
                        disabled={loadingId === item.id || !(item.status === "pending" || (item.status === "approved" && !item.isActive && !item.tapOnboarding))}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <CheckCircle size={16} />
                        {loadingId === item.id
                          ? isAr
                            ? "جاري التنفيذ..."
                            : "Processing..."
                          : isAr
                            ? item.status === "approved" ? "إكمال ربط Tap" : "موافقة"
                            : item.status === "approved" ? "Complete Tap setup" : "Approve"}
                      </button>

                      <button
                        type="button"
                        onClick={() => reject(item.id)}
                        disabled={loadingId === item.id || item.status !== "pending"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <XCircle size={16} />
                        {isAr ? "رفض" : "Reject"}
                      </button>

                      <button
  type="button"
  onClick={() => suspend(item.id)}
  disabled={loadingId === item.id || item.status !== "approved"}
  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
>
  <Ban size={16} />
  {isAr ? "إيقاف" : "Suspend"}
</button>

<button
  type="button"
  onClick={() => reactivate(item.id)}
  disabled={loadingId === item.id || item.status !== "suspended"}
  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2c3e5a] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#203047] disabled:cursor-not-allowed disabled:opacity-40"
>
  <RotateCcw size={16} />
  {isAr ? "إعادة تفعيل" : "Reactivate"}
</button>
                      {item.tapOnboarding?.stage === "tap_failed" && (
                        <button
                          type="button"
                          onClick={() => retryTap(item.id)}
                          disabled={loadingId === item.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800 disabled:opacity-40"
                        >
                          <RotateCcw size={16} />
                          {isAr ? "إعادة محاولة Tap" : "Retry Tap"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-white">
      <div className="text-xl font-extrabold text-white">{value}</div>
      <div className="text-xs font-bold text-white/60">{label}</div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-extrabold text-text-muted">
        <Icon size={14} />
        {label}
      </div>
      <div className="break-words text-sm font-bold text-text-primary">
        {children}
      </div>
    </div>
  );
}
