"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  BadgeCheck,
  Save,
  LogOut,
  ShieldCheck,
  Languages,
  CalendarDays,
  CreditCard,
  RefreshCw,
  Search,
  Eye,
  LockKeyhole,
  AlertTriangle,
  UploadCloud,
} from "lucide-react";

type ProviderAccessReason =
  | "profile_incomplete"
  | "pending_approval"
  | "rejected"
  | "suspended"
  | "license_expired"
  | "inactive"
  | null;

type ProviderAccess = {
  canUseDashboard: boolean;
  canUpdateLicense: boolean;
  licenseExpired: boolean;
  reason: ProviderAccessReason;
};

type ProviderProfile = {
  id: string;
  subscriptionType: string;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  language: string;

  specialtyMain?: string | null;
  specialtySubs?: string[];
  specialties?: {
    main?: string;
    subs?: string[];
  } | null;

  registrationNo: string;
  licenseExpiryDate: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  profileCompleted: boolean;
  isActive: boolean;
  access: ProviderAccess;

  profileImageUrl?: string | null;
  profileImageBase64?: string | null;
  profileImageMimeType?: string | null;
};

type ProviderRequest = {
  id: string;
  reference: string;
  source: "booking" | "emergency";
  serviceType: string;
  consultationType?: string | null;
  consultationMethod?: string | null;
  consultationPrice?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  assignmentMode?: string | null;
  selectedLawyerName?: string | null;
  assignedToEmail?: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail?: string | null;
  clientMessage?: string | null;
  status: string;
  paymentStatus?: string | null;
  amount: string | null;
  createdAt: string;
};

const lawyerSpecialties = [
  { value: "administrative", en: "Administrative", ar: "إدارية" },
  { value: "civil", en: "Civil", ar: "مدنية" },
  { value: "commercial", en: "Commercial", ar: "تجارية" },
  { value: "labor", en: "Labor", ar: "عمالية" },
  { value: "criminal", en: "Criminal", ar: "جنائية" },
  { value: "sharia", en: "Sharia", ar: "شرعية" },
  { value: "constitutional", en: "Constitutional", ar: "دستورية" },
  { value: "cassation", en: "Cassation", ar: "تمييز" },
  { value: "sports", en: "Sports", ar: "رياضية" },
] as const;

