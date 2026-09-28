"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  Upload,
  CheckCircle,
  Check,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";

const subscriptionTypes = {
  en: ["Lawyer", "Consultant", "Mediator", "Arbitrator", "Expert", "Private Executor", "Private Notary", "Translator"],
  ar: ["محامي", "مستشار", "وسيط", "محكم", "خبير", "منفذ خاص", "موثق خاص","مترجم"],
};

const registrationLevelOptions = {
  en: [
    {
      value: "cassation_lawyer",
      label: "Lawyer before Court of Cassation",
    },
    {
      value: "practicing_lawyer",
      label: "Practicing Lawyer",
    },
    {
      value: "trainee_lawyer",
      label: "Trainee Lawyer",
    },
  ],
  ar: [
    {
      value: "cassation_lawyer",
      label: "محامي أمام التمييز",
    },
    {
      value: "practicing_lawyer",
      label: "محامي مشتغل",
    },
    {
      value: "trainee_lawyer",
      label: "محامي تحت التمرين",
    },
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

export default function JoinPage() {
  const lang = useLocale();
  const isAr = lang === "ar";
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signedAgreementUrl, setSignedAgreementUrl] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"register" | "login" | "forgot" | "reset">("register");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
const [forgotSent, setForgotSent] = useState(false);
const [forgotError, setForgotError] = useState<string | null>(null);

const [resetSubmitting, setResetSubmitting] = useState(false);
const [resetError, setResetError] = useState<string | null>(null);
const [resetSuccess, setResetSuccess] = useState(false);
const [showResetPassword, setShowResetPassword] = useState(false);
const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
const [loginSubmitting, setLoginSubmitting] = useState(false);
const [loginError, setLoginError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("resetToken") ?? "";
const signatureRef = useRef<SignatureCanvas | null>(null);
const [licenseFileName, setLicenseFileName] = useState("");
const [institutionLicenseFileName, setInstitutionLicenseFileName] = useState("");
const [personalIdFileName, setPersonalIdFileName] = useState("");
const [ibanCertificateFileName, setIbanCertificateFileName] = useState("");
const [profileImageName, setProfileImageName] = useState("");
const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
const [selectedSubscriptionTypes, setSelectedSubscriptionTypes] = useState<string[]>([]);
const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
const [selectedMainSpecialty, setSelectedMainSpecialty] = useState("");
const [showLoginPassword, setShowLoginPassword] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);

const registerSteps = [
  {
    number: 1,
    title: isAr ? "بيانات المهنة" : "Professional Info",
    desc: isAr ? "نوع الاشتراك والتخصصات" : "Type and specialties",
  },
  {
    number: 2,
    title: isAr ? "البيانات الشخصية" : "Personal Details",
    desc: isAr ? "الاسم ووسائل التواصل" : "Name and contact details",
  },
  {
    number: 3,
    title: isAr ? "الرخصة والحساب" : "License & Bank",
    desc: isAr ? "الرخصة والآيبان" : "License and IBAN",
  },
  {
    number: 4,
    title: isAr ? "الاتفاقية والتوقيع" : "Agreement & Signature",
    desc: isAr ? "الموافقة والتوقيع" : "Approval and signature",
  },
] as const;

function getRegisterStepForError(field: string): 1 | 2 | 3 | 4 {
  if (
    [
      "subscriptionType",
      "registrationLevel",
      "experienceYears",
      "specialties",
    ].includes(field)
  ) {
    return 1;
  }

  if (
    [
      "profileImage",
      "fullNameAr",
      "fullNameEn",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "language",
    ].includes(field)
  ) {
    return 2;
  }

  if (
    [
      "licenseNumber",
      "licenseExpiryDate",
      "licenseFile",
      "crNumber",
      "institutionLicenseFile",
      "personalIdFile",
      "ibanNumber",
      "ibanCertificateFile",
      "workingHours",
    ].includes(field)
  ) {
    return 3;
  }

  return 4;
}

function goToRegisterStep(step: 1 | 2 | 3 | 4) {
  setRegisterStep(step);
}

function resizeSignatureCanvas() {
  const signaturePad = signatureRef.current;
  const canvas = signaturePad?.getCanvas();

  if (!signaturePad || !canvas) return;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.floor(rect.width);
  const cssHeight = Math.floor(rect.height || 160);

  if (cssWidth <= 0 || cssHeight <= 0) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const nextWidth = Math.floor(cssWidth * ratio);
  const nextHeight = Math.floor(cssHeight * ratio);

  if (canvas.width === nextWidth && canvas.height === nextHeight) return;

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const context = canvas.getContext("2d");
  context?.scale(ratio, ratio);

  signaturePad.clear();
}

function handleNextStep() {
  const form = document.getElementById("join-register-form") as HTMLFormElement | null;
  const fd = form ? new FormData(form) : new FormData();
  const errors: Record<string, string> = {};
  const msg = (ar: string, en: string) => (isAr ? ar : en);

  const registrationLevel = String(fd.get("registrationLevel") ?? "").trim();
  const experienceYears = String(fd.get("experienceYears") ?? "").trim();
  const fullNameAr = String(fd.get("fullNameAr") ?? "").trim();
  const fullNameEn = String(fd.get("fullNameEn") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "").trim();
  const confirmPassword = String(fd.get("confirmPassword") ?? "").trim();
  const language = String(fd.get("language") ?? "").trim();
  const workingHours = String(fd.get("workingHours") ?? "").trim();
  const licenseNumber = String(fd.get("licenseNumber") ?? "").trim();
  const licenseExpiryDate = String(fd.get("licenseExpiryDate") ?? "").trim();
  const ibanNumber = String(fd.get("ibanNumber") ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
  const profileImageFile = fd.get("profileImage");
  const licenseFile = fd.get("licenseFile");
  const institutionLicenseFile = fd.get("institutionLicenseFile");
  const personalIdFile = fd.get("personalIdFile");
  const ibanCertificateFile = fd.get("ibanCertificateFile");

  if (registerStep === 1) {
    if (selectedSubscriptionTypes.length === 0) {
      errors.subscriptionType = msg(
        "يرجى اختيار نوع اشتراك واحد على الأقل",
        "Please select at least one subscription type",
      );
    }

    if (!experienceYears) {
      errors.experienceYears = msg("يرجى إدخال سنوات الخبرة", "Please enter years of experience");
    } else if (
      Number.isNaN(Number(experienceYears)) ||
      Number(experienceYears) < 0 ||
      Number(experienceYears) > 80
    ) {
      errors.experienceYears = msg("سنوات الخبرة غير صحيحة", "Invalid years of experience");
    }

    if (selectedSubscriptionTypes.includes("Lawyer") && !registrationLevel) {
      errors.registrationLevel = msg("يرجى اختيار نوع القيد", "Please select registration level");
    }

    if (!selectedMainSpecialty) {
  errors.specialties = msg(
    "يرجى اختيار التخصص الرئيسي",
    "Please select the main specialty",
  );
} else if (selectedSpecialties.length !== 2) {
  errors.specialties = msg(
    "يرجى اختيار تخصصين فرعيين",
    "Please select 2 sub-specialties",
  );
}
  }

  if (registerStep === 2) {
    if (!(profileImageFile instanceof File) || profileImageFile.size === 0) {
      errors.profileImage = msg("يرجى رفع الصورة الشخصية", "Please upload profile image");
    }

    if (!fullNameAr) {
      errors.fullNameAr = msg("يرجى إدخال الاسم الكامل بالعربي", "Please enter full Arabic name");
    }

    if (!fullNameEn) {
      errors.fullNameEn = msg("يرجى إدخال الاسم الكامل بالإنجليزي", "Please enter full English name");
    }

    if (!email) {
      errors.email = msg("يرجى إدخال البريد الإلكتروني", "Please enter email");
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = msg("البريد الإلكتروني غير صحيح", "Invalid email address");
    }

    if (!phone) {
      errors.phone = msg("يرجى إدخال رقم الهاتف", "Please enter phone number");
    }

    if (!password) {
      errors.password = msg("يرجى إدخال كلمة المرور", "Please enter password");
    } else if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      errors.password = msg(
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم",
        "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      );
    }

    if (!confirmPassword) {
      errors.confirmPassword = msg("يرجى تأكيد كلمة المرور", "Please confirm password");
    } else if (password !== confirmPassword) {
      errors.confirmPassword = msg("كلمتا المرور غير متطابقتين", "Passwords do not match");
    }

    if (!language) {
      errors.language = msg("يرجى اختيار اللغة", "Please select language");
    }
  }

  if (registerStep === 3) {
    if (!licenseNumber) {
      errors.licenseNumber = msg("يرجى إدخال رقم رخصة الممارسة", "Please enter practice license number");
    }

    if (!licenseExpiryDate) {
      errors.licenseExpiryDate = msg("يرجى إدخال تاريخ انتهاء الرخصة", "Please enter license expiry date");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiry = new Date(licenseExpiryDate);
      expiry.setHours(0, 0, 0, 0);

      if (expiry < today) {
        errors.licenseExpiryDate = msg("تاريخ انتهاء الرخصة لا يمكن أن يكون قديماً", "License expiry date cannot be in the past");
      }
    }

    if (!ibanNumber) {
      errors.ibanNumber = msg("يرجى إدخال رقم الآيبان", "Please enter IBAN number");
    } else if (!/^BH\d{2}[A-Z0-9]{18}$/.test(ibanNumber)) {
      errors.ibanNumber = msg(
        "رقم الآيبان غير صحيح. يجب أن يبدأ بـ BH ويتكون من 22 خانة",
        "Invalid IBAN. It must start with BH and contain 22 characters",
      );
    }

    if (
      !(ibanCertificateFile instanceof File) ||
      ibanCertificateFile.size === 0
    ) {
      errors.ibanCertificateFile = msg("يرجى رفع شهادة الآيبان", "Please upload IBAN certificate");
    }

    if (!workingHours) {
      errors.workingHours = msg("يرجى اختيار ساعات العمل", "Please select working hours");
    } else if (!timePeriods.some((period) => period.value === workingHours)) {
      errors.workingHours = msg("فترة العمل غير صحيحة", "Invalid working hours period");
    }

    if (!(licenseFile instanceof File) || licenseFile.size === 0) {
      errors.licenseFile = msg("يرجى رفع رخصة الممارسة", "Please upload practice license");
    }

    if (
      institutionLicenseFile instanceof File &&
      institutionLicenseFile.size > 5 * 1024 * 1024
    ) {
      errors.institutionLicenseFile = msg(
        "يجب ألا يتجاوز حجم رخصة المؤسسة 5MB",
        "Institution license file must be 5MB or less",
      );
    }

    if (!(personalIdFile instanceof File) || personalIdFile.size === 0) {
      errors.personalIdFile = msg("يرجى رفع البطاقة الشخصية", "Please upload personal ID card");
    }
  }

  if (Object.keys(errors).length > 0) {
    setFieldErrors((current) => ({ ...current, ...errors }));
    setSubmitError(null);
    return;
  }

  setFieldErrors((current) => {
    const next = { ...current };

    Object.keys(next).forEach((key) => {
      if (getRegisterStepForError(key) === registerStep) {
        delete next[key];
      }
    });

    return next;
  });

  setSubmitError(null);
  setRegisterStep((registerStep + 1) as 1 | 2 | 3 | 4);
}

  const labels = isAr ? subscriptionTypes.ar : subscriptionTypes.en;
  const languages = isAr ? languageOptions.ar : languageOptions.en;
  const points = isAr ? agreementPoints.ar : agreementPoints.en;
const todayDate = new Date().toISOString().split("T")[0];
const specialties = {
  main: selectedMainSpecialty,
  subs: selectedSpecialties,
};


useEffect(() => {
  if (resetToken) {
    setMode("reset");
  }
}, [resetToken]);

useEffect(() => {
  if (mode !== "register" || registerStep !== 4) return;

  const resize = () => {
    window.requestAnimationFrame(() => {
      resizeSignatureCanvas();
    });
  };

  resize();

  const timeout = window.setTimeout(resize, 120);

  window.addEventListener("resize", resize);

  return () => {
    window.clearTimeout(timeout);
    window.removeEventListener("resize", resize);
  };
}, [mode, registerStep]);

useEffect(() => {
  let cancelled = false;

  async function checkSession() {
    try {
      const [adminRes, providerRes] = await Promise.all([
        fetch("/api/admin/me", { cache: "no-store" }).catch(() => null),
        fetch("/api/provider/me", { cache: "no-store" }).catch(() => null),
      ]);

      if (cancelled) return;

      if (adminRes?.ok) {
        const data = await adminRes.json().catch(() => ({}));

        if (data?.ok) {
          window.location.href = `/${lang}/admin`;
          return;
        }
      }

      if (providerRes?.ok) {
        const data = await providerRes.json().catch(() => ({}));

        if (data?.ok) {
          window.location.href = `/${lang}/provider-dashboard`;
          return;
        }
      }
    } finally {
      if (!cancelled) {
        setCheckingSession(false);
      }
    }
  }

  checkSession();

  return () => {
    cancelled = true;
  };
}, [lang]);

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

  setFieldErrors((current) => {
    const next = { ...current };
    delete next.specialties;
    return next;
  });
};
const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (loginSubmitting) return;

  const fd = new FormData(e.currentTarget);

  // نخلي اسم الحقل licenseNumber عشان الواجهة تبين للمستخدم رقم المحامي فقط
  // لكن إذا أدخل الأدمن إيميل، نحوله داخلياً إلى admin-login
  const loginValue = String(fd.get("licenseNumber") ?? "").trim();
  const password = String(fd.get("password") ?? "").trim();

  if (!loginValue || !password) {
    setLoginError(
      isAr
        ? "يرجى إدخال رقم المحامي وكلمة المرور"
        : "Please enter lawyer number and password",
    );
    return;
  }

  setLoginSubmitting(true);
  setLoginError(null);

  try {
    const isAdminLogin = loginValue.includes("@");

    const res = await fetch(
      isAdminLogin ? "/api/admin-login" : "/api/provider/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isAdminLogin
            ? { email: loginValue, password }
            : { licenseNumber: loginValue, password },
        ),
      },
    );

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Login failed");
    }

    window.location.href = isAdminLogin
      ? `/${lang}/admin`
      : `/${lang}/provider-dashboard`;
  } catch (err) {
    setLoginError(
      isAr
        ? "رقم المحامي أو كلمة المرور غير صحيحة، أو الحساب غير مفعل"
        : "Invalid lawyer number or password, or account is not active",
    );
  } finally {
    setLoginSubmitting(false);
  }
};


