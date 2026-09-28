import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { policyCatalog, publicPolicyTypes, type PublicPolicyState } from "@/lib/terms-management/policy-catalog";
import type { PublicPolicyType } from "@/lib/terms-management/types";

export function PolicyText({ text }: { text: string }) {
  return <div className="space-y-6 break-words text-base leading-8 text-slate-600">{text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean).map((block, index) => {
    const lines = block.split("\n").filter(line => line.trim());
    if (lines.every(line => /^[-*•]\s+/.test(line.trim()))) return <ul key={index} className="list-disc space-y-2 ps-6">{lines.map((line, i) => <li key={i}>{line.trim().replace(/^[-*•]\s+/, "")}</li>)}</ul>;
    return <p key={index} className="whitespace-pre-wrap">{block}</p>;
  })}</div>;
}
export default function PolicyView({ locale, type, state }: { locale: string; type: PublicPolicyType; state: PublicPolicyState }) {
  const ar = locale === "ar";
  const policy = policyCatalog[type];
  const publication = state.status === "published" ? state.publication : null;
  return <main dir={ar ? "rtl" : "ltr"} className="min-h-[65vh] bg-[#F3F6FA] px-5 py-12 text-[#082B67] md:py-20">
    <div className="mx-auto max-w-4xl">
      <Link href={`/${locale}`} className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-sm"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "العودة للرئيسية" : "Back to home"}</Link>
      <header className="rounded-3xl bg-gradient-to-bl from-[#B4232A] to-[#74171C] p-7 text-white md:p-10">
        <FileText className="mb-5 h-9 w-9" aria-hidden="true" />
        <h1 className="text-3xl font-black leading-normal md:text-4xl">{ar ? policy.ar : policy.en}</h1>
        {publication ? <p className="mt-4 text-sm text-white/85">{ar ? "الإصدار" : "Version"} {publication.version}{publication.publishedAt ? <> · {ar ? "نُشر في" : "Published"} <time dateTime={publication.publishedAt}>{new Intl.DateTimeFormat(ar ? "ar-BH" : "en-GB", { dateStyle: "long", timeZone: "Asia/Bahrain" }).format(new Date(publication.publishedAt))}</time></> : null}</p> : null}
      </header>
      <nav aria-label={ar ? "السياسات العامة" : "Public policies"} className="my-6 flex flex-wrap gap-2">{publicPolicyTypes.map(key => <Link key={key} href={`/${locale}${policyCatalog[key].path}`} aria-current={key === type ? "page" : undefined} className={`rounded-xl px-4 py-3 text-sm font-bold ${key === type ? "bg-[#082B67] text-white" : "bg-white text-[#082B67] hover:text-[#B4232A]"}`}>{ar ? policyCatalog[key].ar : policyCatalog[key].en}</Link>)}</nav>
      <article className="rounded-3xl border border-transparent bg-white p-6 shadow-sm hover:border-white md:p-10">
        {publication ? <PolicyText text={ar ? publication.contentAr : publication.contentEn} /> : <div role="status" className="py-8 text-center">
          <h2 className="text-xl font-bold">{state.status === "error" ? (ar ? "تعذر تحميل السياسة حاليًا" : "Unable to load this policy") : (ar ? "لا توجد نسخة منشورة حاليًا" : "No published version is currently available")}</h2>
          <p className="mt-3 leading-7 text-slate-600">{ar ? "يمكنك التواصل معنا للاستفسار عن هذه السياسة." : "Please contact us with questions about this policy."}</p>
          {state.status === "error" ? <a href={`/${locale}${policy.path}`} className="mt-5 inline-flex rounded-xl bg-[#B4232A] px-5 py-3 font-bold text-white">{ar ? "إعادة المحاولة" : "Try again"}</a> : null}
          <a href="mailto:info@lawyers.bh" className="mx-3 mt-5 inline-flex rounded-xl bg-slate-100 px-5 py-3 font-bold">{ar ? "تواصل معنا" : "Contact us"}</a>
        </div>}
      </article>
    </div>
  </main>;
}
