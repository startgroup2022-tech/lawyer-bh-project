"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  Upload,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import FileUploadCard from "./_components/complete-profile/FileUploadCard";
import AgreementSignatureSection from "./_components/complete-profile/AgreementSignatureSection";

const registrationLevelOptions = {
  en: [
    { value: "cassation_lawyer", label: "Lawyer before Court of Cassation" },
    { value: "practicing_lawyer", label: "Practicing Lawyer" },
    { value: "trainee_lawyer", label: "Trainee Lawyer" },
  ],
  ar: [
    { value: "cassation_lawyer", label: "محامي أمام التمييز" },
    { value: "practicing_lawyer", label: "محامي مشتغل" },
    { value: "trainee_lawyer", label: "محامي تحت التمرين" },
  ],
};

const agreementPoints = {
  en: [
    "The applicant authorizes Gulf International Collection to receive requests, respond to clients, book appointments, and collect payments on their behalf.",
    "A commission of 20% applies to all work obtained through the platform.",
    "The platform retains the right to delete any lawyer found unlicensed or prohibited from practice.",
    "Registration fees are administrative and non-refundable.",
    "The platform provides electronic payment services for client transactions.",
    "All disputes shall be resolved by arbitration in accordance with the laws of the Kingdom of Bahrain.",
  ],
  ar: [
    "يفوض مقدم الطلب شركة الخليج الدولية للتحصيل والاستشارات باستقبال الطلبات والرد على العملاء وحجز المواعيد وتحصيل المبالغ نيابة عنه.",
    "تطبق عمولة بنسبة 20% على جميع الأعمال المحصلة عبر المنصة.",
    "تحتفظ المنصة بالحق في تعليق أي محامي يتبين عدم ترخيصه أو حظره من الممارسة.",
    "رسوم التسجيل إدارية وغير قابلة للاسترداد.",
    "توفر المنصة خدمات الدفع الإلكتروني لمعاملات العملاء.",
    "تحل جميع النزاعات عن طريق التحكيم وفقاً لقوانين مملكة البحرين.",
  ],
};

const languageOptions = {
  en: [
    { value: "Arabic", label: "Arabic" },
    { value: "English", label: "English" },
    { value: "Both", label: "Both" },
  ],
  ar: [
    { value: "Arabic", label: "العربية" },
    { value: "English", label: "الإنجليزية" },
    { value: "Both", label: "كلاهما" },
  ],
};

const timePeriods = [
  {
    value: "09:00-13:00",
    label: { en: "First Period", ar: "الفترة الأولى" },
    range: { en: "9:00 AM - 1:00 PM", ar: "9 صباحاً - 1 ظهراً" },
  },
  {
    value: "13:00-17:00",
    label: { en: "Second Period", ar: "الفترة الثانية" },
    range: { en: "1:00 PM - 5:00 PM", ar: "1 ظهراً - 5 عصراً" },
  },
  {
    value: "09:00-17:00",
    label: { en: "Third Period", ar: "الفترة الثالثة" },
    range: { en: "9:00 AM - 5:00 PM", ar: "9 صباحاً - 5 عصراً" },
  },
] as const;

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

function isLawyerSubscriptionType(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  return raw === "lawyer" || raw === "محامي";
}

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

type InvitedLawyer = {
  id: string;

  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;

  subscriptionType?: string | null;

  registrationNo: string;
  registrationLevel: string;
  experienceYears: number;
  language: string;
  workingHours: string;

  specialtyMain: string;
  specialtySubs: string[];

  licenseExpiryDate: string;

  profileImageFileName: string;
  profileImagePreview: string;

  licenseFilePreview: string;
  licenseFileName: string;
  licenseFileMimeType: string;

  ibanNumber: string;
  ibanCertificateFilePreview: string;
  ibanCertificateFileName: string;
  ibanCertificateFileMimeType: string;

  signatureDataUrl: string;
  hasSignature: boolean;
  agreementAccepted: boolean;
  signedAgreementUrl: string;
};