const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (forgotSubmitting) return;

  const fd = new FormData(e.currentTarget);
  const identifier = String(fd.get("identifier") ?? "").trim();

  if (!identifier) {
    setForgotError(
      isAr
        ? "يرجى إدخال رقم المحامي أو البريد الإلكتروني"
        : "Please enter lawyer number or email",
    );
    return;
  }

  setForgotSubmitting(true);
  setForgotError(null);

  try {
    const res = await fetch("/api/provider/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        lang,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }

    setForgotSent(true);
  } catch {
    setForgotError(
      isAr
        ? "تعذر إرسال رابط استرجاع كلمة المرور"
        : "Could not send password reset link",
    );
  } finally {
    setForgotSubmitting(false);
  }
};

const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (resetSubmitting) return;

  const fd = new FormData(e.currentTarget);
  const password = String(fd.get("password") ?? "").trim();
  const confirmPassword = String(fd.get("confirmPassword") ?? "").trim();

  if (!password || !confirmPassword) {
    setResetError(
      isAr
        ? "يرجى إدخال كلمة المرور وتأكيدها"
        : "Please enter and confirm your password",
    );
    return;
  }

  if (password !== confirmPassword) {
    setResetError(
      isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
    );
    return;
  }

  setResetSubmitting(true);
  setResetError(null);

  try {
    const res = await fetch("/api/provider/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: resetToken,
        password,
        confirmPassword,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }

    setResetSuccess(true);
  } catch {
    setResetError(
      isAr
        ? "الرابط غير صالح أو منتهي الصلاحية"
        : "The reset link is invalid or expired",
    );
  } finally {
    setResetSubmitting(false);
  }
};

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (submitting) return;

  const fd = new FormData(e.currentTarget);
  const errors: Record<string, string> = {};

  const msg = (ar: string, en: string) => (isAr ? ar : en);

  const subscriptionType = selectedSubscriptionTypes.includes("Lawyer")
    ? "Lawyer"
    : selectedSubscriptionTypes[0] ?? "";
  const registrationLevel = String(fd.get("registrationLevel") ?? "").trim();
  const experienceYears = String(fd.get("experienceYears") ?? "").trim();
  const fullNameAr = String(fd.get("fullNameAr") ?? "").trim();
  const fullNameEn = String(fd.get("fullNameEn") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "").trim();
