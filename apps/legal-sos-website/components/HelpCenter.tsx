"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MagnifyingGlass, PaperPlaneTilt, Question } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useSite } from "./providers/SiteProvider";

const copy = {
  ar: {
    eyebrow: "النجدة القانونية / المساعدة", title: "مركز المساعدة", intro: "إجابات واضحة على الأسئلة الأكثر شيوعًا، وخطوة مباشرة إذا احتجت إلى مساعدة قانونية.",
    search: "ابحث في الأسئلة الشائعة", all: "كل الأسئلة", topics: ["الحساب", "تحديد الموقع", "السلامة"],
    faq: "الأسئلة الشائعة", empty: "لم نجد سؤالًا مطابقًا. جرّب كلمات مختلفة أو أرسل سؤالك عبر SOS.",
    askEyebrow: "لم تجد جوابك؟", askHint: "اكتب سؤالك هنا لنقله إلى طلب SOS. لن تحصل على إجابة آلية فورية.",
    askButton: "تابع عبر SOS", back: "العودة للرئيسية", terms: "الشروط وسياسة الخصوصية",
  },
  en: {
    eyebrow: "Legal SOS / Help", title: "Help center", intro: "Clear answers to common questions, with a direct next step when you need legal help.",
    search: "Search frequently asked questions", all: "All questions", topics: ["Account", "Location", "Safety"],
    faq: "Frequently asked questions", empty: "No matching question was found. Try different words or send your question through SOS.",
    askEyebrow: "Still need help?", askHint: "Write your question here to carry it into an SOS request. This is not an instant automated answer.",
    askButton: "Continue with SOS", back: "Back to home", terms: "Privacy Policy and Terms",
  },
  tr: {
    eyebrow: "Legal SOS / Yardım", title: "Yardım merkezi", intro: "Sık sorulan sorulara açık yanıtlar ve hukuki yardım gerektiğinde doğrudan sonraki adım.",
    search: "Sık sorulan sorularda ara", all: "Tüm sorular", topics: ["Hesap", "Konum", "Güvenlik"],
    faq: "Sık sorulan sorular", empty: "Eşleşen soru bulunamadı. Farklı kelimeler deneyin veya sorunuzu SOS üzerinden gönderin.",
    askEyebrow: "Yanıtınızı bulamadınız mı?", askHint: "Sorunuzu SOS talebine aktarmak için buraya yazın. Anında otomatik yanıt verilmez.",
    askButton: "SOS ile devam et", back: "Ana sayfaya dön", terms: "Gizlilik Politikası ve Koşullar",
  },
};

export function HelpCenter({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const t = copy[locale];
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const needle = search.trim().toLocaleLowerCase(locale);
  const faqs = dictionary.faq.map((item, index) => ({ ...item, index })).filter((item) =>
    (topic === null || item.index === topic) &&
    (!needle || `${item.q} ${item.a}`.toLocaleLowerCase(locale).includes(needle)),
  );

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.trim().length >= 20) site.openSos(question.trim());
  }

  return <>
    <main className="help-page">
      <section className="help-hero">
        <div className="container help-hero-grid">
          <div className="help-hero-copy">
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            <Link className="help-back-link" href={`/${locale}`}><ArrowLeft size={17} />{t.back}</Link>
          </div>
          <div className="help-hero-art" aria-hidden="true"><Image src="/images/scales-of-justice.png" alt="" fill sizes="(max-width: 760px) 90vw, 36vw" /></div>
        </div>
      </section>

      <section className="section-block help-faq-section">
        <div className="container help-faq-layout">
          <div className="help-faq-heading"><span className="help-faq-icon"><Question size={28} /></span><h2>{t.faq}</h2><p>{dictionary.faq.length} {locale === "ar" ? "أسئلة" : locale === "tr" ? "soru" : "questions"}</p></div>
          <div className="help-faq-main">
            <label className="help-search"><MagnifyingGlass size={21} /><span className="sr-only">{t.search}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} /></label>
            <div className="help-topics" aria-label={t.faq}>
              <button type="button" className={topic === null ? "active" : ""} onClick={() => setTopic(null)}>{t.all}</button>
              {dictionary.faq.slice(0, 3).map((item, index) => <button type="button" key={item.q} className={topic === index ? "active" : ""} onClick={() => setTopic(index)}>{t.topics[index]}</button>)}
            </div>
            <div className="help-faq-list">
              {faqs.length ? faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>) : <p className="help-empty" role="status">{t.empty}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block help-ask-section">
        <div className="container help-ask-grid">
          <div><span className="eyebrow">{t.askEyebrow}</span><h2>{dictionary.questions.title}</h2><p>{t.askHint}</p></div>
          <form onSubmit={submitQuestion} className="help-ask-form">
            <label className="sr-only" htmlFor="help-question">{dictionary.questions.placeholder}</label>
            <textarea id="help-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={dictionary.questions.placeholder} minLength={20} maxLength={2000} rows={5} required />
            <button type="submit" className="sos-primary"><PaperPlaneTilt size={19} weight="fill" />{t.askButton}</button>
          </form>
        </div>
      </section>
      <div className="container help-disclaimer">{dictionary.emergencyDisclaimer}</div>
    </main>
    <footer className="help-footer"><div className="container"><span>{dictionary.brand}</span><Link href={`/${locale}/terms`}>{t.terms}</Link></div></footer>
  </>;
}
