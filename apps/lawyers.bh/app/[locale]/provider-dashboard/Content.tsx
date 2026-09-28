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
import {
  isLicenseRenewalErrorCode,
  licenseRenewalErrorMessage,
  validateLicenseRenewalInput,
  type LicenseRenewalErrorCode,
} from "@/lib/provider/license-renewal-validation";
import { providerBalanceDocumentActions } from "./providerBalanceActions";
import { providerDisplayName } from "./providerDisplayName";
import { providerDashboardCards, type ProviderDashboardView } from "./providerDashboardNavigation";
import { providerDashboardDataNeeds } from "./providerDashboardView";

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
  subscriptionTypes?: string[];
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
  registrationLevel?: string | null;
  ibanNumber?: string;
  crNumber?: string;
  experienceYears?: number;
  workingHours?: string;
  licenseExpiryDate: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  profileCompleted: boolean;
  isActive: boolean;
  access: ProviderAccess;

  profileImageUrl?: string | null;
  profileImageBase64?: string | null;
  profileImageMimeType?: string | null;
  profileImageFileName?: string | null;
  licenseFileName?: string | null;
  ibanCertificateFileName?: string | null;
  institutionLicenseFileName?: string | null;
  personalIdFileName?: string | null;
};

type PendingProfileChange = {
  id: string;
  status: "pending";
  proposedValues: Record<string, unknown>;
  proposedFiles: Record<string, { fileName: string; mimeType: string }>;
  updatedAt: string;
};