const confirmPassword = String(fd.get("confirmPassword") ?? "").trim();
  const language = String(fd.get("language") ?? "").trim();
  const workingHours = String(fd.get("workingHours") ?? "").trim();
const licenseNumber = String(fd.get("licenseNumber") ?? "").trim();
const licenseExpiryDate = String(fd.get("licenseExpiryDate") ?? "").trim();
const ibanNumber = String(fd.get("ibanNumber") ?? "")
  .trim()
  .replace(/\s+/g, "")
  .toUpperCase();
  const profileImageFile = fd.get("profileImage");
  const licenseFile = fd.get("licenseFile");
  const institutionLicenseFile = fd.get("institutionLicenseFile");
  const personalIdFile = fd.get("personalIdFile");
const ibanCertificateFile = fd.get("ibanCertificateFile");
  const signatureDataUrl =
    signatureRef.current && !signatureRef.current.isEmpty()
      ? signatureRef.current.toDataURL("image/png")
      : "";

  if (selectedSubscriptionTypes.length === 0) {
    errors.subscriptionType = msg(
      "يرجى اختيار نوع اشتراك واحد على الأقل",
      "Please select at least one subscription type",
    );
  }


if (!workingHours) {
  errors.workingHours = msg(
    "يرجى اختيار ساعات العمل",
    "Please select working hours",
  );
} else if (!timePeriods.some((period) => period.value === workingHours)) {
  errors.workingHours = msg(
    "فترة العمل غير صحيحة",
    "Invalid working hours period",
  );
}

if (!experienceYears) {
  errors.experienceYears = msg(
    "يرجى إدخال سنوات الخبرة",
    "Please enter years of experience",
  );
} else if (
  Number.isNaN(Number(experienceYears)) ||
  Number(experienceYears) < 0 ||
  Number(experienceYears) > 80
) {
  errors.experienceYears = msg(
    "سنوات الخبرة غير صحيحة",
    "Invalid years of experience",
  );
}
  
if (!selectedMainSpecialty) {
  errors.specialties = msg(
    "يرجى اختيار التخصص الرئيسي",
    "Please select the main specialty",
  );
} else if (selectedSpecialties.length !== 2) {
  errors.specialties = msg(
    "يرجى اختيار تخصصين فرعيين",
    "Please select 2 sub-specialties",
  );
}

if (selectedSubscriptionTypes.includes("Lawyer") && !registrationLevel) {
  errors.registrationLevel = msg(
    "يرجى اختيار نوع القيد",
    "Please select registration level",
  );
}


  if (!(profileImageFile instanceof File) || profileImageFile.size === 0) {
    errors.profileImage = msg("يرجى رفع الصورة الشخصية", "Please upload profile image");
  }

  if (!fullNameAr) {
    errors.fullNameAr = msg("يرجى إدخال الاسم الكامل بالعربي", "Please enter full Arabic name");
  }
if (!ibanNumber) {
  errors.ibanNumber = msg(
    "يرجى إدخال رقم الآيبان",
    "Please enter IBAN number",
  );
} else if (!/^BH\d{2}[A-Z0-9]{18}$/.test(ibanNumber)) {
  errors.ibanNumber = msg(
    "رقم الآيبان غير صحيح. يجب أن يبدأ بـ BH ويتكون من 22 خانة",
    "Invalid IBAN. It must start with BH and contain 22 characters",
  );
}

if (
  !(ibanCertificateFile instanceof File) ||
  ibanCertificateFile.size === 0
) {
  errors.ibanCertificateFile = msg(
    "يرجى رفع شهادة الآيبان",
    "Please upload IBAN certificate",
  );
}
  if (!fullNameEn) {
    errors.fullNameEn = msg("يرجى إدخال الاسم الكامل بالإنجليزي", "Please enter full English name");
  }

  if (!email) {
    errors.email = msg("يرجى إدخال البريد الإلكتروني", "Please enter email");
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = msg("البريد الإلكتروني غير صحيح", "Invalid email address");
  }

  if (!phone) {
    errors.phone = msg("يرجى إدخال رقم الهاتف", "Please enter phone number");
  }