export default function CompleteProfileContent() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const signatureRef = useRef<SignatureCanvas | null>(null);

  const [lawyer, setLawyer] = useState<InvitedLawyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [agreed, setAgreed] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [isChangingSignature, setIsChangingSignature] = useState(false);
  const [signedAgreementUrl, setSignedAgreementUrl] = useState("");

  const [error, setError] = useState("");
  const [profileImageName, setProfileImageName] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null,
  );

  const [licenseFileName, setLicenseFileName] = useState("");
  const [licenseFilePreview, setLicenseFilePreview] = useState<string | null>(
    null,
  );
  const [licenseFileMimeType, setLicenseFileMimeType] = useState("");

  const [ibanCertificateFileName, setIbanCertificateFileName] = useState("");
  const [ibanCertificateFilePreview, setIbanCertificateFilePreview] =
    useState<string | null>(null);
  const [ibanCertificateFileMimeType, setIbanCertificateFileMimeType] =
    useState("");

  const [selectedMainSpecialty, setSelectedMainSpecialty] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];
  const points = isAr ? agreementPoints.ar : agreementPoints.en;

  const canSubmit = agreed && signatureReady && !submitting;
  const isLawyerProvider = isLawyerSubscriptionType(lawyer?.subscriptionType);

  const hasFullNameAr = hasText(lawyer?.fullNameAr);
  const hasFullNameEn = hasText(lawyer?.fullNameEn);
  const hasPhone = hasText(lawyer?.phone);
  const hasEmail = hasText(lawyer?.email);
  const hasRegistrationLevel = hasText(lawyer?.registrationLevel);
  const hasExperienceYears =
    lawyer?.experienceYears !== null && lawyer?.experienceYears !== undefined;
  const hasLanguage = hasText(lawyer?.language);
  const hasWorkingHours = hasText(lawyer?.workingHours);
  const hasCompleteSpecialties =
    hasText(selectedMainSpecialty) && selectedSpecialties.length >= 2;
  const hasRegistrationNo = hasText(lawyer?.registrationNo);
  const hasLicenseExpiryDate = hasText(lawyer?.licenseExpiryDate);
  const hasIbanNumber = hasText(lawyer?.ibanNumber);
  const hasProfileImage = hasText(profileImageName) || hasText(profileImagePreview);
  const hasLicenseFile = hasText(licenseFileName) || hasText(licenseFilePreview);
  const hasIbanCertificateFile =
    hasText(ibanCertificateFileName) || hasText(ibanCertificateFilePreview);

  const showPersonalFields =
    !hasFullNameAr || !hasFullNameEn || !hasPhone || !hasEmail;
  const showRegistrationLevel = isLawyerProvider && !hasRegistrationLevel;
  const showProfessionalFields =
    showRegistrationLevel ||
    !hasExperienceYears ||
    !hasLanguage ||
    !hasWorkingHours ||
    !hasCompleteSpecialties;
  const showLicenseBankFields =
    !hasRegistrationNo || !hasLicenseExpiryDate || !hasIbanNumber;
  const showFileFields =
    !hasProfileImage || !hasLicenseFile || !hasIbanCertificateFile;
  const showAgreementFields = !agreed || !signatureReady || isChangingSignature;

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError(isAr ? "رابط الدعوة غير صحيح" : "Invalid invitation link");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/provider/complete-profile/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Invalid invitation link");
        }

        setLawyer(data.lawyer);

        const existingSignatureDataUrl = String(
          data.lawyer.signatureDataUrl ?? "",
        );

        if (existingSignatureDataUrl) {
  setSignatureDataUrl(existingSignatureDataUrl);
  setSignatureReady(true);
  setIsChangingSignature(false);
  setSignedAgreementUrl(
    data.lawyer.signedAgreementUrl ||
      `/api/provider/signed-agreement?id=${encodeURIComponent(
        data.lawyer.id,
      )}`,
  );
} else {
  setSignatureDataUrl("");
  setSignatureReady(false);
  setIsChangingSignature(true);
  setSignedAgreementUrl("");
}

        if (data.lawyer.agreementAccepted) {
          setAgreed(true);
        }

        setSelectedMainSpecialty(data.lawyer.specialtyMain ?? "");
        setSelectedSpecialties(
          Array.isArray(data.lawyer.specialtySubs)
            ? data.lawyer.specialtySubs.slice(0, 2)
            : [],
        );

        setProfileImageName(data.lawyer.profileImageFileName ?? "");
        setProfileImagePreview(data.lawyer.profileImagePreview || null);

        setLicenseFileName(data.lawyer.licenseFileName ?? "");
        setLicenseFileMimeType(data.lawyer.licenseFileMimeType ?? "");

        setLicenseFilePreview(
          data.lawyer.licenseFileName
            ? `/api/provider/complete-profile/license-file?token=${encodeURIComponent(
                token,
              )}`
            : null,
        );

        setIbanCertificateFileName(
          data.lawyer.ibanCertificateFileName ?? "",
        );
        setIbanCertificateFileMimeType(
          data.lawyer.ibanCertificateFileMimeType ?? "",
        );
        setIbanCertificateFilePreview(
          data.lawyer.ibanCertificateFileName
            ? `/api/provider/complete-profile/iban-certificate-file?token=${encodeURIComponent(
                token,
              )}`
            : null,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isAr
              ? "تعذر فتح رابط الدعوة"
              : "Could not open invitation link",
        );
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token, isAr]);

  const setSubSpecialtyAt = (index: number, value: string) => {
    setSelectedSpecialties((prev) => {
      const next = [...prev];

      if (!value) {
        next[index] = "";
      } else {
        next[index] = value;
      }

      return Array.from(new Set(next.filter(Boolean))).slice(0, 2);
    });
  };

