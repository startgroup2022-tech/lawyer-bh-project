"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Calendar,
  CalendarClock,
  Percent,
  FileText,
  FileSignature,
} from "lucide-react";
import { useLocale } from "next-intl";
import CourtFeesCalc from "@/components/legalTools/CourtFeesCalc";
import DeadlineCalc from "@/components/legalTools/DeadlineCalc";
import DurationCalc from "@/components/legalTools/DurationCalc";
import InterestCalc from "@/components/legalTools/InterestCalc";
import FormsBrowser from "@/components/legalTools/FormsBrowser";
import AgreementBuilder from "@/components/legalTools/AgreementBuilder";
import { scrollToLegalTool } from "@/components/legalTools/scrollToLegalTool";

type TabKey =
  | "agreement"
  | "court-fees"
  | "deadline"
  | "duration"
  | "interest"
  | "forms";

const TABS: {
  key: TabKey;
  icon: typeof Scale;
  label: { en: string; ar: string };
  desc: { en: string; ar: string };
}[] = [
  {
    key: "deadline",
    icon: CalendarClock,
    label: {
      en: "Legal Deadline Calculator",
      ar: "احتساب المواعيد القانونية",
    },
    desc: {
      en: "A specialized tool for calculating legal deadlines and periods accurately, such as appeal, objection, and submission deadlines, to help ensure filings are made within the required legal period.",
      ar: "أداة متخصصة لحساب المواعيد والمدد القانونية بدقة، مثل مواعيد تقديم الاستئناف أو الطعن أو المذكرات، للتأكد من تقديمها ضمن المدة النظامية وتجنب سقوط الحق نتيجة فوات الموعد.",
    },
  },
  {
    key: "court-fees",
    icon: Scale,
    label: {
      en: "Court Fees",
      ar: "رسوم المحكمة",
    },
    desc: {
      en: "Estimate expected court fees based on the type of case or the value of the financial claim before filing.",
      ar: "حاسبة تتيح تقدير الرسوم القضائية المستحقة عند رفع الدعوى، وفقاً لنوع الدعوى أو قيمة المطالبة المالية، بما يساعد على معرفة التكاليف المتوقعة مسبقاً.",
    },
  },
  {
    key: "agreement",
    icon: FileSignature,
    label: {
      en: "Unified Fee Agreement",
      ar: "اتفاقية الأتعاب الموحدة",
    },
    desc: {
      en: "Prepare and document the unified legal fee agreement that regulates the contractual and financial relationship between the lawyer and the client.",
      ar: "قسم مخصص لإعداد وتوثيق العقد الموحد لأتعاب المحاماة، الذي ينظم العلاقة بين المحامي والموكل من الناحيتين التعاقدية والمالية، مع تحديد قيمة الأتعاب وآلية سدادها بوضوح.",
    },
  },
  {
    key: "forms",
    icon: FileText,
    label: {
      en: "Ministry of Justice Forms",
      ar: "نماذج وزارة العدل",
    },
    desc: {
      en: "A digital library of official forms approved by the Ministry of Justice, making them easier to access, complete, and submit.",
      ar: "مكتبة رقمية تضم النماذج والاستمارات الرسمية المعتمدة من وزارة العدل، بما يسهّل على المستخدم الوصول إليها وتعبئتها وتقديمها دون عناء البحث.",
    },
  },
  {
    key: "interest",
    icon: Percent,
    label: {
      en: "Legal Interest",
      ar: "الفائدة القانونية",
    },
    desc: {
      en: "Calculate the legal interest due for delayed payment of a financial amount based on the applicable rate and relevant period.",
      ar: "حاسبة مخصصة لتحديد قيمة الفائدة القانونية المستحقة عن تأخر سداد مبلغ مالي محكوم به أو متنازع عليه، استناداً إلى النسبة القانونية المحددة والفترة الزمنية المعتبرة.",
    },
  },
  {
    key: "duration",
    icon: Calendar,
    label: {
      en: "Date Duration Calculator",
      ar: "حساب الفترة بين تاريخين",
    },
    desc: {
      en: "Calculate the period between two selected dates in days, weeks, or months, useful for limitation periods, lease terms, and contractual delays.",
      ar: "أداة دقيقة لحساب المدة الزمنية الواقعة بين تاريخين محددين، بالأيام أو الأسابيع أو الأشهر، وتُستخدم في إثبات مدد التقادم أو حساب مدة عقود الإيجار أو فترات التأخير في تنفيذ الالتزامات.",
    },
  },
];