if (!password) {
  errors.password = msg("يرجى إدخال كلمة المرور", "Please enter password");
} else if (
  password.length < 8 ||
  !/[A-Z]/.test(password) ||
  !/[a-z]/.test(password) ||
  !/\d/.test(password)
) {
  errors.password = msg(
    "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم",
    "Password must be at least 8 characters and include uppercase, lowercase, and a number",
  );
}

if (!confirmPassword) {
  errors.confirmPassword = msg(
    "يرجى تأكيد كلمة المرور",
    "Please confirm password",
  );
} else if (password !== confirmPassword) {
  errors.confirmPassword = msg(
    "كلمتا المرور غير متطابقتين",
    "Passwords do not match",
  );
}
  if (!language) {
    errors.language = msg("يرجى اختيار اللغة", "Please select language");
  }

if (!licenseNumber) {
  errors.licenseNumber = msg(
    "يرجى إدخال رقم رخصة الممارسة",
    "Please enter practice license number",
  );
}

if (!licenseExpiryDate) {
  errors.licenseExpiryDate = msg(
    "يرجى إدخال تاريخ انتهاء الرخصة",
    "Please enter license expiry date",
  );
} else {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(licenseExpiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) {
    errors.licenseExpiryDate = msg(
      "تاريخ انتهاء الرخصة لا يمكن أن يكون قديماً",
      "License expiry date cannot be in the past",
    );
  }
}

  if (!(licenseFile instanceof File) || licenseFile.size === 0) {
    errors.licenseFile = msg("يرجى رفع رخصة الممارسة", "Please upload practice license");
  }

  if (
    institutionLicenseFile instanceof File &&
    institutionLicenseFile.size > 5 * 1024 * 1024
  ) {
    errors.institutionLicenseFile = msg(
      "يجب ألا يتجاوز حجم رخصة المؤسسة 5MB",
      "Institution license file must be 5MB or less",
    );
  }

  if (!(personalIdFile instanceof File) || personalIdFile.size === 0) {
    errors.personalIdFile = msg("يرجى رفع البطاقة الشخصية", "Please upload personal ID card");
  }

  if (!signatureDataUrl) {
    errors.signatureDataUrl = msg("يرجى إضافة التوقيع", "Please add your signature");
  }

  if (!agreed) {
    errors.agreed = msg(
      "يرجى الموافقة على الشروط والأحكام",
      "Please agree to the terms and conditions",
    );
  }

if (Object.keys(errors).length > 0) {
  const firstErrorKey = Object.keys(errors)[0];

  setFieldErrors(errors);
  setSubmitError(null);
  setRegisterStep(getRegisterStepForError(firstErrorKey));

  return;
}

  setFieldErrors({});
  setSubmitting(true);
  setSubmitError(null);

  try {
    fd.set("lang", lang);
    fd.set("signatureDataUrl", signatureDataUrl);
    fd.set("notaryId", searchParams.get("notaryId") ?? "");
    fd.set("subscriptionType", subscriptionType);
    fd.set("subscriptionTypes", JSON.stringify(selectedSubscriptionTypes));
    fd.set(
  "registrationLevel",
  selectedSubscriptionTypes.includes("Lawyer") ? registrationLevel : "",
);
fd.set("specialtyMain", selectedMainSpecialty);
fd.set("specialtySubs", JSON.stringify(selectedSpecialties));
fd.set("specialties", JSON.stringify(specialties));
fd.set("experienceYears", experienceYears);
fd.set("workingHours", workingHours);
fd.set("ibanNumber", ibanNumber);
    const res = await fetch("/api/join", {
      method: "POST",
      body: fd,
    });

const data = (await res.json().catch(() => ({}))) as {
  ok?: boolean;
  id?: string;
  error?: string;
  redirectTo?: string;
};

    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }

    if (data.id) {
  setSignedAgreementUrl(
    `/api/provider/signed-agreement?id=${encodeURIComponent(data.id)}`,
  );
} else {
  setSignedAgreementUrl("");
}

setSubmitted(true);

return;
  } catch (err) {
    setSubmitError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    setSubmitting(false);
  }
};



