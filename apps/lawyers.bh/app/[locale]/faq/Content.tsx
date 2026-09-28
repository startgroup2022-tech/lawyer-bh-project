"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  HelpCircle,
  MessageCircle,
  Search,
  Scale,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { safeJsonLd } from "@/lib/seo/core";
import { buildFaqGraph } from "@/lib/seo/faq-schema";
import type { PublicFaqGroup } from "@/lib/faq/types";

const iconComponents: Record<PublicFaqGroup["iconKey"], LucideIcon> = {
  "help-circle": HelpCircle,
  scale: Scale,
  "user-check": UserCheck,
  "credit-card": CreditCard,
  "shield-check": ShieldCheck,
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

export default function Content({ faqItems }: { faqItems: PublicFaqGroup[] }) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [openKey, setOpenKey] = useState<string | null>(faqItems[0]?.questions[0]?.id ?? null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const totalQuestions = faqItems.reduce((total, group) => total + group.questions.length, 0);

  const filteredFaq = useMemo(() => {
    const search = normalizeSearchValue(query);

    return faqItems
      .filter((group) => activeCategory === "all" || group.key === activeCategory)
      .map((group) => {
        if (!search) return group;

        return {
          ...group,
          questions: group.questions.filter((item) => {
            const searchPool = normalizeSearchValue(
              `${item.q.ar} ${item.q.en} ${item.a.ar} ${item.a.en}`,
            );

            return searchPool.includes(search);
          }),
        };
      })
      .filter((group) => group.questions.length > 0);
  }, [activeCategory, faqItems, query]);

  const visibleQuestionsCount = filteredFaq.reduce(
    (total, group) => total + group.questions.length,
    0,
  );
  const faqJsonLd = buildFaqGraph(faqItems.flatMap((group) => group.questions.map((item) => ({ question: item.q[isAr ? "ar" : "en"], answer: item.a[isAr ? "ar" : "en"] }))));

  return (
    <main className="min-h-screen overflow-hidden bg-bg-light">
      {faqJsonLd.mainEntity.length > 0 ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      ) : null}
      <section className="relative bg-primary text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(7,17,31,0.16),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-center lg:text-start"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur">
                <HelpCircle className="h-4 w-4 text-white" />
                {isAr ? "مركز المساعدة" : "Help Center"}
              </div>

              <h1 className="text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
                {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-white/75 sm:text-base lg:mx-0">
                {isAr
                  ? "إجابات واضحة وسريعة حول منصة محامون البحرين، الخدمات القانونية، طريقة الحجز، انضمام مقدمي الخدمة، والدفع."
                  : "Clear answers about Lawyers.bh, legal services, bookings, provider onboarding, and payments."}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link
                  href="/book-appointment"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-primary shadow-lg shadow-black/10 transition hover:bg-bg-light"
                >
                  {isAr ? "احجز استشارة" : "Book a Consultation"}
                  <ArrowRight
                    className={`h-4 w-4 transition ${
                      isAr
                        ? "rotate-180 group-hover:-translate-x-1"
                        : "group-hover:translate-x-1"
                    }`}
                  />
                </Link>

                <Link
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                >
                  {isAr ? "تواصل معنا" : "Contact Us"}
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-[2.2rem] bg-white/12 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white/55">
                      {isAr ? "ملخص المساعدة" : "Support Summary"}
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      {isAr ? "كل ما تحتاجه في مكان واحد" : "Everything in one place"}
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
                    <Scale className="h-6 w-6" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-black text-white">
                      {faqItems.length}
                    </p>
                    <p className="mt-1 text-xs font-bold text-white/70">
                      {isAr ? "تصنيفات" : "Categories"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-black text-white">
                      {totalQuestions}
                    </p>
                    <p className="mt-1 text-xs font-bold text-white/70">
                      {isAr ? "إجابات" : "Answers"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-black text-white">24/7</p>
                    <p className="mt-1 text-xs font-bold text-white/70">
                      {isAr ? "مساعدة" : "Help"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-bg-dark/45 p-4">
                  <p className="text-sm font-extrabold leading-7 text-white/85">
                    {isAr
                      ? "استخدم البحث أو اختر التصنيف للوصول بسرعة للإجابة المناسبة."
                      : "Use search or choose a category to quickly find the right answer."}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-12 max-w-7xl px-6 pb-16 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="relative z-10 mb-8 rounded-[2rem] border border-gray-100 bg-white p-4 shadow-[0_18px_50px_rgba(7,17,31,0.08)]"
        >
          <div className="relative">
            <Search className="absolute top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted/60 ltr:left-5 rtl:right-5" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isAr ? "ابحث عن سؤال أو خدمة..." : "Search for a question or service..."}
              className="h-14 w-full rounded-[1.35rem] border border-gray-200 bg-bg-light px-5 text-sm font-bold text-text-primary outline-none transition placeholder:text-text-muted/60 focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,0,0,0.04)] ltr:pl-14 rtl:pr-14"
            />
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-4 shadow-[0_14px_36px_rgba(7,17,31,0.06)]">
              <div className="mb-4 px-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  {isAr ? "التصنيفات" : "Categories"}
                </p>
                <h2 className="mt-1 text-xl font-black text-text-primary">
                  {isAr ? "اختر الموضوع" : "Choose a topic"}
                </h2>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-start transition ${
                    activeCategory === "all"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-bg-light text-text-primary hover:bg-bg-light/80"
                  }`}
                >
                  <span className="text-sm font-black">
                    {isAr ? "كل الأسئلة" : "All Questions"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-black ${
                      activeCategory === "all"
                        ? "bg-white/15 text-white"
                        : "bg-white text-text-muted"
                    }`}
                  >
                    {totalQuestions}
                  </span>
                </button>

                {faqItems.map((group) => {
                  const Icon = iconComponents[group.iconKey];
                  const isActive = activeCategory === group.key;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setActiveCategory(group.key)}
                      className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start transition ${
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-bg-light text-text-primary hover:bg-bg-light/80"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                          isActive
                            ? "bg-white/15 text-white"
                            : "bg-white text-bg-dark group-hover:text-primary"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">
                          {group.category[isAr ? "ar" : "en"]}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-xs font-bold ${
                            isActive ? "text-white/65" : "text-text-muted"
                          }`}
                        >
                          {group.description[isAr ? "ar" : "en"]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                  {isAr ? "النتائج" : "Results"}
                </p>
                <h2 className="mt-1 text-2xl font-black text-text-primary">
                  {isAr
                    ? `${visibleQuestionsCount} سؤال متاح`
                    : `${visibleQuestionsCount} questions found`}
                </h2>
              </div>

              {(query || activeCategory !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                    setOpenKey("general-0");
                  }}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-text-muted transition hover:border-primary hover:text-text-primary"
                >
                  {isAr ? "إعادة تعيين" : "Reset"}
                </button>
              )}
            </div>

            {filteredFaq.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-[0_14px_36px_rgba(7,17,31,0.06)]"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-light text-text-muted/60">
                  <HelpCircle className="h-7 w-7" />
                </div>

                <h2 className="text-xl font-black text-text-primary">
                  {isAr ? "لا توجد نتائج" : "No results found"}
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-7 text-text-muted">
                  {isAr
                    ? "جرّب كلمة مختلفة أو اختر كل الأسئلة لعرض جميع الإجابات."
                    : "Try another keyword or choose all questions to view every answer."}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-5">
                {filteredFaq.map((group) => {
                  const Icon = iconComponents[group.iconKey];

                  return (
                    <motion.div
                      key={group.key}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_14px_36px_rgba(7,17,31,0.06)]"
                    >
                      <div className="border-b border-gray-100 bg-gradient-to-l from-bg-light to-white p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                            <Icon className="h-6 w-6" />
                          </span>

                          <div>
                            <h3 className="text-lg font-black text-text-primary">
                              {group.category[isAr ? "ar" : "en"]}
                            </h3>
                            <p className="mt-1 text-xs font-bold text-text-muted">
                              {group.description[isAr ? "ar" : "en"]}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {group.questions.map((item, questionIndex) => {
                          const key = item.id;
                          const isOpen = openKey === key;

                          return (
                            <div key={key} className="bg-white">
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpenKey(isOpen ? null : key)}
                                className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-start transition hover:bg-bg-light"
                              >
                                <span className="flex min-w-0 items-start gap-3">
                                  <span
                                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                                      isOpen
                                        ? "bg-primary text-white"
                                        : "bg-bg-light text-text-muted group-hover:bg-primary/20 group-hover:text-text-primary"
                                    }`}
                                  >
                                    {questionIndex + 1}
                                  </span>

                                  <span
                                    className={`text-sm font-black leading-7 transition sm:text-base ${
                                      isOpen ? "text-bg-dark" : "text-text-primary"
                                    }`}
                                  >
                                    {item.q[isAr ? "ar" : "en"]}
                                  </span>
                                </span>

                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                                    isOpen
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-gray-200 text-text-muted group-hover:border-primary/60"
                                  }`}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform duration-200 ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </span>
                              </button>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    key="answer"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-5 pb-5">
                                      <div className="rounded-2xl border border-gray-100 bg-bg-light p-4">
                                        <p className="text-sm font-bold leading-8 text-text-muted">
                                          {item.a[isAr ? "ar" : "en"]}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-bg-dark p-6 text-white shadow-[0_18px_45px_rgba(7,17,31,0.14)]">
                <div className="absolute -bottom-10 -end-10 h-32 w-32 rounded-full bg-primary/25 blur-2xl" />

                <MessageCircle className="mb-4 h-9 w-9 text-primary" />

                <h2 className="text-xl font-black">
                  {isAr ? "لم تجد إجابتك؟" : "Didn’t find your answer?"}
                </h2>

                <p className="mt-2 text-sm font-bold leading-7 text-white/70">
                  {isAr
                    ? "تواصل معنا وسنساعدك في اختيار الخدمة المناسبة أو الإجابة على استفسارك."
                    : "Contact us and we will help you choose the right service or answer your question."}
                </p>

                <Link
                  href="#contact"
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-bg-dark transition hover:bg-bg-light"
                >
                  {isAr ? "تواصل معنا" : "Contact Us"}
                </Link>
              </div>

              <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_14px_36px_rgba(7,17,31,0.06)]">
                <Scale className="mb-4 h-9 w-9 text-primary" />

                <h2 className="text-xl font-black text-text-primary">
                  {isAr ? "تحتاج خدمة قانونية؟" : "Need legal support?"}
                </h2>

                <p className="mt-2 text-sm font-bold leading-7 text-text-muted">
                  {isAr
                    ? "ابدأ بطلب استشارة أو اختر مقدم الخدمة المناسب من المنصة."
                    : "Start by booking a consultation or choosing the right provider from the platform."}
                </p>

                <Link
                  href="/book-appointment"
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary-dark"
                >
                  {isAr ? "احجز الآن" : "Book Now"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
