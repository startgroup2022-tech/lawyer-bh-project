"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { buildLoginRequest, type LoginRole } from "@/lib/auth/login-routing";

export default function RoleLoginForm({ locale, role }: { locale: string; role: LoginRole }) {
  const isAr = locale === "ar";
  const isAdmin = role === "admin";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const fieldClass = "mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-[#082B67] outline-none focus:border-[#B4232A]";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const request = buildLoginRequest(role, String(form.get("identifier") ?? ""), String(form.get("password") ?? ""), locale);
    setBusy(true); setError("");
    try {
      const response = await fetch(request.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error("login_failed");
      window.location.assign(request.destination);
    } catch {
      setError(isAr ? "تعذر تسجيل الدخول. تحقق من بياناتك وأن الحساب مفعّل، ثم حاول مجددًا." : "Could not sign in. Check your credentials and account activation, then try again.");
      setBusy(false);
    }
  }
  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-[65vh] bg-[#F3F6FA] px-5 py-14 text-[#082B67]">
    <div className="mx-auto max-w-lg">
      <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#082B67] shadow-sm transition hover:border-[#B4232A]/30 hover:text-[#B4232A]">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {isAr ? "العودة لاختيار نوع الحساب" : "Back to account types"}
      </Link>
      <div className="mt-6 rounded-3xl border border-transparent bg-white p-7 shadow-sm">
        <LockKeyhole className="h-9 w-9 text-[#B4232A]" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-black">{isAdmin ? (isAr ? "تسجيل دخول الإدارة" : "Administrator Login") : (isAr ? "دخول المحامين ومقدمي الخدمات" : "Lawyer & Service Provider Login")}</h1>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-bold">{isAdmin ? (isAr ? "البريد الإلكتروني" : "Email address") : (isAr ? "رقم الرخصة / الرقم الشخصي" : "License number / Personal number")}<input name="identifier" type={isAdmin ? "email" : "text"} autoComplete="username" required disabled={busy} className={fieldClass} dir="ltr" /></label>
          <label className="block text-sm font-bold">{isAr ? "كلمة المرور" : "Password"}<span className="relative block"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={busy} className={`${fieldClass} pe-12`} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? (isAr ? "إخفاء كلمة المرور" : "Hide password") : (isAr ? "إظهار كلمة المرور" : "Show password")} className="absolute end-3 top-5 p-1">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span></label>
          {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B4232A] px-5 py-3 font-bold text-white transition hover:bg-[#991B22] disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{isAr ? "تسجيل الدخول" : "Login"}</button>
        </form>
        {!isAdmin ? <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm font-bold"><Link href={`/${locale}/join?mode=forgot`} className="text-[#B4232A]">{isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}</Link><Link href={`/${locale}/join`}>{isAr ? "إنشاء حساب مقدم خدمة" : "Register as a provider"}</Link></div> : null}
      </div>
    </div>
  </main>;
}