if (checkingSession) {
  return (
    <div className="py-24 lg:py-32">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm font-bold text-text-muted">
          {isAr ? "جاري التحقق من تسجيل الدخول..." : "Checking login status..."}
        </p>
      </div>
    </div>
  );
}
  if (submitted) {
    return (
      <div className="py-24 lg:py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-md px-6 text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="mb-2 text-2xl font-extrabold text-text-primary">
            {isAr ? "تم استلام طلبك!" : "Application Received!"}
          </h1>

          <p className="mb-6 text-sm leading-7 text-text-muted">
            {isAr
              ? "سنراجع طلبك ونتواصل معك قريباً. يمكنك معاينة أو تحميل نسخة PDF من الاتفاقية الموقعة."
              : "We will review your application and get back to you shortly. You can preview or download a PDF copy of the signed agreement."}
          </p>

          {signedAgreementUrl && (
            <div className="mb-6 grid gap-3">
              <a
                href={signedAgreementUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark"
              >
                <Eye className="h-4 w-4" />
                {isAr ? "معاينة الاتفاقية الموقعة" : "Preview Signed Agreement"}
              </a>

              <a
                href={`${signedAgreementUrl}&download=1`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-6 py-3 text-sm font-extrabold text-primary transition-colors hover:bg-primary/[0.04]"
              >
                <Upload className="h-4 w-4" />
                {isAr ? "تحميل الاتفاقية PDF" : "Download Agreement PDF"}
              </a>
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-dark"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="join-registration-page py-10 lg:py-12">
      <style jsx global>{`
        html:has(.join-registration-page),
        body:has(.join-registration-page) {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        html:has(.join-registration-page)::-webkit-scrollbar,
        body:has(.join-registration-page)::-webkit-scrollbar,
        .join-registration-page::-webkit-scrollbar,
        .join-registration-page *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        .join-registration-page,
        .join-registration-page * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .join-registration-page #join-register-form,
        .join-registration-page #join-form-card,
        .join-registration-page #join-form-card section {
          overflow: visible !important;
          max-height: none !important;
        }

        .join-registration-page #join-form-card {
          min-height: 620px;
        }

        @media (min-width: 1024px) {
          .join-registration-page #join-form-card {
            min-height: 650px;
          }
        }
      `}</style>
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
            {isAr ? "انضم إلى المنصة" : "Join the Platform"}
          </h1>
          <p className="text-text-muted">
            {isAr
              ? "سجل كمقدم خدمة على منصة محامون السعودية"
              : "Register as a service provider on the Saudi Lawyers platform"}
          </p>
        </motion.div>
<div className="mb-5 grid grid-cols-2 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
  <button
    type="button"
    onClick={() => {
      setMode("register");
      setLoginError(null);
    }}
    className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
      mode === "register"
        ? "bg-primary text-white shadow-sm"
        : "text-text-muted hover:text-text-primary"
    }`}
  >
    {isAr ? "تسجيل جديد" : "Register"}
  </button>

  <button
    type="button"
    onClick={() => {
      setMode("login");
      setSubmitError(null);
      setFieldErrors({});
    }}
    className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
      mode === "login" || mode === "forgot" || mode === "reset"
        ? "bg-primary text-white shadow-sm"
        : "text-text-muted hover:text-text-primary"
    }`}
  >
    {isAr ? "تسجيل الدخول" : "Login"}
  </button>
</div>
       <motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
  {mode === "login" ? (
    <form onSubmit={handleLogin} className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_55px_rgba(7,17,31,0.08)]">
      <div>
<label className="mb-1.5 block text-sm font-bold text-text-primary">
  {isAr ? "رقم المحامي / رقم الرخصة" : "Lawyer Number / License Number"}
</label>

<div className="relative">
  <User className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
  <input
    name="licenseNumber"
    type="text"
    required
    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 rtl:pr-11"
    placeholder={isAr ? "أدخل رقم المحامي" : "Enter lawyer number"}
  />
</div>
</div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-text-primary">
          {isAr ? "كلمة المرور" : "Password"}
        </label>

        <div className="relative">
          <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
         <input
  name="password"
  type={showLoginPassword ? "text" : "password"}
  required
  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
  placeholder={isAr ? "أدخل كلمة المرور" : "Enter password"}
/>

<button
  type="button"
  onClick={() => setShowLoginPassword((v) => !v)}
  className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
  aria-label={showLoginPassword ? "Hide password" : "Show password"}
>
  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
        </div>
      </div>
<div className="text-end">
  <button
    type="button"
    onClick={() => {
      setMode("forgot");
      setForgotError(null);
      setForgotSent(false);
    }}
    className="text-xs font-bold text-primary hover:text-primary-dark"
  >
    {isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
  </button>
</div>
      {loginError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {loginError}
        </div>
      )}

      <button
        type="submit"
        disabled={loginSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loginSubmitting
          ? isAr
            ? "جاري تسجيل الدخول..."
            : "Logging in..."
          : isAr
            ? "تسجيل الدخول"
            : "Login"}
      </button>

      <p className="text-center text-xs text-text-muted">
        {isAr ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode("register")}
          className="font-bold text-primary hover:text-primary-dark"
        >
          {isAr ? "قدّم طلب انضمام" : "Submit an application"}
        </button>
      </p>
    </form>
  ) : mode === "forgot" ? (
  <form
    onSubmit={handleForgotPassword}
    className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_55px_rgba(7,17,31,0.08)]"
  >
    <div>
      <h2 className="text-xl font-extrabold text-text-primary">
        {isAr ? "استرجاع كلمة المرور" : "Reset Password"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-text-muted">
        {isAr
          ? "أدخل رقم المحامي أو البريد الإلكتروني وسنرسل لك رابط تعيين كلمة مرور جديدة."
          : "Enter your lawyer number or email and we will send you a link to set a new password."}
      </p>
    </div>

    {forgotSent ? (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        {isAr
          ? "إذا كان الحساب موجوداً، تم إرسال رابط استرجاع كلمة المرور إلى البريد الإلكتروني."
          : "If the account exists, a reset link has been sent to the registered email."}
      </div>
    ) : (
      <div>
        <label className="mb-1.5 block text-sm font-bold text-text-primary">
          {isAr ? "رقم المحامي أو البريد الإلكتروني" : "Lawyer number or email"}
        </label>

        <div className="relative">
          <User className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
          <input
            name="identifier"
            type="text"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 rtl:pr-11"
            placeholder={isAr ? "أدخل رقم المحامي أو البريد" : "Enter lawyer number or email"}
          />
        </div>
      </div>
    )}

    {forgotError && (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        {forgotError}
      </div>
    )}

    {!forgotSent && (
      <button
        type="submit"
        disabled={forgotSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {forgotSubmitting
          ? isAr
            ? "جاري الإرسال..."
            : "Sending..."
          : isAr
            ? "إرسال رابط الاسترجاع"
            : "Send reset link"}
      </button>
    )}

    <button
      type="button"
      onClick={() => setMode("login")}
      className="w-full text-center text-xs font-bold text-primary hover:text-primary-dark"
    >
      {isAr ? "العودة لتسجيل الدخول" : "Back to login"}
    </button>
  </form> ) : mode === "reset" ? (
  <form
    onSubmit={handleResetPassword}
    className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_55px_rgba(7,17,31,0.08)]"
  >
    <div>
      <h2 className="text-xl font-extrabold text-text-primary">
        {isAr ? "تعيين كلمة مرور جديدة" : "Set New Password"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-text-muted">
        {isAr
          ? "أدخل كلمة المرور الجديدة لحسابك."
          : "Enter a new password for your account."}
      </p>
    </div>

    {resetSuccess ? (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {isAr
            ? "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن."
            : "Password changed successfully. You can now log in."}
        </div>

        <button
          type="button"
          onClick={() => setMode("login")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
        >
          {isAr ? "تسجيل الدخول" : "Login"}
        </button>
      </div>
    ) : (
      <>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-text-primary">
            {isAr ? "كلمة المرور الجديدة" : "New Password"}
          </label>

          <div className="relative">
            <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
            <input
              name="password"
              type={showResetPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
              placeholder={isAr ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
            />

            <button
              type="button"
              onClick={() => setShowResetPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
              aria-label={showResetPassword ? "Hide password" : "Show password"}
            >
              {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <p className="mt-1 text-[11px] text-text-muted">
            {isAr
              ? "8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
              : "At least 8 characters, uppercase, lowercase, and a number"}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-text-primary">
            {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
          </label>

          <div className="relative">
            <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
            <input
              name="confirmPassword"
              type={showResetConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
              placeholder={isAr ? "أعد إدخال كلمة المرور" : "Confirm password"}
            />

            <button
              type="button"
              onClick={() => setShowResetConfirmPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
              aria-label={showResetConfirmPassword ? "Hide password" : "Show password"}
            >
              {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {resetError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {resetError}
          </div>
        )}

        <button
          type="submit"
          disabled={resetSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {resetSubmitting
            ? isAr
              ? "جاري الحفظ..."
              : "Saving..."
            : isAr
              ? "حفظ كلمة المرور الجديدة"
              : "Save new password"}
        </button>
      </>
    )}
  </form> ) : (
<form
  id="join-register-form"
  noValidate
  onSubmit={handleSubmit}
  className="space-y-6"
>
  <div
    id="join-form-card"
    className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_55px_rgba(7,17,31,0.08)] sm:p-6"
  >
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            {isAr ? "خطوات التسجيل" : "Registration Steps"}
          </p>
          <h2 className="mt-1 text-xl font-black text-text-primary">
            {registerSteps[registerStep - 1].title}
          </h2>
          <p className="mt-1 text-xs font-bold text-text-muted">
            {registerSteps[registerStep - 1].desc}
          </p>
        </div>

 
      </div>

      <div className="flex items-center gap-2">
        {registerSteps.map((item, index) => (
          <div key={item.number} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (item.number < registerStep) {
                  goToRegisterStep(item.number);
                }
              }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                registerStep === item.number
                  ? "bg-primary text-white"
                  : item.number < registerStep
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-text-muted"
              }`}
            >
              {item.number < registerStep ? <Check size={14} /> : item.number}
            </button>

            {index < registerSteps.length - 1 && (
              <div
                className={`h-1 flex-1 rounded-full ${
                  item.number < registerStep ? "bg-primary/40" : "bg-gray-100"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
<section className={registerStep === 1 ? "space-y-6" : "hidden"}>
{/* Subscription Types + Experience */}
<div>
  <label className="mb-1.5 block text-sm font-bold text-text-primary">
    {isAr ? "أنواع الاشتراك" : "Subscription Types"}
  </label>

  <p className="mb-3 text-xs leading-6 text-text-muted">
    {isAr
      ? "يمكنك اختيار أكثر من صفة."
      : "You can select more than one role."}
  </p>

  <input
    type="hidden"
    name="subscriptionTypes"
    value={JSON.stringify(selectedSubscriptionTypes)}
  />

  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {subscriptionTypes.en.map((canonical, index) => {
      const selected = selectedSubscriptionTypes.includes(canonical);

      return (
        <button
          key={canonical}
          type="button"
          aria-pressed={selected}
          onClick={() => {
            setSelectedSubscriptionTypes((current) =>
              current.includes(canonical)
                ? current.filter((item) => item !== canonical)
                : [...current, canonical],
            );

            setFieldErrors((current) => {
              const next = { ...current };
              delete next.subscriptionType;

              if (canonical === "Lawyer") {
                delete next.registrationLevel;
              }

              return next;
            });

            setSubmitError(null);
          }}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-extrabold transition ${
            selected
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-gray-200 bg-white text-text-secondary hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              selected
                ? "border-white bg-white/15 text-white"
                : "border-gray-300 text-transparent"
            }`}
          >
            <Check size={12} />
          </span>
          <span>{labels[index]}</span>
        </button>
      );
    })}
  </div>

  {fieldErrors.subscriptionType && (
    <p className="mt-2 text-xs font-bold text-red-600">
      {fieldErrors.subscriptionType}
    </p>
  )}
</div>

<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "سنوات الخبرة" : "Years of Experience"}
  </label>

  <input
    name="experienceYears"
    type="number"
    min={0}
    max={80}
    required
    inputMode="numeric"
    placeholder={isAr ? "مثال: 5" : "Example: 5"}
    className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm focus:outline-none focus:border-primary"
    onChange={() => {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.experienceYears;
        return next;
      });

      setSubmitError(null);
    }}
  />

  {fieldErrors.experienceYears && (
    <p className="mt-1 text-xs font-bold text-red-600">
      {fieldErrors.experienceYears}
    </p>
  )}
</div>

{selectedSubscriptionTypes.includes("Lawyer") && (
  <div>
    <label className="mb-1.5 block text-sm font-bold text-text-primary">
      {isAr ? "نوع القيد" : "Registration Level"}
    </label>

    <select
      name="registrationLevel"
      required
      defaultValue=""
      onChange={() => {
        setFieldErrors((current) => {
          const next = { ...current };
          delete next.registrationLevel;
          return next;
        });
      }}
      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-primary"
    >
      <option value="">
        {isAr ? "اختر نوع القيد" : "Select registration level"}
      </option>

      {(isAr ? registrationLevelOptions.ar : registrationLevelOptions.en).map(
        (item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ),
      )}
    </select>

    {fieldErrors.registrationLevel && (
      <p className="mt-2 text-xs font-bold text-red-600">
        {fieldErrors.registrationLevel}
      </p>
    )}
  </div>
)}

<div>
  <div className="mb-2 flex items-center justify-between gap-3">
    <label className="block text-sm font-bold text-text-primary">
      {isAr ? "التخصصات / مجالات الخدمة" : "Specialties / Service Areas"}
    </label>
  </div>

<p className="mb-3 text-xs text-text-muted">
{isAr
  ? "اختر تخصصاً رئيسياً واحداً، ثم اختر تخصصين فرعيين."
  : "Choose one main specialty, then select 2 sub-specialties."}
</p>

<div className="mb-3">
  <label className="mb-1.5 block text-xs font-bold text-text-muted">
    {isAr ? "التخصص الرئيسي" : "Main Specialty"}
  </label>

  <select
    value={selectedMainSpecialty}
    onChange={(e) => {
  const value = e.target.value;

  setSelectedMainSpecialty(value);

  setSelectedSpecialties((prev) =>
    prev.filter((item) => item !== value),
  );

  setFieldErrors((current) => {
    const next = { ...current };
    delete next.specialties;
    return next;
  });
}}
    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
      value={selectedSpecialties[0] ?? ""}
      onChange={(e) => setSubSpecialtyAt(0, e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
  selectedSpecialties[1] === item.value
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
      value={selectedSpecialties[1] ?? ""}
      onChange={(e) => setSubSpecialtyAt(1, e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
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
  selectedSpecialties[0] === item.value
}
        >
          {isAr ? item.ar : item.en}
        </option>
      ))}
    </select>
  </div>
</div>



  {fieldErrors.specialties && (
    <p className="mt-2 text-xs font-bold text-red-600">
      {fieldErrors.specialties}
    </p>
  )}
</div>


</section>

<section className={registerStep === 2 ? "space-y-6" : "hidden"}>
{/* Profile Image */}
<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "الصورة الشخصية" : "Profile Image"}
  </label>

 <input
  id="profileImage"
  name="profileImage"
  type="file"
  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
  required
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    setProfileImageName(file?.name ?? "");

    if (file) {
      setProfileImagePreview(URL.createObjectURL(file));
    } else {
      setProfileImagePreview(null);
    }
  }}
/>

  <label
    htmlFor="profileImage"
    className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:border-primary/30 transition-colors"
  >
    <div className="relative flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-primary/[0.035] ring-4 ring-primary/[0.025]">
      {profileImagePreview ? (
       <img
  src={profileImagePreview}
  alt={isAr ? "الصورة الشخصية" : "Profile image"}
  className="h-full w-full object-cover"
/>
      ) : (
        <User className="h-8 w-8 text-primary/45" />
      )}
    </div>

    <div>
      <p className="text-sm font-bold text-text-primary">
        {profileImageName ||
          (isAr ? "اضغط لتحميل الصورة الشخصية" : "Click to upload profile image")}
      </p>
      <p className="text-xs text-text-muted mt-1">
        JPG, PNG, WEBP, HEIC, HEIF, GIF, AVIF (max 3MB)
      </p>
    </div>
  </label>
  {fieldErrors.profileImage && (
  <p className="mt-2 text-xs font-bold text-red-600">
    {fieldErrors.profileImage}
  </p>
)}
</div>

          {/* Name fields */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "الاسم الكامل بالعربي" : "Full Name Arabic"}
    </label>
    <input
      name="fullNameAr"
      type="text"
      required
      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
    />
    {fieldErrors.fullNameAr && (
  <p className="mt-1 text-xs font-bold text-red-600">
    {fieldErrors.fullNameAr}
  </p>
)}
  </div>

  <div>
    <label className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "الاسم الكامل بالإنجليزي" : "Full Name English"}
    </label>
    <input
      name="fullNameEn"
      type="text"
      required
      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
    />
    {fieldErrors.fullNameEn && (
  <p className="mt-1 text-xs font-bold text-red-600">
    {fieldErrors.fullNameEn}
  </p>
)}
  </div>
</div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-text-primary mb-1.5">
                  {isAr ? "البريد الإلكتروني" : "Email"}
                </label>
                <input name="email" type="email" required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary" />
                {fieldErrors.email && (
  <p className="mt-1 text-xs font-bold text-red-600">
    {fieldErrors.email}
  </p>
)}
              </div>
              <div>
                <label className="block text-sm font-bold text-text-primary mb-1.5">
                  {isAr ? "رقم الهاتف" : "Phone Number"}
                </label>
                <input name="phone" type="tel" required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary" />
              {fieldErrors.phone && (
  <p className="mt-1 text-xs font-bold text-red-600">
    {fieldErrors.phone}
  </p>
)}
              
              </div>
            </div>
{/* Password */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "كلمة المرور" : "Password"}
    </label>

    <div className="relative">
      <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
      <input
  name="password"
  type={showPassword ? "text" : "password"}
  required
  minLength={8}
  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
  placeholder={isAr ? "أدخل كلمة المرور" : "Enter password"}
/>

<button
  type="button"
  onClick={() => setShowPassword((v) => !v)}
  className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
  aria-label={showPassword ? "Hide password" : "Show password"}
>
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
    </div>

    <p className="mt-1 text-[11px] text-text-muted">
      {isAr
        ? "8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
        : "At least 8 characters, uppercase, lowercase, and a number"}
    </p>

    {fieldErrors.password && (
      <p className="mt-1 text-xs font-bold text-red-600">
        {fieldErrors.password}
      </p>
    )}
  </div>

  <div>
    <label className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
    </label>

    <div className="relative">
      <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ltr:left-4 rtl:right-4" />
      <input
  name="confirmPassword"
  type={showConfirmPassword ? "text" : "password"}
  required
  minLength={8}
  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary ltr:pl-11 ltr:pr-11 rtl:pr-11 rtl:pl-11"
  placeholder={isAr ? "أعد إدخال كلمة المرور" : "Confirm password"}
/>

<button
  type="button"
  onClick={() => setShowConfirmPassword((v) => !v)}
  className="absolute top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-primary ltr:right-4 rtl:left-4"
  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
>
  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
    </div>

    {fieldErrors.confirmPassword && (
      <p className="mt-1 text-xs font-bold text-red-600">
        {fieldErrors.confirmPassword}
      </p>
    )}
  </div>
</div>
            {/* Language */}
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">
                {isAr ? "اللغة" : "Language"}
              </label>
              <select name="language" required defaultValue="" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white">
                <option value="" disabled>
                  {isAr ? "اختر اللغة" : "Select language"}
                </option>
                {languages.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              {fieldErrors.language && (
  <p className="mt-1 text-xs font-bold text-red-600">
    {fieldErrors.language}
  </p>
)}
            </div>

</section>

<section className={registerStep === 3 ? "space-y-6" : "hidden"}>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-bold text-text-primary mb-1.5">
{isAr ? "رقم الرخصة" : "License Number"}
    </label>

    <input
      name="licenseNumber"
      type="text"
      required
      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
    />

    {fieldErrors.licenseNumber && (
      <p className="mt-1 text-xs font-bold text-red-600">
        {fieldErrors.licenseNumber}
      </p>
    )}
  </div>

  <div>
    <label className="block text-sm font-bold text-text-primary mb-1.5">
      {isAr ? "تاريخ انتهاء الرخصة" : "License Expiry Date"}
    </label>

    <input
      name="licenseExpiryDate"
      type="date"
      required
      min={todayDate}
      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
    />

    {fieldErrors.licenseExpiryDate && (
      <p className="mt-1 text-xs font-bold text-red-600">
        {fieldErrors.licenseExpiryDate}
      </p>
    )}
  </div>
</div>

<div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] p-4 sm:p-5">
  <div className="mb-4">
    <h3 className="text-sm font-black text-text-primary">
      {isAr ? "بيانات المؤسسة" : "Institution Details"}
    </h3>
    <p className="mt-1 text-xs leading-6 text-text-muted">
      {isAr
        ? "رقم السجل التجاري ورخصة المؤسسة اختياري."
        : "The commercial registration number and institution license are optional."}
    </p>
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-1.5 block text-sm font-bold text-text-primary">
        {isAr ? "رقم السجل التجاري (اختياري)" : "CR Number (Optional)"}
      </label>

      <input
        name="crNumber"
        type="text"
        maxLength={80}
        placeholder={isAr ? "مثال: 123456-1" : "Example: 123456-1"}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm focus:border-primary focus:outline-none"
        onChange={() => {
          setFieldErrors((current) => {
            const next = { ...current };
            delete next.crNumber;
            return next;
          });
        }}
      />
    </div>

    <div>
      <label className="mb-1.5 block text-sm font-bold text-text-primary">
        {isAr ? "رخصة المؤسسة (اختياري)" : "Institution License (Optional)"}
      </label>

      <input
        id="institutionLicenseFile"
        name="institutionLicenseFile"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setInstitutionLicenseFileName(file?.name ?? "");

          setFieldErrors((current) => {
            const next = { ...current };
            delete next.institutionLicenseFile;
            return next;
          });
        }}
      />

      <label
        htmlFor="institutionLicenseFile"
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm transition hover:border-primary/40"
      >
        <Upload className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 truncate text-text-muted">
          {institutionLicenseFileName ||
            (isAr ? "اختر ملف رخصة المؤسسة" : "Choose institution license file")}
        </span>
      </label>

      {fieldErrors.institutionLicenseFile && (
        <p className="mt-1 text-xs font-bold text-red-600">
          {fieldErrors.institutionLicenseFile}
        </p>
      )}
    </div>
  </div>
</div>

<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "رقم الآيبان" : "IBAN Number"}
  </label>

  <input
    name="ibanNumber"
    type="text"
    required
    dir="ltr"
    placeholder="BH00 XXXX XXXX XXXX XXXX XX"
    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
    onChange={() => {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.ibanNumber;
        return next;
      });
    }}
  />

  {fieldErrors.ibanNumber && (
    <p className="mt-1 text-xs font-bold text-red-600">
      {fieldErrors.ibanNumber}
    </p>
  )}
</div>

<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "شهادة الآيبان" : "IBAN Certificate"}
  </label>

  <input
    id="ibanCertificateFile"
    name="ibanCertificateFile"
    type="file"
    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
    className="hidden"
    onChange={(event) => {
      const file = event.target.files?.[0];

      setIbanCertificateFileName(file?.name ?? "");

      setFieldErrors((current) => {
        const next = { ...current };
        delete next.ibanCertificateFile;
        return next;
      });
    }}
  />

  <label
    htmlFor="ibanCertificateFile"
    className="block border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-primary/30 transition-colors cursor-pointer"
  >
    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />

    <p className="text-sm text-text-muted">
      {ibanCertificateFileName ||
        (isAr ? "اضغط لتحميل شهادة الآيبان" : "Click to upload IBAN certificate")}
    </p>

    <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG (max 5MB)</p>
  </label>

  {fieldErrors.ibanCertificateFile && (
    <p className="mt-2 text-xs font-bold text-red-600">
      {fieldErrors.ibanCertificateFile}
    </p>
  )}
</div>

<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "ساعات العمل" : "Working Hours"}
  </label>

  <select
    name="workingHours"
    required
    defaultValue=""
    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
  >
    <option value="" disabled>
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

  {fieldErrors.workingHours && (
    <p className="mt-1 text-xs font-bold text-red-600">
      {fieldErrors.workingHours}
    </p>
  )}
</div>


          {/* License Upload */}
<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "رخصة الممارسة" : "Practice License"}
  </label>

  <input
    id="licenseFile"
    name="licenseFile"
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    required
    className="hidden"
    onChange={(e) => {
      setLicenseFileName(e.target.files?.[0]?.name ?? "");
    }}
  />

  <label
    htmlFor="licenseFile"
    className="block border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-primary/30 transition-colors cursor-pointer"
  >
    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
    <p className="text-sm text-text-muted">
      {licenseFileName ||
        (isAr ? "اضغط لتحميل رخصة الممارسة" : "Click to upload practice license")}
    </p>
    <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG (max 5MB)</p>
  </label>
  
{fieldErrors.licenseFile && (
  <p className="mt-2 text-xs font-bold text-red-600">
    {fieldErrors.licenseFile}
  </p>
)}
</div>

{/* Personal ID Card Upload */}
<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "البطاقة الشخصية" : "Personal ID Card"}
  </label>

  <input
    id="personalIdFile"
    name="personalIdFile"
    type="file"
    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
    required
    className="hidden"
    onChange={(e) => {
      setPersonalIdFileName(e.target.files?.[0]?.name ?? "");

      setFieldErrors((current) => {
        const next = { ...current };
        delete next.personalIdFile;
        return next;
      });
    }}
  />

  <label
    htmlFor="personalIdFile"
    className="block border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-primary/30 transition-colors cursor-pointer"
  >
    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />

    <p className="text-sm text-text-muted">
      {personalIdFileName ||
        (isAr ? "اضغط لتحميل البطاقة الشخصية" : "Click to upload personal ID card")}
    </p>

    <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG (max 5MB)</p>
  </label>

  {fieldErrors.personalIdFile && (
    <p className="mt-2 text-xs font-bold text-red-600">
      {fieldErrors.personalIdFile}
    </p>
  )}
</div>

</section>

<section className={registerStep === 4 ? "space-y-6" : "hidden"}>
            {/* Agreement */}
            <div className="bg-bg-light rounded-xl p-5 border border-gray-100">
              <h3 className="flex items-center gap-2 font-bold text-text-primary mb-4">
                <Scale className="w-5 h-5 text-primary" />
                {isAr ? "اتفاقية مقدم الخدمة" : "Service Provider Agreement"}
              </h3>
              <ol className="space-y-3 mb-5">
                {points.map((point, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm text-text-muted leading-relaxed">{point}</span>
                  </li>
                ))}
              </ol>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="accent-primary mt-1" />
                <span className="text-sm text-text-secondary">
                  {isAr
                    ? "أوافق على الشروط والأحكام واتفاقية مقدم الخدمة"
                    : "I agree to the Terms & Conditions and Service Provider Agreement"}
                </span>
              </label>


              {fieldErrors.agreed && (
  <p className="mt-3 text-xs font-bold text-red-600">
    {fieldErrors.agreed}
  </p>
)}
            </div>


{/* Signature */}
<div>
  <label className="block text-sm font-bold text-text-primary mb-1.5">
    {isAr ? "التوقيع الإلكتروني" : "Electronic Signature"}
  </label>

  <div className="rounded-xl border border-gray-200 bg-white p-3">
    <SignatureCanvas
      ref={signatureRef}
      penColor="black"
      onEnd={() => {
        setFieldErrors((current) => {
          const next = { ...current };
          delete next.signatureDataUrl;
          return next;
        });
      }}
      canvasProps={{
        className: "block h-40 w-full rounded-lg bg-white touch-none",
        style: {
          width: "100%",
          height: "160px",
          display: "block",
          touchAction: "none",
        },
      }}
    />
    
  </div>

  <div className="flex justify-end mt-2">
    <button
      type="button"
      onClick={() => signatureRef.current?.clear()}
      className="text-sm font-bold text-red-600 hover:text-red-700"
    >
      {isAr ? "مسح التوقيع" : "Clear Signature"}
    </button>
  </div>

  {fieldErrors.signatureDataUrl && (
  <p className="mt-2 text-xs font-bold text-red-600">
    {fieldErrors.signatureDataUrl}
  </p>
)}
</div>

</section>

            {submitError && Object.keys(fieldErrors).length === 0 && (
  <div
    id="join-form-error"
    className="rounded-lg border border-red-200 bg-red-50 mt-2 px-4 py-3 text-sm text-red-700"
  >
                {isAr ? "تعذر إرسال الطلب. حاول مرة أخرى." : "Could not submit your application. Please try again."}
                <span className="block text-xs text-red-500 mt-1">{submitError}</span>
              </div>
            )}


            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => goToRegisterStep((registerStep - 1) as 1 | 2 | 3 | 4)}
                disabled={registerStep === 1}
                className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAr ? "السابق" : "Back"}
              </button>

              {registerStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark sm:w-auto"
                >
                  {isAr ? "التالي" : "Next"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <CheckCircle size={18} />
                  {submitting
                    ? isAr
                      ? "جاري الإرسال..."
                      : "Sending..."
                    : isAr
                      ? "تقديم الطلب"
                      : "Submit Application"}
                </button>
              )}
            </div>
            </div>
          </form>
      )}
</motion.div>
      </div>
    </div>
  );
}
