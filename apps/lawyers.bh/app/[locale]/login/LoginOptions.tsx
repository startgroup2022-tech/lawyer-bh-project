import Link from "next/link";
import { BriefcaseBusiness, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";

export default function LoginOptions({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  return <main dir={isAr ? "rtl" : "ltr"} className="min-h-[65vh] bg-[#F3F6FA] px-5 py-16 text-[#082B67]">
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-bold text-[#B4232A]">{isAr ? "مرحبًا بعودتك" : "Welcome back"}</p>
      <h1 className="mt-3 text-3xl font-black md:text-4xl">{isAr ? "تسجيل الدخول" : "Login"}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">{isAr ? "اختر نوع حسابك للمتابعة إلى لوحة التحكم الخاصة بك." : "Choose your account type to continue to your dashboard."}</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {[{ role: "provider", Icon: BriefcaseBusiness, title: isAr ? "المحامون ومقدمو الخدمات" : "Lawyers & Service Providers", description: isAr ? "الدخول برقم الرخصة أو الرقم الشخصي لإدارة طلباتك وملفك." : "Use your license number or personal number to manage requests and your profile." }, { role: "admin", Icon: ShieldCheck, title: isAr ? "الإدارة" : "Administration", description: isAr ? "دخول خاص بفريق الإدارة باستخدام البريد الإلكتروني." : "Dedicated access for administrators using an email address." }].map(({ role, Icon, title, description }) => <Link key={role} href={`/${locale}/login/${role}`} className="group rounded-3xl border border-transparent bg-white p-7 shadow-sm transition hover:border-white hover:shadow-lg focus-visible:outline-2 focus-visible:outline-[#B4232A]">
          <Icon className="h-10 w-10 text-[#B4232A]" aria-hidden="true" />
          <h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          <span className="mt-6 inline-flex items-center gap-2 font-bold text-[#B4232A]">{isAr ? "تسجيل الدخول" : "Login"}<Arrow className="h-4 w-4" aria-hidden="true" /></span>
        </Link>)}
      </div>
      <Link href={`/${locale}/join`} className="mt-8 inline-block text-sm font-bold text-[#082B67] underline underline-offset-4">{isAr ? "مقدم خدمة؟ سجّل في المنصة" : "Service provider? Register on the platform"}</Link>
    </div>
  </main>;
}