type ProviderRequest = {
  id: string;
  reference: string;
  source: "booking" | "emergency";
  serviceType: string;
  caseTypeCode?: string | null;
  caseTypeLabelAr?: string | null;
  caseTypeLabelEn?: string | null;
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

type ProviderBalance = {
  id: string; publicReference: string; customerName: string; customerPhone: string;
  customerEmail?: string | null; description: string; amount: string; currencyCode: string;
  dueDate?: string | null; status: string; paymentUrl?: string | null; tapStatus?: string | null; paidAt?: string | null; createdAt: string;
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

  return new Intl.DateTimeFormat(isAr ? "ar-BH" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bahrain",
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

  return isAr ? `${amount.toFixed(3)} د.ب` : `${amount.toFixed(3)} BHD`;
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

export default function Content({ view }: { view: ProviderDashboardView }) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [pendingProfileChange, setPendingProfileChange] = useState<PendingProfileChange | null>(null);
  const [lastProfileRejection, setLastProfileRejection] = useState<{ rejectionReason?: string | null } | null>(null);
  const [emailChallenge, setEmailChallenge] = useState<{ id: string; email: string } | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [balances, setBalances] = useState<ProviderBalance[]>([]);
  const [balancePage, setBalancePage] = useState(1);
  const [balancePagination, setBalancePagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [requestFilter, setRequestFilter] = useState<"all" | "booking" | "emergency" | "paid" | "pending" | "completed">("all");
  const [requestPage, setRequestPage] = useState(1);
  const [requestPagination, setRequestPagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [licenseErrors, setLicenseErrors] = useState<{
    licenseExpiryDate?: LicenseRenewalErrorCode;
    licenseFile?: LicenseRenewalErrorCode;
  }>({});

  const [selectedMainSpecialty, setSelectedMainSpecialty] = useState("");
  const [selectedSubSpecialties, setSelectedSubSpecialties] = useState<string[]>([]);

  const profileName = useMemo(() => {
    if (!profile) return "";

    return providerDisplayName(profile, isAr);
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

  const filteredRequests = requests;

  async function loadRequests(page: number, filter = requestFilter, query = search) {
    const source = filter === "booking" || filter === "emergency" ? filter : "all";
    const status = ["paid", "pending", "completed"].includes(filter) ? filter : "all";
    const params = new URLSearchParams({ page: String(page), source, status });
    if (query.trim()) params.set("query", query.trim());
    const response = await fetch(`/api/provider/requests?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.status === 403 && data.error === "terms_acceptance_required") {
      window.location.assign(`/${isAr ? "ar" : "en"}/provider-dashboard/terms`);
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to load requests");
    setRequests(Array.isArray(data.requests) ? data.requests : []);
    setRequestPagination(data.pagination ?? { page, pageSize: 10, totalItems: 0, totalPages: 0 });
    setRequestPage(page);
  }

  async function loadBalances(page = 1) {
    const response = await fetch(`/api/provider/balances?page=${page}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to load balances");
    setBalances(Array.isArray(data.balances) ? data.balances : []);
    setBalancePagination(data.pagination ?? { page, pageSize: 10, totalItems: 0, totalPages: 0 });
    setBalancePage(page);
  }

  async function createBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBalanceSaving(true); setError(null); setSuccess(null);
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/provider/balances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not create balance");
      form.reset(); await loadBalances(1);
      setSuccess(isAr ? "تم إنشاء الرصيد وحفظه" : "Balance created and saved");
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isAr ? "تعذر إنشاء الرصيد" : "Could not create balance")); }
    finally { setBalanceSaving(false); }
  }

  async function createPaymentLink(id: string) {
    setError(null); setSuccess(null);
    const response = await fetch(`/api/provider/balances/${id}/payment-link?locale=${locale}`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setError(data.code === "CUSTOMER_CONTACT_REQUIRED"
        ? (isAr ? "يرجى إدخال رقم هاتف أو بريد إلكتروني صحيح للعميل" : "Enter a valid customer phone number or email address")
        : (data.error ?? (isAr ? "تعذر إنشاء رابط الدفع" : "Could not create payment link")));
      return;
    }
    await loadBalances(balancePage);
    await navigator.clipboard?.writeText(data.paymentUrl).catch(() => undefined);
    setSuccess(isAr ? "تم إنشاء رابط الدفع ونسخه" : "Payment link created and copied");
  }

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
        throw new Error(profileRes.status === 401 ? "SESSION_EXPIRED" : "PROFILE_LOAD_FAILED");
      }

      const provider = profileData.provider as ProviderProfile;

      setProfile(provider);
      setPendingProfileChange(profileData.pendingProfileChange ?? null);
      setLastProfileRejection(profileData.lastRejectedProfileChange ?? null);
      setSelectedMainSpecialty(getMainSpecialty(provider));
      setSelectedSubSpecialties(getSubSpecialties(provider));

      if (!provider.access?.canUseDashboard) {
        setRequests([]);
        return;
      }

      const needs = providerDashboardDataNeeds(view);
      if (needs.requests) {
        try {
          await loadRequests(1);
        } catch {
          setError(isAr ? "تعذر تحميل الطلبات. يرجى المحاولة مرة أخرى." : "Could not load requests. Please try again.");
        }
      } else if (needs.balances) {
        try {
          await loadBalances(1);
        } catch {
          setError(isAr ? "تعذر تحميل الأرصدة. يرجى المحاولة مرة أخرى." : "Could not load balances. Please try again.");
        }
      }
    } catch (cause) {
      const sessionExpired = cause instanceof Error && cause.message === "SESSION_EXPIRED";
      setError(
        sessionExpired
          ? (isAr ? "انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى." : "Your session expired. Please login again.")
          : (isAr ? "تعذر تحميل بيانات الحساب. يرجى المحاولة مرة أخرى." : "Could not load account data. Please try again."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr, view]);

  useEffect(() => {
    if (loading || view !== "requests") return;
    const timer = window.setTimeout(() => {
      loadRequests(1, requestFilter, search).catch(() => setError(isAr ? "تعذر تحميل الطلبات" : "Could not load requests"));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
    const requestedEmail = String(fd.get("email") ?? "").trim().toLowerCase();

    const specialties = {
      main: selectedMainSpecialty,
      subs: selectedSubSpecialties,
    };

    fd.set("specialtyMain", selectedMainSpecialty);
    fd.set("specialtySubs", JSON.stringify(selectedSubSpecialties));
    fd.set("specialties", JSON.stringify(specialties));
    fd.set("subscriptionTypes", JSON.stringify(fd.getAll("subscriptionType")));

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (requestedEmail && requestedEmail !== profile.email.toLowerCase()) {
        const emailResponse = await fetch("/api/provider/email-change/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: requestedEmail, locale: isAr ? "ar" : "en" }) });
        const emailData = await emailResponse.json().catch(() => ({}));
        if (!emailResponse.ok || !emailData.ok) throw new Error(emailData.error ?? "Could not send email verification code");
        setEmailChallenge({ id: emailData.challengeId, email: requestedEmail });
      }
      fd.set("email", profile.email);
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Update failed");
      }

      setSuccess(
        data.pendingReview
          ? isAr
            ? "تم حفظ البيانات العادية، وإرسال التعديلات الحساسة لمراجعة الإدارة. ستبقى البيانات الحالية فعّالة حتى الموافقة."
            : "Ordinary details were saved and sensitive changes were sent for review. Current approved details remain active."
          : isAr
            ? "تم تحديث البروفايل بنجاح"
            : "Profile updated successfully",
      );
      await loadData({ silent: true });
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

  async function verifyNewEmail() {
    if (!emailChallenge || !/^\d{6}$/.test(emailCode)) return;
    setEmailVerifying(true); setError(null); setSuccess(null);
    const response = await fetch("/api/provider/email-change/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId: emailChallenge.id, code: emailCode }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setEmailChallenge(null); setEmailCode("");
      setSuccess(isAr ? "تم التحقق من البريد الإلكتروني الجديد واعتماده." : "The new email was verified and saved.");
      await loadData({ silent: true });
    } else setError(data.error ?? (isAr ? "رمز التحقق غير صحيح" : "Invalid verification code"));
    setEmailVerifying(false);
  }

  async function updateLicense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (licenseSaving || !profile?.access.canUpdateLicense) return;

    const fd = new FormData(e.currentTarget);
    const expiryValue = String(fd.get("licenseExpiryDate") ?? "");
    const fileValue = fd.get("licenseFile");
    const selectedFile = fileValue instanceof File ? fileValue : null;
    const validationErrors = validateLicenseRenewalInput({
      licenseExpiryDate: expiryValue,
      file: selectedFile,
    });

    if (validationErrors.licenseExpiryDate || validationErrors.licenseFile) {
      setLicenseErrors(validationErrors);
      const firstInvalidName = validationErrors.licenseExpiryDate
        ? "licenseExpiryDate"
        : "licenseFile";
      const field = e.currentTarget.elements.namedItem(firstInvalidName);
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    fd.set("action", "update_license");

    setLicenseSaving(true);
    setLicenseErrors({});
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const code = data.code;
        if (isLicenseRenewalErrorCode(code)) {
          if (code.startsWith("LICENSE_EXPIRY_")) {
            setLicenseErrors({ licenseExpiryDate: code });
          } else if (code.startsWith("LICENSE_FILE_")) {
            setLicenseErrors({ licenseFile: code });
          }
          throw new Error(licenseRenewalErrorMessage(code, isAr ? "ar" : "en"));
        }
        throw new Error(
          licenseRenewalErrorMessage(
            "LICENSE_UPLOAD_FAILED",
            isAr ? "ar" : "en",
          ),
        );
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

    window.location.href = `/${locale}/login/provider`;
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
          <div className="overflow-hidden rounded-3xl border border-red-900/10 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-[#7A1616] via-[#9F1D1D] to-[#5A0D0D] p-6 text-white">
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

              <form onSubmit={updateLicense} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    required
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
                      aria-invalid={Boolean(licenseErrors.licenseExpiryDate)}
                      aria-describedby="license-expiry-error"
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-primary ${
                        licenseErrors.licenseExpiryDate
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    {licenseErrors.licenseExpiryDate && (
                      <span
                        id="license-expiry-error"
                        role="alert"
                        className="mt-1.5 block text-xs font-bold text-red-600"
                      >
                        {licenseRenewalErrorMessage(
                          licenseErrors.licenseExpiryDate,
                          isAr ? "ar" : "en",
                        )}
                      </span>
                    )}
                  </Field>

                  <Field
                    required
                    label={
                      isAr ? "ملف الرخصة الجديدة" : "Renewed license file"
                    }
                  >
                    <input
                      name="licenseFile"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      required
                      aria-invalid={Boolean(licenseErrors.licenseFile)}
                      aria-describedby="license-file-help license-file-error"
                      className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary ${
                        licenseErrors.licenseFile
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    <span
                      id="license-file-help"
                      className="mt-1.5 block text-xs font-medium text-text-muted"
                    >
                      {isAr
                        ? "PDF أو JPG أو PNG، بحد أقصى 5 ميجابايت"
                        : "PDF, JPG, or PNG, up to 5 MB"}
                    </span>
                    {licenseErrors.licenseFile && (
                      <span
                        id="license-file-error"
                        role="alert"
                        className="mt-1.5 block text-xs font-bold text-red-600"
                      >
                        {licenseRenewalErrorMessage(
                          licenseErrors.licenseFile,
                          isAr ? "ar" : "en",
                        )}
                      </span>
                    )}
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
        <div className="mb-8 overflow-hidden rounded-3xl border border-red-900/10 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#7A1616] via-[#9F1D1D] to-[#5A0D0D] p-6 text-white">
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

        {view !== "home" && (
          <a href={`/${locale}/provider-dashboard`} className="mb-6 inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {isAr ? "العودة للوحة التحكم" : "Back to Dashboard"}
          </a>
        )}

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

        {view === "home" ? (
          <section className="grid gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            {providerDashboardCards(locale).map((card) => {
              const Icon = card.view === "requests" ? FileText : card.view === "balances" ? CreditCard : User;
              return <a key={card.view} href={card.href} className="group rounded-3xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" aria-hidden="true" /></div><h2 className="text-lg font-extrabold text-text-primary">{card.title}</h2><p className="mt-2 min-h-14 text-sm leading-7 text-text-muted">{card.description}</p><span className="mt-5 inline-flex text-sm font-extrabold text-primary">{isAr ? "فتح الصفحة" : "Open page"}</span></a>;
            })}
          </section>
        ) : view === "requests" ? (
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
                      onClick={() => {
                        const next = item.key as typeof requestFilter;
                        setRequestFilter(next);
                        loadRequests(1, next, search).catch(() => setError(isAr ? "تعذر تحميل الطلبات" : "Could not load requests"));
                      }}
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
                                {(isAr ? item.caseTypeLabelAr : item.caseTypeLabelEn) || item.serviceType || "-"}
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
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
                <button type="button" disabled={requestPage <= 1} onClick={() => loadRequests(requestPage - 1).catch(() => setError(isAr ? "تعذر تحميل الطلبات" : "Could not load requests"))} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">{isAr ? "السابق" : "Previous"}</button>
                <span className="font-bold text-text-muted">{isAr ? `صفحة ${requestPagination.page} من ${Math.max(requestPagination.totalPages, 1)}` : `Page ${requestPagination.page} of ${Math.max(requestPagination.totalPages, 1)}`}</span>
                <button type="button" disabled={requestPage >= requestPagination.totalPages} onClick={() => loadRequests(requestPage + 1).catch(() => setError(isAr ? "تعذر تحميل الطلبات" : "Could not load requests"))} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">{isAr ? "التالي" : "Next"}</button>
              </div>
            </div>

          </section>
        ) : view === "balances" ? (
          <section className="space-y-5">
              <form onSubmit={createBalance} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-extrabold">{isAr ? "إنشاء رصيد للعميل" : "Create Customer Balance"}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field required label={isAr ? "اسم العميل" : "Customer Name"}><input required name="customerName" className="w-full rounded-xl border border-gray-200 px-4 py-3" /></Field>
                  <Field required label={isAr ? "رقم الهاتف" : "Phone"}><input required name="customerPhone" dir="ltr" className="w-full rounded-xl border border-gray-200 px-4 py-3" /></Field>
                  <Field label={isAr ? "البريد الإلكتروني" : "Email"}><input name="customerEmail" type="email" dir="ltr" className="w-full rounded-xl border border-gray-200 px-4 py-3" /></Field>
                  <Field required label={isAr ? "المبلغ" : "Amount"}><input required name="amount" type="number" min="0.001" step="0.001" dir="ltr" className="w-full rounded-xl border border-gray-200 px-4 py-3" /></Field>
                  <Field label={isAr ? "تاريخ الاستحقاق" : "Due Date"}><input name="dueDate" type="date" className="w-full rounded-xl border border-gray-200 px-4 py-3" /></Field>
                  <div className="md:col-span-2"><Field required label={isAr ? "وصف الخدمة" : "Service Description"}><textarea required name="description" rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-3" /></Field></div>
                </div>
                <button disabled={balanceSaving} className="mt-5 rounded-xl bg-primary px-6 py-3 font-extrabold text-white disabled:opacity-50">{balanceSaving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الرصيد" : "Save Balance")}</button>
              </form>
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between p-5"><h2 className="text-xl font-extrabold">{isAr ? "الأرصدة وروابط الدفع" : "Balances & Payment Links"}</h2><button type="button" onClick={() => loadBalances(balancePage)} className="rounded-xl border px-4 py-2 text-sm font-bold">{isAr ? "تحديث" : "Refresh"}</button></div>
              <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-text-muted"><tr><th className="px-4 py-3 text-start">{isAr ? "العميل" : "Customer"}</th><th className="px-4 py-3 text-start">{isAr ? "الخدمة" : "Service"}</th><th className="px-4 py-3 text-start">{isAr ? "المبلغ" : "Amount"}</th><th className="px-4 py-3 text-start">{isAr ? "الحالة" : "Status"}</th><th className="px-4 py-3 text-start">{isAr ? "الإجراء" : "Action"}</th></tr></thead>
                <tbody>{balances.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-text-muted">{isAr ? "لا توجد أرصدة" : "No balances found"}</td></tr> : balances.map((balance) => { const state = getStatusLabel(balance.status, isAr); const documents = providerBalanceDocumentActions(balance.status, balance.tapStatus); return <tr key={balance.id} className="border-t"><td className="px-4 py-4"><strong>{balance.customerName}</strong><div dir="ltr" className="text-xs text-text-muted">{balance.customerPhone}</div></td><td className="max-w-xs px-4 py-4">{balance.description}<div className="text-xs text-text-muted">{balance.publicReference}</div></td><td className="px-4 py-4 font-extrabold" dir="ltr">{Number(balance.amount).toFixed(3)} {balance.currencyCode}</td><td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${state.className}`}>{state.label}</span></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{["draft", "expired"].includes(balance.status) && <button type="button" onClick={() => createPaymentLink(balance.id)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">{isAr ? "إنشاء رابط" : "Create Link"}</button>}{balance.paymentUrl && <button type="button" onClick={() => navigator.clipboard?.writeText(balance.paymentUrl!)} className="rounded-lg border px-3 py-2 text-xs font-bold">{isAr ? "نسخ الرابط" : "Copy Link"}</button>}{documents.invoice && <a href={`/api/provider/balances/${balance.id}/invoice?locale=${locale}`} className="rounded-lg border px-3 py-2 text-xs font-bold">{isAr ? "الفاتورة PDF" : "Invoice PDF"}</a>}{documents.receipt && <a href={`/api/provider/balances/${balance.id}/receipt?locale=${locale}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{isAr ? "الإيصال PDF" : "Receipt PDF"}</a>}</div></td></tr>; })}</tbody>
              </table></div>
              <div className="flex items-center justify-between border-t p-4"><button disabled={balancePage <= 1} onClick={() => loadBalances(balancePage - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">{isAr ? "السابق" : "Previous"}</button><span>{balancePagination.page} / {Math.max(1, balancePagination.totalPages)}</span><button disabled={balancePage >= balancePagination.totalPages} onClick={() => loadBalances(balancePage + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">{isAr ? "التالي" : "Next"}</button></div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-extrabold text-text-primary">
              {isAr ? "تعديل بيانات البروفايل" : "Edit Profile Details"}
            </h2>

            {pendingProfileChange ? <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>{isAr ? "بانتظار مراجعة الإدارة" : "Pending administrator review"}</strong><p className="mt-1">{isAr ? "بياناتك المعتمدة الحالية ما زالت فعّالة. يمكنك تعديل الطلب المعلّق من النموذج أدناه." : "Your current approved details remain active. You can update the pending request below."}</p></div> : null}
            {!pendingProfileChange && lastProfileRejection?.rejectionReason ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><strong>{isAr ? "تم رفض آخر تعديل" : "Last change was rejected"}</strong><p className="mt-1">{lastProfileRejection.rejectionReason}</p></div> : null}

            <form key={pendingProfileChange?.updatedAt ?? "approved"} onSubmit={updateProfile} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={isAr ? "الاسم بالعربي" : "Arabic Name"}>
                  <input
                    name="fullNameAr"
                    defaultValue={String(pendingProfileChange?.proposedValues.fullNameAr ?? profile.fullNameAr)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </Field>

                <Field label={isAr ? "الاسم بالإنجليزي" : "English Name"}>
                  <input
                    name="fullNameEn"
                    defaultValue={String(pendingProfileChange?.proposedValues.fullNameEn ?? profile.fullNameEn)}
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

                {emailChallenge ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:col-span-2"><p className="mb-2 text-sm font-bold text-blue-900">{isAr ? `أرسلنا رمزاً إلى ${emailChallenge.email}` : `We sent a code to ${emailChallenge.email}`}</p><div className="flex flex-wrap gap-2"><input value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" className="rounded-xl border border-blue-200 bg-white px-4 py-2" /><button type="button" disabled={emailVerifying || emailCode.length !== 6} onClick={verifyNewEmail} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isAr ? "تأكيد البريد" : "Verify email"}</button></div></div> : null}

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
                    <input name="registrationNo" defaultValue={String(pendingProfileChange?.proposedValues.registrationNo ?? profile.registrationNo)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary ltr:pl-11 rtl:pr-11" />
                  </div>
                </Field>

                <Field label={isAr ? "درجة المحامي" : "Registration Level"}><select name="registrationLevel" defaultValue={String(pendingProfileChange?.proposedValues.registrationLevel ?? profile.registrationLevel ?? "")} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"><option value="">—</option><option value="cassation_lawyer">{isAr ? "محامي تمييز" : "Cassation lawyer"}</option><option value="practicing_lawyer">{isAr ? "محامي مشتغل" : "Practicing lawyer"}</option><option value="trainee_lawyer">{isAr ? "محامي متدرب" : "Trainee lawyer"}</option></select></Field>
                <Field label={isAr ? "سنوات الخبرة" : "Years of Experience"}><input name="experienceYears" type="number" min="0" max="80" defaultValue={profile.experienceYears ?? 0} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" /></Field>
                <Field label={isAr ? "ساعات العمل" : "Working Hours"}><input name="workingHours" defaultValue={profile.workingHours ?? ""} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" /></Field>
                <Field label={isAr ? "رقم الآيبان" : "IBAN"}><input name="ibanNumber" dir="ltr" defaultValue={String(pendingProfileChange?.proposedValues.ibanNumber ?? profile.ibanNumber ?? "")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase" /></Field>
                <Field label={isAr ? "تاريخ انتهاء الرخصة" : "License Expiry"}><input name="licenseExpiryDate" type="date" defaultValue={String(pendingProfileChange?.proposedValues.licenseExpiryDate ?? profile.licenseExpiryDate ?? "")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" /></Field>
                <Field label={isAr ? "السجل التجاري" : "Commercial Registration"}><input name="crNumber" defaultValue={String(pendingProfileChange?.proposedValues.crNumber ?? profile.crNumber ?? "")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" /></Field>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:col-span-2"><p className="mb-3 text-sm font-extrabold text-amber-900">{isAr ? "الأدوار — تحتاج موافقة الإدارة" : "Roles — administrator approval required"}</p><div className="grid gap-2 sm:grid-cols-2">{[["lawyer", "محامي", "Lawyer"], ["consultant", "مستشار", "Consultant"], ["mediator", "وسيط", "Mediator"], ["arbitrator", "محكم", "Arbitrator"], ["expert", "خبير", "Expert"], ["private_executor", "منفذ خاص", "Private executor"], ["private_notary", "كاتب عدل خاص", "Private notary"], ["translator", "مترجم", "Translator"]].map(([value, ar, en]) => { const proposed = pendingProfileChange?.proposedValues.subscriptionTypes; const selected = Array.isArray(proposed) ? proposed : (profile.subscriptionTypes ?? [profile.subscriptionType]); return <label key={value} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm"><input type="checkbox" name="subscriptionType" value={value} defaultChecked={selected.includes(value)} />{isAr ? ar : en}</label>; })}</div></div>

                <div className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2 sm:grid-cols-2">
                  {[["profileImage", isAr ? "الصورة الشخصية" : "Profile image", "image/jpeg,image/png,image/webp", profile.profileImageFileName], ["licenseFile", isAr ? "ملف الرخصة" : "License file", "application/pdf,image/jpeg,image/png,image/webp", profile.licenseFileName], ["ibanCertificate", isAr ? "شهادة الآيبان" : "IBAN certificate", "application/pdf,image/jpeg,image/png,image/webp", profile.ibanCertificateFileName], ["institutionLicense", isAr ? "رخصة المؤسسة" : "Institution license", "application/pdf,image/jpeg,image/png,image/webp", profile.institutionLicenseFileName], ["personalId", isAr ? "البطاقة الشخصية" : "Personal ID", "application/pdf,image/jpeg,image/png,image/webp", profile.personalIdFileName], ["signature", isAr ? "التوقيع" : "Signature", "image/jpeg,image/png,image/webp", null]].map(([name, label, accept, currentName]) => <label key={String(name)} className="rounded-xl border border-gray-200 bg-white p-3 text-sm"><span className="mb-1 block font-bold">{label}</span>{currentName ? <span className="mb-2 block text-xs text-text-muted">{isAr ? "الحالي:" : "Current:"} {currentName}</span> : null}{pendingProfileChange?.proposedFiles[String(name)] ? <span className="mb-2 block text-xs font-bold text-amber-700">{isAr ? "المقترح:" : "Proposed:"} {pendingProfileChange.proposedFiles[String(name)].fileName}</span> : null}<input type="file" name={String(name)} accept={String(accept)} className="block w-full text-xs" /></label>)}</div>

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
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-text-primary">
        {label}
        {required && (
          <span className="ms-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