const statusLabels: Record<string, { ar: string; en: string; className: string }> = {
  pending: {
    ar: "بانتظار",
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
  profile_incomplete: {
    ar: "الملف غير مكتمل",
    en: "Profile Incomplete",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  license_expired: {
    ar: "الرخصة منتهية",
    en: "License Expired",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  inactive: {
    ar: "الحساب غير مفعل",
    en: "Account Inactive",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  pending_review: {
    ar: "بانتظار المراجعة",
    en: "Pending Review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  completed: {
    ar: "مكتمل",
    en: "Completed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  accepted: {
    ar: "مقبول",
    en: "Accepted",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  cancelled: {
    ar: "ملغي",
    en: "Cancelled",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  failed: {
    ar: "فشل",
    en: "Failed",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  paid: {
    ar: "مدفوع",
    en: "Paid",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pending_payment: {
    ar: "بانتظار الدفع",
    en: "Pending Payment",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  refunded: {
    ar: "مسترجع",
    en: "Refunded",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  mobilizing: {
    ar: "جاري التحرك",
    en: "Mobilizing",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  arrived: {
    ar: "تم الوصول",
    en: "Arrived",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
};

function normalizeSpecialtyValue(value: unknown) {
  const raw = String(value ?? "").trim();

  const map: Record<string, string> = {
    administrative: "administrative",
    Administrative: "administrative",
    "إدارية": "administrative",

    civil: "civil",
    Civil: "civil",
    "مدنية": "civil",

    commercial: "commercial",
    Commercial: "commercial",
    "تجارية": "commercial",

    labor: "labor",
    Labor: "labor",
    "عمالية": "labor",

    criminal: "criminal",
    Criminal: "criminal",
    "جنائية": "criminal",

    sharia: "sharia",
    Sharia: "sharia",
    "شرعية": "sharia",

    constitutional: "constitutional",
    Constitutional: "constitutional",
    "دستورية": "constitutional",

    cassation: "cassation",
    Cassation: "cassation",
    "تمييز": "cassation",

    sports: "sports",
    Sports: "sports",
    "رياضية": "sports",
  };

  return map[raw] ?? "";
}

function getMainSpecialty(profile: ProviderProfile) {
  return normalizeSpecialtyValue(
    profile.specialtyMain || profile.specialties?.main || "",
  );
}

function getSubSpecialties(profile: ProviderProfile) {
  const values = Array.isArray(profile.specialtySubs)
    ? profile.specialtySubs
    : Array.isArray(profile.specialties?.subs)
      ? profile.specialties.subs
      : [];

  return Array.from(
    new Set(values.map(normalizeSpecialtyValue).filter(Boolean)),
  ).slice(0, 2);
}

function getSubscriptionTitle(subscriptionType: string, isAr: boolean) {
  const value = String(subscriptionType ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");

  const titles: Record<string, { ar: string; en: string }> = {
    lawyer: { ar: "المحامي", en: "Lawyer" },
    consultant: { ar: "المستشار", en: "Consultant" },
    mediator: { ar: "الوسيط", en: "Mediator" },
    arbitrator: { ar: "المحكم", en: "Arbitrator" },
    expert: { ar: "الخبير", en: "Expert" },
    "private executor": { ar: "المنفذ الخاص", en: "Private Executor" },
    "private notary": { ar: "الموثق الخاص", en: "Private Notary" },
    translator: { ar: "المترجم", en: "Translator" },
  };

  const title = titles[value];
  return title ? title[isAr ? "ar" : "en"] : "";
}

function getStatusLabel(value: string | null | undefined, isAr: boolean) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  const item = statusLabels[normalized];

  return {
    label: item?.[isAr ? "ar" : "en"] ?? value ?? "-",
    className: item?.className ?? "border-gray-200 bg-gray-50 text-text-muted",
  };
}

function formatDate(value: string | Date | null | undefined, isAr: boolean) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function formatRequestDate(date: string | null | undefined, time: string | null | undefined) {
  if (!date && !time) return "-";
  if (!date) return time || "-";
  if (!time) return date;
  return `${date} - ${time}`;
}

function formatAmount(value: string | null | undefined, isAr: boolean) {
  if (!value) return "-";

  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return isAr ? `${amount.toFixed(2)} ر.س` : `${amount.toFixed(2)} SAR`;
}

function formatSource(source: ProviderRequest["source"], isAr: boolean) {
  return source === "booking"
    ? isAr
      ? "حجز استشارة"
      : "Booking"
    : isAr
      ? "طلب طارئ"
      : "Emergency";
}

function getLockMessage(reason: ProviderAccessReason, isAr: boolean) {
  const messages: Record<
    Exclude<ProviderAccessReason, null>,
    { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }
  > = {
    profile_incomplete: {
      titleAr: "الحساب غير مكتمل",
      titleEn: "Account profile is incomplete",
      bodyAr:
        "لا يمكنك استخدام الطلبات أو تعديل بيانات اللوحة حتى إكمال جميع معلومات الحساب والمستندات المطلوبة.",
      bodyEn:
        "Requests and dashboard actions are disabled until all required account information and documents are completed.",
    },
    pending_approval: {
      titleAr: "الحساب بانتظار الموافقة",
      titleEn: "Account is pending approval",
      bodyAr:
        "تم استلام بياناتك، وجميع خصائص الحساب مقفلة حتى انتهاء مراجعة الإدارة والموافقة على الحساب.",
      bodyEn:
        "Your information was received. All account features remain locked until the administrator finishes the review and approves the account.",
    },
    rejected: {
      titleAr: "تم رفض الحساب",
      titleEn: "Account was rejected",
      bodyAr: "الحساب مقفل. يرجى التواصل مع الإدارة لمعرفة سبب الرفض.",
      bodyEn:
        "The account is locked. Please contact the administrator for the rejection details.",
    },
    suspended: {
      titleAr: "الحساب موقوف",
      titleEn: "Account is suspended",
      bodyAr: "لا يمكنك تنفيذ أي إجراء أثناء إيقاف الحساب.",
      bodyEn: "No actions are available while the account is suspended.",
    },
    license_expired: {
      titleAr: "رخصة المحاماة منتهية",
      titleEn: "The professional license has expired",
      bodyAr:
        "تم قفل الطلبات وجميع خصائص الحساب. يمكنك فقط رفع الرخصة المجددة، وبعدها تنتظر موافقة الإدارة.",
      bodyEn:
        "Requests and all account features are locked. You may only submit the renewed license, then wait for administrator approval.",
    },
    inactive: {
      titleAr: "الحساب غير مفعل",
      titleEn: "Account is inactive",
      bodyAr: "الحساب مقفل حاليًا. يرجى التواصل مع الإدارة.",
      bodyEn: "The account is currently locked. Please contact the administrator.",
    },
  };

  const item = messages[reason ?? "pending_approval"];
  return isAr
    ? { title: item.titleAr, body: item.bodyAr }
    : { title: item.titleEn, body: item.bodyEn };
}

function minimumRenewalDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function Content() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<"requests" | "profile">("requests");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<"all" | "booking" | "emergency" | "paid" | "pending" | "completed">("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedMainSpecialty, setSelectedMainSpecialty] = useState("");
  const [selectedSubSpecialties, setSelectedSubSpecialties] = useState<string[]>([]);

  const profileName = useMemo(() => {
    if (!profile) return "";

    const name = isAr ? profile.fullNameAr : profile.fullNameEn;
    const title = getSubscriptionTitle(profile.subscriptionType, isAr);

    return title ? `${title} ${name}` : name;
  }, [profile, isAr]);

  const profileImageSrc = useMemo(() => {
    if (!profile) return "";

    if (profile.profileImageUrl) {
      return profile.profileImageUrl;
    }

    if (profile.profileImageBase64) {
      const mime = profile.profileImageMimeType || "image/jpeg";

      if (profile.profileImageBase64.startsWith("data:")) {
        return profile.profileImageBase64;
      }

      return `data:${mime};base64,${profile.profileImageBase64}`;
    }

    return "";
  }, [profile]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesFilter =
        requestFilter === "all" ||
        item.source === requestFilter ||
        (requestFilter === "paid" && item.paymentStatus === "paid") ||
        (requestFilter === "pending" &&
          ["pending", "pending_payment", "pending_review"].includes(
            String(item.paymentStatus || item.status).toLowerCase(),
          )) ||
        (requestFilter === "completed" &&
          String(item.status).toLowerCase().includes("completed"));

      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [
        item.reference,
        item.serviceType,
        item.consultationType,
        item.consultationMethod,
        item.consultationPrice,
        item.assignmentMode,
        item.selectedLawyerName,
        item.assignedToEmail,
        item.clientName,
        item.clientPhone,
        item.clientEmail,
        item.clientMessage,
        item.status,
        item.paymentStatus,
        item.amount,
        item.appointmentDate,
        item.appointmentTime,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [requests, requestFilter, search]);

  const requestStats = useMemo(() => {
    return {
      total: requests.length,
      bookings: requests.filter((item) => item.source === "booking").length,
      emergency: requests.filter((item) => item.source === "emergency").length,
      paid: requests.filter((item) => item.paymentStatus === "paid").length,
    };
  }, [requests]);

  async function loadData(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      // Load the account first. Requests must never be requested for a locked
      // provider, even if the UI is later manipulated in the browser.
      const profileRes = await fetch("/api/provider/me", { cache: "no-store" });
      const profileData = await profileRes.json().catch(() => ({}));

      if (!profileRes.ok || !profileData.ok) {
        throw new Error(profileData.error ?? "Failed to load profile");
      }

      const provider = profileData.provider as ProviderProfile;

      setProfile(provider);
      setSelectedMainSpecialty(getMainSpecialty(provider));
      setSelectedSubSpecialties(getSubSpecialties(provider));

      if (!provider.access?.canUseDashboard) {
        setRequests([]);
        setActiveTab("requests");
        return;
      }

      const requestsRes = await fetch("/api/provider/requests", {
        cache: "no-store",
      });
      const requestsData = await requestsRes.json().catch(() => ({}));

      if (!requestsRes.ok || !requestsData.ok) {
        throw new Error(requestsData.error ?? "Failed to load requests");
      }

      setRequests(
        Array.isArray(requestsData.requests) ? requestsData.requests : [],
      );
    } catch {
      setError(
        isAr
          ? "تعذر تحميل بيانات الحساب. يرجى تسجيل الدخول مرة أخرى."
          : "Could not load account data. Please login again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);

  function setSubSpecialtyAt(index: number, value: string) {
    setSelectedSubSpecialties((prev) => {
      const next = [...prev];

      if (!value) {
        next[index] = "";
      } else {
        next[index] = value;
      }

      return Array.from(new Set(next.filter(Boolean))).slice(0, 2);
    });
  }

  async function updateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || !profile?.access.canUseDashboard) return;

    if (!selectedMainSpecialty) {
      setSuccess(null);
      setError(
        isAr
          ? "يرجى اختيار التخصص الرئيسي"
          : "Please select the main specialty",
      );
      return;
    }

    if (selectedSubSpecialties.length === 0) {
      setSuccess(null);
      setError(
        isAr
          ? "يرجى اختيار تخصص فرعي واحد على الأقل"
          : "Please select at least one sub-specialty",
      );
      return;
    }

    const fd = new FormData(e.currentTarget);

    const specialties = {
      main: selectedMainSpecialty,
      subs: selectedSubSpecialties,
    };

    fd.set("specialtyMain", selectedMainSpecialty);
    fd.set("specialtySubs", JSON.stringify(selectedSubSpecialties));
    fd.set("specialties", JSON.stringify(specialties));

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Update failed");
      }

      const updatedProvider = data.provider as ProviderProfile;

      setProfile(updatedProvider);
      setSelectedMainSpecialty(getMainSpecialty(updatedProvider));
      setSelectedSubSpecialties(getSubSpecialties(updatedProvider));

      setSuccess(
        isAr ? "تم تحديث البروفايل بنجاح" : "Profile updated successfully",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر تحديث البروفايل"
            : "Could not update profile",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateLicense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (licenseSaving || !profile?.access.canUpdateLicense) return;

    const fd = new FormData(e.currentTarget);
    fd.set("action", "update_license");

    setLicenseSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "License update failed");
      }

      setSuccess(
        isAr
          ? "تم إرسال الرخصة الجديدة. سيبقى الحساب مقفلاً حتى تراجع الإدارة حالة الحساب."
          : "The renewed license was submitted. The account remains locked until the administrator reviews the account status.",
      );

      await loadData({ silent: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر تحديث الرخصة"
            : "Could not update license",
      );
    } finally {
      setLicenseSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/provider/logout", {
      method: "POST",
    }).catch(() => null);

    window.location.href = `/${locale}/join`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <Clock className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-text-muted">
              {isAr ? "جاري تحميل لوحة المحامي..." : "Loading dashboard..."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] py-12">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <XCircle className="mx-auto mb-3 h-12 w-12 text-red-600" />
            <h1 className="text-xl font-extrabold text-text-primary">
              {isAr ? "غير مصرح" : "Unauthorized"}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {error ??
                (isAr
                  ? "يرجى تسجيل الدخول للوصول إلى لوحة المحامي."
                  : "Please login to access the provider dashboard.")}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const access = profile.access;
  const accountStatusKey = access.reason ?? profile.status;
  const accountStatus =
    statusLabels[accountStatusKey] ?? statusLabels.pending;

  if (!access.canUseDashboard) {
    const lockMessage = getLockMessage(access.reason, isAr);

    return (
      <main className="min-h-screen bg-[#F7F8FA] py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-primary-dark via-primary to-primary-dark p-6 text-white">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt={profileName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <LockKeyhole size={30} />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white/70">
                      {isAr ? "لوحة مقدم الخدمة" : "Provider Dashboard"}
                    </p>
                    <h1 className="mt-1 text-2xl font-extrabold text-white">
                      {profileName}
                    </h1>
                    <p className="mt-1 text-sm font-bold text-white/75">
                      {profile.registrationNo}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <LogOut size={16} />
                  {isAr ? "تسجيل خروج" : "Logout"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {success}
            </div>
          )}

          <section className="mt-6 rounded-3xl border border-amber-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                {access.licenseExpired ? (
                  <AlertTriangle size={28} />
                ) : (
                  <LockKeyhole size={28} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${accountStatus.className}`}
                >
                  {accountStatus[isAr ? "ar" : "en"]}
                </div>

                <h2 className="text-xl font-extrabold text-text-primary">
                  {lockMessage.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-7 text-text-muted">
                  {lockMessage.body}
                </p>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-text-muted">
                  {isAr ? "تاريخ انتهاء الرخصة:" : "License expiry date:"}{" "}
                  <span className="text-text-primary" dir="ltr">
                    {profile.licenseExpiryDate || "-"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {access.canUpdateLicense && (
            <section className="mt-6 rounded-3xl border border-red-100 bg-white p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-text-primary">
                    {isAr ? "تحديث الرخصة المنتهية" : "Renew expired license"}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-text-muted">
                    {isAr
                      ? "هذا هو الإجراء الوحيد المتاح حتى تتم مراجعة الرخصة الجديدة."
                      : "This is the only available action until the renewed license is reviewed."}
                  </p>
                </div>
              </div>

              <form onSubmit={updateLicense} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={
                      isAr
                        ? "تاريخ انتهاء الرخصة الجديدة"
                        : "New license expiry date"
                    }
                  >
                    <input
                      name="licenseExpiryDate"
                      type="date"
                      min={minimumRenewalDate()}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  </Field>

                  <Field
                    label={
                      isAr ? "ملف الرخصة الجديدة" : "Renewed license file"
                    }
                  >
                    <input
                      name="licenseFile"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary"
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={licenseSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UploadCloud size={17} />
                  {licenseSaving
                    ? isAr
                      ? "جاري رفع الرخصة..."
                      : "Uploading license..."
                    : isAr
                      ? "إرسال الرخصة للمراجعة"
                      : "Submit license for review"}
                </button>
              </form>
            </section>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-primary-dark via-primary to-primary-dark p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                  {profileImageSrc ? (
                    <img
                      src={profileImageSrc}
                      alt={profileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={30} />
                  )}
                </div>

                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                    <ShieldCheck size={14} />
                    {isAr ? "لوحة مقدم الخدمة" : "Provider Dashboard"}
                  </div>

                  <h1 className="text-2xl font-extrabold text-white">
                    {profileName}
                  </h1>

                  <p className="mt-1 text-sm font-bold text-white/75">
                    {profile.registrationNo}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white">
                  <CheckCircle size={13} />
                  {accountStatus[isAr ? "ar" : "en"]}
                </span>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  <LogOut size={16} />
                  {isAr ? "تسجيل خروج" : "Logout"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`rounded-full border px-5 py-2.5 text-sm font-extrabold transition ${
              activeTab === "requests"
                ? "border-primary bg-primary text-white"
                : "border-gray-200 bg-white text-text-muted hover:text-text-primary"
            }`}
          >
            {isAr ? "طلباتي" : "My Requests"}
            {requests.length > 0 && (
              <span className="ms-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`rounded-full border px-5 py-2.5 text-sm font-extrabold transition ${
              activeTab === "profile"
                ? "border-primary bg-primary text-white"
                : "border-gray-200 bg-white text-text-muted hover:text-text-primary"
            }`}
          >
            {isAr ? "تعديل البروفايل" : "Edit Profile"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}

        {activeTab === "requests" ? (
          <section className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <StatCard
                label={isAr ? "إجمالي الطلبات" : "Total Requests"}
                value={requestStats.total}
                icon={FileText}
              />
              <StatCard
                label={isAr ? "حجوزات" : "Bookings"}
                value={requestStats.bookings}
                icon={CalendarDays}
              />
              <StatCard
                label={isAr ? "طوارئ" : "Emergency"}
                value={requestStats.emergency}
                icon={Clock}
              />
              <StatCard
                label={isAr ? "مدفوع" : "Paid"}
                value={requestStats.paid}
                icon={CreditCard}
              />
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", ar: "الكل", en: "All" },
                    { key: "booking", ar: "الحجوزات", en: "Bookings" },
                    { key: "emergency", ar: "الطوارئ", en: "Emergency" },
                    { key: "paid", ar: "المدفوعة", en: "Paid" },
                    { key: "pending", ar: "بانتظار", en: "Pending" },
                    { key: "completed", ar: "مكتملة", en: "Completed" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setRequestFilter(item.key as typeof requestFilter)
                      }
                      className={`rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                        requestFilter === item.key
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 bg-white text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {item[isAr ? "ar" : "en"]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => loadData({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-extrabold text-text-muted transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {isAr ? "تحديث الطلبات" : "Refresh"}
                </button>
              </div>

              <div className="relative mt-4">
                <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    isAr
                      ? "بحث برقم الطلب، العميل، الهاتف، الخدمة..."
                      : "Search reference, client, phone, service..."
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-text-primary outline-none focus:border-primary ltr:pl-11 rtl:pr-11"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead className="bg-gray-50 text-text-muted">
                    <tr>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "رقم الطلب" : "Reference"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "نوع الطلب" : "Request Type"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "الخدمة / القضية" : "Service / Case"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "بيانات العميل" : "Client Details"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "الموعد" : "Appointment"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "الدفع" : "Payment"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "الحالة" : "Status"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "التاريخ" : "Date"}
                      </th>
                      <th className="px-4 py-4 text-start font-extrabold">
                        {isAr ? "الإجراء" : "Action"}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-10 text-center text-text-muted"
                        >
                          {isAr ? "لا توجد طلبات حالياً" : "No requests found"}
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((item) => {
                        const requestStatus = getStatusLabel(item.status, isAr);
                        const paymentStatus = getStatusLabel(
                          item.paymentStatus,
                          isAr,
                        );

                        return (
                          <tr
                            key={`${item.source}-${item.id}`}
                            className="border-t border-gray-100 align-top"
                          >
                            <td className="px-4 py-4 font-bold text-text-primary">
                              {item.reference || item.id}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  item.source === "booking"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {formatSource(item.source, isAr)}
                              </span>
                            </td>

                            <td className="max-w-[250px] px-4 py-4 text-text-muted">
                              <span className="line-clamp-3">
                                {item.serviceType || "-"}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-bold text-text-primary">
                                {item.clientName || "-"}
                              </div>
                              <div className="mt-1 text-xs text-text-muted" dir="ltr">
                                {item.clientPhone || "-"}
                              </div>
                              <div className="mt-1 max-w-[220px] truncate text-xs text-text-muted" dir="ltr">
                                {item.clientEmail || "-"}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-text-muted">
                              {formatRequestDate(
                                item.appointmentDate,
                                item.appointmentTime,
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {item.paymentStatus ? (
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-bold ${paymentStatus.className}`}
                                >
                                  {paymentStatus.label}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-text-muted">
                                  -
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${requestStatus.className}`}
                              >
                                {requestStatus.label}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-text-muted">
                              {formatDate(item.createdAt, isAr)}
                            </td>

                            <td className="px-4 py-4">
                              <a
                                href={`/${locale}/provider-dashboard/requests/${item.source}/${item.id}`}
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-primary-dark"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {isAr ? "تفاصيل الطلب" : "Details"}
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </section>
        ) : (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-extrabold text-text-primary">
              {isAr ? "تعديل بيانات البروفايل" : "Edit Profile Details"}
            </h2>

            <form onSubmit={updateProfile} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={isAr ? "الاسم بالعربي" : "Arabic Name"}>
                  <input
                    name="fullNameAr"
                    defaultValue={profile.fullNameAr}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </Field>

                <Field label={isAr ? "الاسم بالإنجليزي" : "English Name"}>
                  <input
                    name="fullNameEn"
                    defaultValue={profile.fullNameEn}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </Field>

                <Field label={isAr ? "البريد الإلكتروني" : "Email"}>
                  <div className="relative">
                    <Mail className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
                    <input
                      name="email"
                      type="email"
                      defaultValue={profile.email}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary ltr:pl-11 rtl:pr-11"
                    />
                  </div>
                </Field>

                <Field label={isAr ? "رقم الهاتف" : "Phone"}>
                  <div className="relative">
                    <Phone className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
                    <input
                      name="phone"
                      defaultValue={profile.phone}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary ltr:pl-11 rtl:pr-11"
                    />
                  </div>
                </Field>

                <Field label={isAr ? "اللغة" : "Language"}>
                  <div className="relative">
                    <Languages className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
                    <select
                      name="language"
                      defaultValue={profile.language}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary ltr:pl-11 rtl:pr-11"
                    >
                      <option value="Arabic">{isAr ? "العربية" : "Arabic"}</option>
                      <option value="English">{isAr ? "الإنجليزية" : "English"}</option>
                      <option value="Both">{isAr ? "كلاهما" : "Both"}</option>
                    </select>
                  </div>
                </Field>

                <Field label={isAr ? "رقم الرخصة" : "License Number"}>
                  <div className="relative">
                    <BadgeCheck className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
                    <input
                      value={profile.registrationNo}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-text-muted outline-none ltr:pl-11 rtl:pr-11"
                    />
                  </div>
                </Field>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-text-primary">
                    {isAr ? "التخصصات / مجالات الخدمة" : "Specialties / Service Areas"}
                  </label>

                  <p className="mb-4 text-xs text-text-muted">
                    {isAr
                      ? "اختر تخصصاً رئيسياً واحداً، ثم اختر تخصصين فرعيين كحد أقصى."
                      : "Choose one main specialty, then select up to 2 sub-specialties."}
                  </p>

                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-bold text-text-muted">
                      {isAr ? "التخصص الرئيسي" : "Main Specialty"}
                    </label>

                    <select
                      name="specialtyMain"
                      value={selectedMainSpecialty}
                      onChange={(e) => {
                        const value = e.target.value;

                        setSelectedMainSpecialty(value);
                        setSelectedSubSpecialties((prev) =>
                          prev.filter((item) => item !== value),
                        );
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="">
                        {isAr ? "اختر التخصص الرئيسي" : "Select main specialty"}
                      </option>

                      {lawyerSpecialties.map((item) => (
                        <option key={item.value} value={item.value}>
                          {isAr ? item.ar : item.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-text-muted">
                        {isAr ? "التخصص الفرعي الأول" : "First Sub-specialty"}
                      </label>

                      <select
                        value={selectedSubSpecialties[0] ?? ""}
                        onChange={(e) => setSubSpecialtyAt(0, e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                      >
                        <option value="">
                          {isAr ? "اختر التخصص الفرعي الأول" : "Select first sub-specialty"}
                        </option>

                        {lawyerSpecialties.map((item) => (
                          <option
                            key={item.value}
                            value={item.value}
                            disabled={
                              selectedMainSpecialty === item.value ||
                              selectedSubSpecialties[1] === item.value
                            }
                          >
                            {isAr ? item.ar : item.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-text-muted">
                        {isAr ? "التخصص الفرعي الثاني" : "Second Sub-specialty"}
                      </label>

                      <select
                        value={selectedSubSpecialties[1] ?? ""}
                        onChange={(e) => setSubSpecialtyAt(1, e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                      >
                        <option value="">
                          {isAr ? "اختر التخصص الفرعي الثاني" : "Select second sub-specialty"}
                        </option>

                        {lawyerSpecialties.map((item) => (
                          <option
                            key={item.value}
                            value={item.value}
                            disabled={
                              selectedMainSpecialty === item.value ||
                              selectedSubSpecialties[0] === item.value
                            }
                          >
                            {isAr ? item.ar : item.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />
                {saving
                  ? isAr
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isAr
                    ? "حفظ التعديلات"
                    : "Save Changes"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}


function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
        <Icon size={19} />
      </div>
      <p className="text-xs font-bold text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-text-primary">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-text-primary">
        {label}
      </span>
      {children}
    </label>
  );
}