export default function LegalToolsTabs() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [tab, setTab] = useState<TabKey | null>(null);
  const toolPanelRef = useRef<HTMLDivElement>(null);

  const selectedTab = TABS.find((item) => item.key === tab);

  useEffect(() => {
    if (!tab || !toolPanelRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    scrollToLegalTool(toolPanelRef.current, prefersReducedMotion);
  }, [tab]);

  return (
   <section
  id="legal-tools"
  onClick={() => setTab(null)}
  className="relative overflow-hidden bg-bg-light py-16 lg:py-24"
>
{/* Background logo like Services */}
<div
  aria-hidden
  className={`pointer-events-none absolute top-[350px] z-0 h-[820px] w-[820px] -translate-y-1/2 bg-[#2c3e5a]/3 sm:h-[860px] sm:w-[860px] lg:h-[920px] lg:w-[1120px] ${
    isAr ?   "-left-20" : "-right-12"
  }`}
  style={{
    WebkitMaskImage: "url('/images/logo-full7.svg')",
    maskImage: "url('/images/logo-full7.svg')",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  }}
/>

  {/* Soft overlay */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 z-0"
    style={{
      background:
        "radial-gradient(circle at 18% 15%, rgba(122,22,22,0.05), transparent 34%), radial-gradient(circle at 85% 70%, rgba(44,62,90,0.06), transparent 38%)",
    }}
  />

  <div
    onClick={(e) => e.stopPropagation()}
    className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6"
  >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-4 py-2">
            <span
              className={`text-xs font-extrabold text-primary ${
                isAr ? "tracking-normal" : "uppercase tracking-[0.22em]"
              }`}
            >
              {isAr ? "أدوات مساعدة" : "Helpful Tools"}
            </span>
          </div>

          <h2 className="text-3xl font-black leading-tight tracking-[-0.03em] text-[#07111F] sm:text-4xl lg:text-5xl">
            {isAr ? "الأدوات القانونية" : "Legal Tools"}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
            {isAr
              ? "حاسبات وأدوات سريعة تساعدك في الرسوم والمواعيد والفوائد والنماذج القانونية."
              : "Quick tools for court fees, legal deadlines, interest, forms, and legal agreements."}
          </p>
        </motion.div>

        {/* Tool cards */}
        <div role="tablist" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TABS.map((t, index) => {
            const active = tab === t.key;
            const Icon = t.icon;

            return (
              <motion.button
                key={t.key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTab(t.key);
                }}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.28,
                  delay: index * 0.04,
                  ease: "easeOut",
                }}
                whileHover={{ y: -4 }}
                className={`group relative flex min-h-[210px] flex-col items-center justify-center overflow-hidden rounded-3xl border p-4 text-center transition-all duration-300 ${
                  active
                    ? "border-[#2c3e5a]/30 bg-[#2c3e5a]/75 text-white shadow-[0_20px_55px_rgba(7,17,31,0.16)]"
                    : "border-gray-200 bg-white text-[#07111F] shadow-sm hover:border-primary/30 hover:shadow-[0_16px_45px_rgba(7,17,31,0.08)]"
                }`}
              >
                {/* Big background icon */}
                <Icon
                  size={132}
                  className={`pointer-events-none absolute -bottom-11 -end-10 stroke-[1.05] transition-all duration-500 group-hover:scale-110 ${
                    active
                      ? "text-white/10"
                      : "text-[#07111F]/[0.04] group-hover:text-primary/[0.08]"
                  }`}
                />

                {/* Icon box */}
                <span
                  className={`relative z-10 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                    active
                      ? "bg-primary/95 text-white shadow-lg shadow-primary/25"
                      : "bg-[#2c3e5a]/75 text-white group-hover:bg-[#2c3e5a]"
                  }`}
                >
                  <Icon size={22} />
                </span>

                {/* Label */}
                <span
                  className={`relative z-10 line-clamp-3 text-sm font-extrabold leading-6 ${
                    active ? "text-white" : "text-[#07111F]"
                  }`}
                >
                  {isAr ? t.label.ar : t.label.en}
                </span>

                {/* Description */}
                <p
                  className={`relative z-10 mt-2 line-clamp-2 max-w-[92%] text-xs font-medium leading-5 ${
                    active ? "text-white/75" : "text-text-muted"
                  }`}
                >
                  {isAr ? t.desc.ar : t.desc.en}
                </p>

                {/* Active indicator */}
                {active && (
                  <motion.span
                    layoutId="legalToolActive"
                    className="absolute bottom-3 h-1.5 w-9 rounded-full bg-white/80"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Content appears only after selecting a tool */}
        <AnimatePresence mode="wait">
          {tab && (
            <motion.div
              ref={toolPanelRef}
              key={tab}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-8 scroll-mt-24 overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_18px_55px_rgba(7,17,31,0.08)] lg:scroll-mt-28"
            >
              {/* Selected tool header */}
              <div className="flex items-center gap-3 border-b border-gray-100 bg-[#2c3e5a]/75 px-5 py-4 text-white sm:px-8">
                {selectedTab && (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/95">
                      <selectedTab.icon size={20} />
                    </span>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                        {isAr ? "الأداة المختارة" : "Selected Tool"}
                      </p>

                      <h3 className="text-base font-black">
                        {isAr ? selectedTab.label.ar : selectedTab.label.en}
                      </h3>

                      <p className="mt-1 text-xs font-medium leading-5 text-white/65">
                        {isAr ? selectedTab.desc.ar : selectedTab.desc.en}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-5 sm:p-8">
                {tab === "agreement" && <AgreementBuilder />}
                {tab === "court-fees" && <CourtFeesCalc />}
                {tab === "deadline" && <DeadlineCalc />}
                {tab === "duration" && <DurationCalc />}
                {tab === "interest" && <InterestCalc />}
                {tab === "forms" && <FormsBrowser />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