const startChangingSignature = () => {
  signatureRef.current?.clear();
  setSignatureDataUrl("");
  setSignatureReady(false);
  setIsChangingSignature(true);
  setSignedAgreementUrl("");
  setError("");
};

  const clearSignatureCanvas = () => {
    signatureRef.current?.clear();
    setSignatureDataUrl("");
    setSignatureReady(false);
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submitting) return;

    const fd = new FormData(e.currentTarget);

    const finalSignatureDataUrl =
      signatureDataUrl ||
      (signatureRef.current && !signatureRef.current.isEmpty()
        ? signatureRef.current.toDataURL("image/png")
        : "");

    const ibanNumber = String(fd.get("ibanNumber") ?? "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();
    const registrationLevel = String(fd.get("registrationLevel") ?? "").trim();
    const shouldRequireRegistrationLevel = isLawyerSubscriptionType(
      lawyer?.subscriptionType,
    );
    const ibanCertificateFile = fd.get("ibanCertificateFile");
    const hasExistingIbanCertificate = Boolean(ibanCertificateFileName);
    const hasNewIbanCertificate =
      ibanCertificateFile instanceof File && ibanCertificateFile.size > 0;

    if (!ibanNumber) {
      setError(
        isAr ? "يرجى إدخال رقم الآيبان" : "Please enter IBAN number",
      );
      return;
    }

    if (!/^BH\d{2}[A-Z0-9]{18}$/.test(ibanNumber)) {
      setError(
        isAr
          ? "رقم الآيبان غير صحيح. يجب أن يبدأ بـ BH ويتكون من 22 خانة"
          : "Invalid IBAN. It must start with BH and contain 22 characters",
      );
      return;
    }

    if (!hasExistingIbanCertificate && !hasNewIbanCertificate) {
      setError(
        isAr ? "يرجى رفع شهادة الآيبان" : "Please upload IBAN certificate",
      );
      return;
    }

    if (!finalSignatureDataUrl || !signatureReady) {
      setError(
        isAr ? "يرجى إضافة التوقيع أولاً" : "Please add your signature first",
      );
      return;
    }

    if (!selectedMainSpecialty || selectedSpecialties.length === 0) {
      setError(
        isAr
          ? "يرجى اختيار التخصص الرئيسي وتخصص فرعي واحد على الأقل"
          : "Please select main specialty and at least one sub-specialty",
      );
      return;
    }

    if (shouldRequireRegistrationLevel && !registrationLevel) {
      setError(
        isAr ? "يرجى اختيار نوع القيد" : "Please select registration level",
      );
      return;
    }

    if (!agreed) {
      setError(
        isAr
          ? "يرجى الموافقة على الشروط والأحكام واتفاقية مقدم الخدمة"
          : "Please agree to the Terms & Conditions and Service Provider Agreement",
      );
      return;
    }

    fd.set("token", token);
    fd.set("ibanNumber", ibanNumber);
    fd.set(
      "registrationLevel",
      shouldRequireRegistrationLevel ? registrationLevel : "",
    );
    fd.set("signatureDataUrl", finalSignatureDataUrl);
    fd.set("specialtyMain", selectedMainSpecialty);
    fd.set("specialtySubs", JSON.stringify(selectedSpecialties));
    fd.set("agreementAccepted", agreed ? "true" : "false");

    try {
      setSubmitting(true);
      setError("");

      const res = await fetch("/api/provider/complete-profile", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      const agreementUrl = `/api/provider/signed-agreement?id=${encodeURIComponent(
        lawyer?.id ?? "",
      )}`;

      setSignedAgreementUrl(agreementUrl);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر حفظ البيانات"
            : "Could not save profile",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-16">
        <div className="mx-auto max-w-3xl text-center text-sm font-bold text-text-muted">
          {isAr ? "جاري التحقق من الرابط..." : "Checking invitation link..."}
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-16">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-extrabold text-text-primary">
            {isAr ? "تم إكمال البيانات" : "Profile Completed"}
          </h1>

          <p className="mt-2 text-sm leading-7 text-text-muted">
            {isAr
              ? "تم تفعيل حسابك وسيظهر في المنصة. يمكنك معاينة أو تحميل الاتفاقية الموقعة."
              : "Your account has been activated and will appear on the platform. You can preview or download the signed agreement."}
          </p>

          {signedAgreementUrl && (
            <div className="mt-6 grid gap-3">
              <a
                href={signedAgreementUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white hover:bg-primary-dark"
              >
                <Eye className="h-4 w-4" />
                {isAr ? "معاينة الاتفاقية الموقعة" : "Preview Signed Agreement"}
              </a>

              <a
                href={`${signedAgreementUrl}&download=1`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-6 py-3 text-sm font-extrabold text-primary hover:bg-primary/[0.04]"
              >
                <Upload className="h-4 w-4" />
                {isAr ? "تحميل الاتفاقية PDF" : "Download Agreement PDF"}
              </a>
            </div>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-primary/10 px-6 py-3 text-sm font-extrabold text-primary hover:bg-primary/15"
          >
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl bg-[#07111F] p-7 text-white shadow-xl">
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {isAr ? "إكمال بيانات المحامي" : "Complete Lawyer Profile"}
          </h1>

          <p className="mt-2 text-sm leading-7 text-white/65">
            {isAr
              ? "يرجى إكمال البيانات التالية لتفعيل ظهور حسابك في المنصة."
              : "Please complete the following details to activate your public profile."}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {!lawyer ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-text-muted">
            {isAr ? "لا يمكن عرض هذا الرابط" : "This link cannot be displayed"}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(7,17,31,0.06)]"
          >
            {hasFullNameAr && (
              <input type="hidden" name="fullNameAr" value={lawyer.fullNameAr} />
            )}
            {hasFullNameEn && (
              <input type="hidden" name="fullNameEn" value={lawyer.fullNameEn} />
            )}
            {hasPhone && <input type="hidden" name="phone" value={lawyer.phone} />}
            {hasEmail && <input type="hidden" name="email" value={lawyer.email} />}
            {isLawyerProvider && hasRegistrationLevel && (
              <input
                type="hidden"
                name="registrationLevel"
                value={lawyer.registrationLevel}
              />
            )}
            {hasExperienceYears && (
              <input
                type="hidden"
                name="experienceYears"
                value={String(lawyer.experienceYears ?? "")}
              />
            )}
            {hasLanguage && (
              <input type="hidden" name="language" value={lawyer.language} />
            )}
            {hasWorkingHours && (
              <input
                type="hidden"
                name="workingHours"
                value={lawyer.workingHours}
              />
            )}
            {hasRegistrationNo && (
              <input
                type="hidden"
                name="licenseNumber"
                value={lawyer.registrationNo}
              />
            )}
            {hasLicenseExpiryDate && (
              <input
                type="hidden"
                name="licenseExpiryDate"
                value={lawyer.licenseExpiryDate}
              />
            )}
            {hasIbanNumber && (
              <input type="hidden" name="ibanNumber" value={lawyer.ibanNumber} />
            )}

            {showPersonalFields && (
              <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
                <h2 className="text-sm font-extrabold text-text-primary">
                  {isAr ? "البيانات الشخصية" : "Personal Details"}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {!hasFullNameAr && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "الاسم بالعربي" : "Arabic Name"}
                      </label>
                      <input
                        name="fullNameAr"
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {!hasFullNameEn && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "الاسم بالإنجليزي" : "English Name"}
                      </label>
                      <input
                        name="fullNameEn"
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {!hasPhone && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "رقم الهاتف" : "Phone"}
                      </label>
                      <input
                        name="phone"
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {!hasEmail && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "البريد الإلكتروني" : "Email"}
                      </label>
                      <input
                        name="email"
                        type="email"
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="text-sm font-extrabold text-text-primary">
                {isAr ? "تعيين كلمة المرور" : "Set Password"}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-text-primary">
                    {isAr ? "كلمة المرور" : "Password"}
                  </label>

                  <div className="relative">
                    <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />

                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pl-11 rtl:pr-11"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 -translate-y-1/2 text-text-muted ltr:right-4 rtl:left-4"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-text-primary">
                    {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
                  </label>

                  <div className="relative">
                    <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />

                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pl-11 rtl:pr-11"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute top-1/2 -translate-y-1/2 text-text-muted ltr:right-4 rtl:left-4"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {showProfessionalFields && (
              <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
                <h2 className="text-sm font-extrabold text-text-primary">
                  {isAr ? "البيانات المهنية" : "Professional Details"}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {showRegistrationLevel && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "نوع القيد" : "Registration Level"}
                      </label>

                      <select
                        name="registrationLevel"
                        required
                        defaultValue=""
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                      >
                        <option value="">
                          {isAr ? "اختر نوع القيد" : "Select registration level"}
                        </option>

                        {(isAr
                          ? registrationLevelOptions.ar
                          : registrationLevelOptions.en
                        ).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!hasExperienceYears && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "سنوات الخبرة" : "Years of Experience"}
                      </label>

                      <input
                        name="experienceYears"
                        type="number"
                        min={0}
                        max={80}
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {!hasLanguage && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "اللغة" : "Language"}
                      </label>

                      <select
                        name="language"
                        required
                        defaultValue=""
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                      >
                        <option value="">
                          {isAr ? "اختر اللغة" : "Select language"}
                        </option>

                        {(isAr ? languageOptions.ar : languageOptions.en).map(
                          (item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}

                  {!hasWorkingHours && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "ساعات العمل" : "Working Hours"}
                      </label>

                      <select
                        name="workingHours"
                        required
                        defaultValue=""
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                      >
                        <option value="">
                          {isAr ? "اختر ساعات العمل" : "Select working hours"}
                        </option>

                        {timePeriods.map((period) => (
                          <option key={period.value} value={period.value}>
                            {isAr
                              ? `${period.label.ar} - ${period.range.ar}`
                              : `${period.label.en} - ${period.range.en}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {!hasCompleteSpecialties && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "التخصص الرئيسي" : "Main Specialty"}
                      </label>

                      <select
                        value={selectedMainSpecialty}
                        onChange={(e) => {
                          setSelectedMainSpecialty(e.target.value);
                          setSelectedSpecialties((prev) =>
                            prev.filter((item) => item !== e.target.value),
                          );
                        }}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                      >
                        <option value="">
                          {isAr
                            ? "اختر التخصص الرئيسي"
                            : "Select main specialty"}
                        </option>

                        {lawyerSpecialties.map((item) => (
                          <option key={item.value} value={item.value}>
                            {isAr ? item.ar : item.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[0, 1].map((index) => (
                        <div key={index}>
                          <label className="mb-1.5 block text-sm font-bold text-text-primary">
                            {isAr
                              ? index === 0
                                ? "التخصص الفرعي الأول"
                                : "التخصص الفرعي الثاني"
                              : index === 0
                                ? "First Sub-specialty"
                                : "Second Sub-specialty"}
                          </label>

                          <select
                            value={selectedSpecialties[index] ?? ""}
                            onChange={(e) =>
                              setSubSpecialtyAt(index, e.target.value)
                            }
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-primary"
                          >
                            <option value="">
                              {isAr
                                ? "اختر التخصص الفرعي"
                                : "Select sub-specialty"}
                            </option>

                            {lawyerSpecialties.map((item) => (
                              <option
                                key={item.value}
                                value={item.value}
                                disabled={
                                  selectedMainSpecialty === item.value ||
                                  selectedSpecialties[index === 0 ? 1 : 0] ===
                                    item.value
                                }
                              >
                                {isAr ? item.ar : item.en}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {showLicenseBankFields && (
              <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
                <h2 className="text-sm font-extrabold text-text-primary">
                  {isAr ? "الرخصة والحساب" : "License & Bank Details"}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {!hasRegistrationNo && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "رقم الرخصة" : "License Number"}
                      </label>

                      <input
                        name="licenseNumber"
                        type="text"
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {!hasLicenseExpiryDate && (
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-text-primary">
                        {isAr ? "تاريخ انتهاء الرخصة" : "License Expiry Date"}
                      </label>

                      <input
                        name="licenseExpiryDate"
                        type="date"
                        min={todayDate}
                        required
                        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {!hasIbanNumber && (
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-text-primary">
                      {isAr ? "رقم الآيبان" : "IBAN Number"}
                    </label>

                    <input
                      name="ibanNumber"
                      type="text"
                      inputMode="text"
                      required
                      dir="ltr"
                      placeholder="BH00 XXXX XXXX XXXX XXXX XX"
                      className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm uppercase tracking-wide outline-none focus:border-primary"
                      onChange={(e) => {
                        e.currentTarget.value = e.currentTarget.value
                          .replace(/\s+/g, "")
                          .toUpperCase();
                      }}
                    />

                    <p className="mt-1.5 text-xs font-medium text-text-muted">
                      {isAr
                        ? "يجب أن يبدأ الآيبان بـ BH ويتكون من 22 خانة."
                        : "IBAN must start with BH and contain 22 characters."}
                    </p>
                  </div>
                )}
              </section>
            )}

            {showFileFields && (
              <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
                <h2 className="text-sm font-extrabold text-text-primary">
                  {isAr ? "الملفات" : "Files"}
                </h2>

                {!hasProfileImage && (
                  <FileUploadCard
                    id="profileImage"
                    name="profileImage"
                    label={isAr ? "الصورة الشخصية" : "Profile Image"}
                    accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
                    fileName={profileImageName}
                    preview={profileImagePreview}
                    mimeType="image/"
                    placeholder={
                      isAr ? "اضغط لتحميل الصورة" : "Click to upload image"
                    }
                    helper="JPG, PNG, WEBP, HEIC"
                    emptyType="image"
                    onFileChange={(file) => {
                      setProfileImageName(file?.name ?? "");

                      if (profileImagePreview?.startsWith("blob:")) {
                        URL.revokeObjectURL(profileImagePreview);
                      }

                      setProfileImagePreview(
                        file ? URL.createObjectURL(file) : null,
                      );
                    }}
                  />
                )}

                {!hasLicenseFile && (
                  <FileUploadCard
                    id="licenseFile"
                    name="licenseFile"
                    label={isAr ? "رخصة الممارسة" : "Practice License"}
                    accept=".pdf,.jpg,.jpeg,.png"
                    fileName={licenseFileName}
                    preview={licenseFilePreview}
                    mimeType={licenseFileMimeType}
                    placeholder={
                      isAr
                        ? "اضغط لتحميل ملف الرخصة"
                        : "Click to upload license file"
                    }
                    helper="PDF, JPG, PNG"
                    previewLabel={
                      isAr ? "معاينة ملف الرخصة" : "Preview license file"
                    }
                    onFileChange={(file) => {
                      setLicenseFileName(file?.name ?? "");
                      setLicenseFileMimeType(file?.type ?? "");

                      if (licenseFilePreview?.startsWith("blob:")) {
                        URL.revokeObjectURL(licenseFilePreview);
                      }

                      setLicenseFilePreview(
                        file ? URL.createObjectURL(file) : null,
                      );
                    }}
                  />
                )}

                {!hasIbanCertificateFile && (
                  <FileUploadCard
                    id="ibanCertificateFile"
                    name="ibanCertificateFile"
                    label={isAr ? "شهادة الآيبان" : "IBAN Certificate"}
                    accept=".pdf,.jpg,.jpeg,.png"
                    fileName={ibanCertificateFileName}
                    preview={ibanCertificateFilePreview}
                    mimeType={ibanCertificateFileMimeType}
                    placeholder={
                      isAr
                        ? "اضغط لتحميل شهادة الآيبان"
                        : "Click to upload IBAN certificate"
                    }
                    helper="PDF, JPG, PNG"
                    previewLabel={
                      isAr
                        ? "معاينة شهادة الآيبان"
                        : "Preview IBAN certificate"
                    }
                    onFileChange={(file) => {
                      setIbanCertificateFileName(file?.name ?? "");
                      setIbanCertificateFileMimeType(file?.type ?? "");

                      if (ibanCertificateFilePreview?.startsWith("blob:")) {
                        URL.revokeObjectURL(ibanCertificateFilePreview);
                      }

                      setIbanCertificateFilePreview(
                        file ? URL.createObjectURL(file) : null,
                      );
                    }}
                  />
                )}
              </section>
            )}

            {showAgreementFields && (
              <AgreementSignatureSection
                isAr={isAr}
                points={points}
                agreed={agreed}
                setAgreed={setAgreed}
                signatureReady={signatureReady}
                isChangingSignature={isChangingSignature}
                signedAgreementUrl={signedAgreementUrl}
                signatureRef={signatureRef}
                setSignatureDataUrl={setSignatureDataUrl}
                setSignatureReady={setSignatureReady}
                setIsChangingSignature={setIsChangingSignature}
                setError={setError}
                startChangingSignature={startChangingSignature}
                clearSignatureCanvas={clearSignatureCanvas}
              />
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              title={
                !signatureReady
                  ? isAr
                    ? "يرجى إضافة التوقيع أولاً"
                    : "Please add your signature first"
                  : !agreed
                    ? isAr
                      ? "يرجى الموافقة على اتفاقية مقدم الخدمة أولاً"
                      : "Please agree to the Service Provider Agreement first"
                    : undefined
              }
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isAr
                  ? "إكمال وتفعيل الحساب"
                  : "Complete and Activate Account"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}