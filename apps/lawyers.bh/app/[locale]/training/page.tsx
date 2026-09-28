import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { GraduationCap, FileText, ClipboardCheck, ArrowLeft } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import TrainingForm from "./TrainingForm";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { return buildPageMetadata("training", (await params).locale); }
export default async function TrainingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const ar = locale === "ar";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <main dir={ar ? "rtl" : "ltr"} className="bg-[#F3F6FA] text-[#082B67]">
    <section className="bg-gradient-to-bl from-[#B4232A] to-[#65131A] px-5 py-14 text-white md:py-20"><div className="mx-auto max-w-6xl"><GraduationCap className="mb-6 h-12 w-12" /><p className="text-sm font-bold text-white/80">{ar ? "محامون البحرين · التدريب والتطوير" : "Lawyers.bh · Training & development"}</p><h1 className="mt-4 text-4xl font-black leading-normal md:text-5xl">{ar ? "طلبات التدريب" : "Training applications"}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-white/85">{ar ? "خطوتك الأولى نحو الخبرة العملية. قدّم طلب تدريب في المحاماة أو مجال آخر، وعرّفنا بتخصصك واهتماماتك." : "Take a step towards practical experience. Apply for legal training or another field and tell us about your specialization and interests."}</p></div></section>
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-16"><Link href={`/${locale}/careers`} className="mb-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-sm"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "صفحة الوظائف" : "Careers"}</Link>
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_2fr]"><aside className="space-y-5"><h2 className="text-2xl font-black">{ar ? "قبل أن تبدأ" : "Before you begin"}</h2>{[[FileText, ar ? "جهّز مرفقاتك" : "Prepare your documents", ar ? "سيرة ذاتية بصيغة PDF، ويمكنك إضافة رسالة الجامعة إن وجدت." : "A PDF CV is required. You may include a university letter if available."], [ClipboardCheck, ar ? "طلبك قيد الاهتمام" : "What happens next", ar ? "ستحصل على رقم مرجعي بعد الإرسال. تراجع الإدارة الطلبات وتتواصل عند الحاجة؛ لا يُعد الطلب قبولًا أو موعدًا مؤكدًا." : "You receive a reference after submission. Administrators review requests and contact applicants if needed; applying does not guarantee acceptance or a confirmed date."]] .map(([Icon, title, body], i) => { const Symbol = Icon as typeof FileText; return <div key={i} className="rounded-3xl border border-transparent bg-white p-6 shadow-sm hover:border-white"><Symbol className="h-7 w-7 text-[#B4232A]" /><h3 className="mt-4 font-black">{title as string}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body as string}</p></div>; })}</aside><section className="min-w-0 rounded-3xl border border-transparent bg-white p-6 shadow-sm hover:border-white md:p-8"><TrainingForm locale={locale} today={today} /></section></div>
    </div>
  </main>;
}
