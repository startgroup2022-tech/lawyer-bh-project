"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────
// Bilingual dictionary. Ported from Claude Design (legalsos bundle).
// Some values intentionally contain inline <em> tags — those are
// rendered via dangerouslySetInnerHTML through the h(key) helper.
// ─────────────────────────────────────────────────────────────────────

type Lang = "en" | "ar";

const I18N: Record<Lang, Record<string, string>> = {
  en: {
    brand: "Legal SOS",
    "nav.cases": "Case types",
    "nav.how": "How it works",
    "nav.coverage": "Coverage",
    "nav.faq": "FAQ",
    "nav.cta": "Get the app",
    "hero.eyebrow": "24/7 dispatch live in Bahrain",
    "hero.h1": "Because the first hour <em>defines</em> your future.",
    "hero.sub":
      "A licensed advocate on the line — or at your side — within minutes. Built for the moments that matter most: arrest, search, travel ban, urgent evidence, criminal report. From BHD 25.",
    "hero.cta1": "Download the app",
    "hero.cta2": "Hotline: +973 3231 7070",
    "p1.header": "EMERGENCY DISPATCH",
    "p1.greet": "Hold steady. <em>Help</em> is one tap away.",
    "p1.sublabel": "Press & hold to dispatch a lawyer",
    "p1.q1": "Consultation",
    "p1.q2": "Browse cases",
    "p2.h": "CASE TYPES",
    "p2.t": "What's happening?",
    "p2.search": "Search arrest, search, ban…",
    "p2.c1.t": "Emergency Consultation",
    "p2.c1.s": "15 min · Remote",
    "p2.c2.t": "Arrest & Investigation",
    "p2.c2.s": "In-person dispatch",
    "p2.c3.t": "Search & Seizure",
    "p2.c3.s": "In-person dispatch",
    "p2.c4.t": "Travel Ban",
    "p2.c4.s": "In-person dispatch",
    "p3.status": "DISPATCHING",
    "p3.title": "Finding the <em>nearest</em> licensed advocate",
    "p3.eta": "Estimated connect",
    "trust.1": "24/7 in Bahrain",
    "trust.2": "Licensed advocates only",
    "trust.3": "Bilingual EN / AR",
    "trust.4": "From BHD 25",
    "cases.eyebrow": "Case catalog",
    "cases.h": "Six situations. <em>One</em> tap each.",
    "cases.sub":
      "Every case is fixed-price, lawyer-vetted, and dispatch-ready. Open a remote consultation in seconds, or send a licensed advocate to your location.",
    "cases.tag.remote": "Remote · 15 min",
    "cases.tag.field": "In-person dispatch",
    "cases.1.t": "Emergency Consultation",
    "cases.1.d":
      "A 15-minute video call with a licensed advocate. Triage your situation, understand your rights, and decide the next step — before the next hour decides for you.",
    "cases.1.cta": "Start consultation",
    "cases.2.t": "Arrest, Detention & Investigations",
    "cases.2.d":
      "A lawyer at the police station or interrogation, asserting your rights at the first minute they exist.",
    "cases.2.m": "~ 3 min ETA",
    "cases.3.t": "Search & Seizure",
    "cases.3.d":
      "Counsel on-site when authorities arrive — review of warrants, scope, and what's lawfully taken.",
    "cases.3.m": "~ 3 min ETA",
    "cases.4.t": "Travel Ban / Precautionary Attachment",
    "cases.4.d":
      "Same-day legal response when a ban or attachment surfaces — at the airport, the bank, or the border.",
    "cases.4.m": "Priority dispatch",
    "cases.5.t": "Urgent Evidence Preservation",
    "cases.5.d":
      "A lawyer on-site to record, witness and lawfully secure evidence before it disappears.",
    "cases.5.m": "Time-critical",
    "cases.6.t": "Urgent Criminal Report",
    "cases.6.d":
      "A licensed advocate files alongside you at the police station — drafted, witnessed, on the record.",
    "cases.6.m": "~ 3 min ETA",
    "how.eyebrow": "How it works",
    "how.h": "Three taps. <em>One</em> lawyer. Minutes — not hours.",
    "how.sub":
      "No forms. No waiting rooms. The flow is built for a person whose hands are shaking.",
    "how.1.t": "Pick a case type",
    "how.1.p":
      "Tap SOS for in-person dispatch, or open a 15-minute remote consultation. Fixed prices in BHD — no surprise fees.",
    "how.1.s1": "Emergency Consultation",
    "how.1.s2": "Arrest & Investigation",
    "how.1.s3": "Search & Seizure",
    "how.1.s4": "Travel Ban",
    "how.2.t": "Match in < 3 min",
    "how.2.p":
      "Our dispatch routes your case to the nearest licensed advocate. If no one connects within 5 minutes, you're auto-refunded.",
    "how.2.eta": "Avg. connect",
    "how.3.t": "Lawyer at your side",
    "how.3.p":
      "Talk on the call, or watch the ETA as your advocate arrives. Every conversation is privileged and end-to-end encrypted.",
    "how.3.lawyer": "Sara Al-Hashimi, Adv.",
    "how.3.bar": "Bar No. 4318 · 11 yrs",
    "how.3.b1": "Connected · privileged",
    "how.3.b2": "Encrypted EN / AR call",
    "how.3.cta": "Join secure call",
    "how.3.time": "14:38 remaining",
    "cov.eyebrow": "Coverage",
    "cov.h": "Live in Bahrain. <em>Rolling</em> across the GCC.",
    "cov.sub":
      'Each country onboards with locally-licensed advocates and dispatch agreements. Tap "Notify me" inside the app to be first when your country goes live.',
    "cov.bh": "Bahrain",
    "cov.ae": "United Arab Emirates",
    "cov.sa": "Saudi Arabia",
    "cov.kw": "Kuwait",
    "cov.qa": "Qatar",
    "cov.om": "Oman",
    "dl.eyebrow": "Download",
    "dl.h": "Install it before <em>you need it.</em>",
    "dl.sub":
      "Legal SOS is free to install. You only pay when you dispatch a case — and never if dispatch fails inside 5 minutes.",
    "dl.apple.t": "Download on the",
    "dl.google.t": "GET IT ON",
    "dl.beta":
      "Beta access for invited Bahrain residents · Public release Q3 2026",
    "faq.eyebrow": "FAQ",
    "faq.h": "Questions, <em>answered</em>.",
    "faq.1.q": "What if the lawyer doesn't connect in time?",
    "faq.1.a":
      "Our SLA targets a 3-minute connect. If no licensed advocate accepts your case within 5 minutes, the charge is reversed automatically — no support ticket needed.",
    "faq.2.q": "What happens after the 15-minute consultation?",
    "faq.2.a":
      "If the situation needs in-person dispatch or follow-up, your advocate can quote the next step directly inside the app. The BHD 25 you paid is credited toward an in-person case if you escalate within 24 hours.",
    "faq.3.q": "How are the lawyers qualified?",
    "faq.3.a":
      "Every advocate on the network is licensed by the Bahrain Ministry of Justice (Lawyers Affairs Department), identity-verified, and reviewed for active standing each quarter. Their MoJ license number is visible inside the app before the call begins.",
    "faq.4.q": "Are calls private and confidential?",
    "faq.4.a":
      "All conversations are end-to-end encrypted and protected by attorney–client privilege under Bahraini law. We don't record audio. Case metadata is retained only to support billing and refunds.",
    "faq.5.q": "Which languages are supported?",
    "faq.5.a":
      "The app, dispatch and consultations are fully bilingual — Arabic and English. You select your preferred language at sign-up and the network matches you to an advocate fluent in it.",
    "faq.6.q": "How is pricing structured?",
    "faq.6.a":
      "Every case type is fixed-price in BHD, displayed before you confirm. There are no hourly fees, callout fees, or hidden charges. In-person dispatch covers up to a four-hour engagement.",
    "faq.7.q": "What does Legal SOS not cover?",
    "faq.7.a":
      "Legal SOS is built for time-critical events. Long-form litigation, contract drafting, and corporate retainers are handled by our sister network at lawyers.bh — your case can be referred there in-app after the first response.",
    "faq.8.q": "When will Legal SOS launch outside Bahrain?",
    "faq.8.a":
      "UAE and Saudi Arabia are next, with dispatch partnerships already in advanced talks. You can request early access for KW / QA / OM from inside the app and we'll notify you the day it goes live.",
    "foot.tagline":
     "Bahrain's 24/7 legal emergency dispatch. Because the first hour defines your position.",
    "foot.product": "Product",
    "foot.p1": "Case catalog",
    "foot.p2": "How it works",
    "foot.p3": "Coverage",
    "foot.p4": "Download",
    "foot.contact": "Contact",
    "foot.c1": "Press & partnerships",
    "foot.legal": "Legal",
    "foot.l1": "Terms of service",
    "foot.l2": "Privacy & data",
    "foot.l3": "Refund policy",
    "foot.l4": "Lawyer code of conduct",
    "foot.copy": "© 2026 Legal SOS · A GICC initiative",
    "sticky.s": "BHD 25",
    "sticky.l": "first hour matters",
    "sticky.cta": "Get the app",
  },
  ar: {
    brand: "ليجال إس‌أو‌إس",
    "nav.cases": "أنواع القضايا",
    "nav.how": "كيف يعمل",
    "nav.coverage": "التغطية",
    "nav.faq": "الأسئلة",
    "nav.cta": "حمّل التطبيق",
    "hero.eyebrow": "خدمة إرسال على مدار الساعة في البحرين",
    "hero.h1": "لأن الساعة الأولى <em>تحدد</em> موقفك.",
    "hero.sub":
      "محامي مرخّص على الخط — أو إلى جانبك — خلال دقائق. مصمَّم للحظات الأكثر أهمية: الاعتقال، التفتيش، حظر السفر، حفظ الأدلة، البلاغات العاجلة. من 25 د.ب.",
    "hero.cta1": "حمّل التطبيق",
    "hero.cta2": "الخط الساخن: 70 70 3231 973+",
    "p1.header": "إرسال الطوارئ",
    "p1.greet": "ابقَ هادئاً. <em>المساعدة</em> على بُعد لمسة.",
    "p1.sublabel": "اضغط مطوّلاً لإرسال محامي",
    "p1.q1": "استشارة",
    "p1.q2": "تصفّح القضايا",
    "p2.h": "أنواع القضايا",
    "p2.t": "ما الذي يحدث؟",
    "p2.search": "ابحث: اعتقال، تفتيش، حظر…",
    "p2.c1.t": "استشارة طارئة",
    "p2.c1.s": "15 دقيقة · عن بُعد",
    "p2.c2.t": "اعتقال وتحقيق",
    "p2.c2.s": "حضور المحامي",
    "p2.c3.t": "تفتيش ومصادرة",
    "p2.c3.s": "حضور المحامي",
    "p2.c4.t": "حظر سفر",
    "p2.c4.s": "حضور المحامي",
    "p3.status": "جارٍ الإرسال",
    "p3.title": "نبحث عن <em>أقرب</em> محامي مرخّص",
    "p3.eta": "الاتصال المتوقع",
    "trust.1": "24/7 في البحرين",
    "trust.2": "محامون مرخّصون فقط",
    "trust.3": "ثنائي اللغة EN / AR",
    "trust.4": "من 25 د.ب",
    "cases.eyebrow": "كتالوج القضايا",
    "cases.h": "ستّ حالات. <em>لمسةٌ</em> واحدة لكلٍّ منها.",
    "cases.sub":
      "كلّ قضية بسعرٍ ثابت، يتولّاها محامي مُعتمد وجاهز للإرسال الفوري. ابدأ استشارة عن بُعد، أو أرسل محامياً مرخّصاً إلى موقعك.",
    "cases.tag.remote": "عن بُعد · 15 دقيقة",
    "cases.tag.field": "حضور المحامي",
    "cases.1.t": "استشارة طارئة",
    "cases.1.d":
      "مكالمة فيديو 15 دقيقة مع محامي مرخّص. قيّم وضعك، افهم حقوقك، وقرّر الخطوة التالية — قبل أن تقرّرها الساعة التالية عنك.",
    "cases.1.cta": "ابدأ الاستشارة",
    "cases.2.t": "اعتقال واحتجاز وتحقيق",
    "cases.2.d": "محامي في المخفر أو أثناء التحقيق، يضمن حقوقك منذ الدقيقة الأولى.",
    "cases.2.m": "~ 3 دقائق",
    "cases.3.t": "تفتيش ومصادرة",
    "cases.3.d":
      "مستشار حاضر عند وصول السلطات — مراجعة الأذونات والنطاق وما يُؤخذ قانونياً.",
    "cases.3.m": "~ 3 دقائق",
    "cases.4.t": "حظر سفر / حجز تحفظي",
    "cases.4.d":
      "استجابة قانونية في اليوم نفسه — في المطار، البنك، أو الحدود.",
    "cases.4.m": "إرسال ذو أولوية",
    "cases.5.t": "حفظ الأدلة العاجل",
    "cases.5.d": "محامي في الموقع لتوثيق الأدلة وتأمينها قانونياً قبل ضياعها.",
    "cases.5.m": "حسّاس زمنياً",
    "cases.6.t": "بلاغ جنائي عاجل",
    "cases.6.d":
      "محامي مرخّص يتقدّم معك بالبلاغ في المخفر — مُحرَّر، مُشهَد، موثَّق.",
    "cases.6.m": "~ 3 دقائق",
    "how.eyebrow": "كيف يعمل",
    "how.h": "ثلاث لمسات. <em>محامي</em> واحد. دقائق — لا ساعات.",
    "how.sub": "لا نماذج. لا غرف انتظار. التدفّق مصمَّم لإنسانٍ ترتعش يداه.",
    "how.1.t": "اختر نوع القضية",
    "how.1.p":
      "اضغط SOS لإرسال محامي، أو افتح استشارة 15 دقيقة عن بُعد. أسعار ثابتة بالدينار — بلا مفاجآت.",
    "how.1.s1": "استشارة طارئة",
    "how.1.s2": "اعتقال وتحقيق",
    "how.1.s3": "تفتيش ومصادرة",
    "how.1.s4": "حظر سفر",
    "how.2.t": "تطابق < 3 دقائق",
    "how.2.p":
      "يوجّه نظامنا قضيتك لأقرب محامي مرخّص. إن لم يتّصل أحد خلال 5 دقائق، يُعاد المبلغ تلقائياً.",
    "how.2.eta": "متوسط الاتصال",
    "how.3.t": "محامي إلى جانبك",
    "how.3.p":
      "تحدّث على المكالمة، أو راقب وصول محاميك. كلّ محادثة محمية بسرّية المهنة ومشفّرة طرفاً لطرف.",
    "how.3.lawyer": "سارة الهاشمي، محامية",
    "how.3.bar": "رقم النقابة 4318 · 11 سنة",
    "how.3.b1": "متّصل · محمي",
    "how.3.b2": "مكالمة مشفّرة EN / AR",
    "how.3.cta": "انضم للمكالمة الآمنة",
    "how.3.time": "14:38 متبقّية",
    "cov.eyebrow": "التغطية",
    "cov.h": "متاحون في البحرين. <em>قادمون</em> إلى الخليج.",
    "cov.sub":
      "تنطلق كلّ دولة بمحامين مرخّصين محلياً واتفاقيات إرسال. سجّل اهتمامك داخل التطبيق لتكون من الأوائل.",
    "cov.bh": "البحرين",
    "cov.ae": "الإمارات العربية المتحدة",
    "cov.sa": "المملكة العربية السعودية",
    "cov.kw": "الكويت",
    "cov.qa": "قطر",
    "cov.om": "عُمان",
    "dl.eyebrow": "التحميل",
    "dl.h": "حمّله <em>قبل أن تحتاجه.</em>",
    "dl.sub":
      "تحميل التطبيق مجاني. لا تدفع إلا عند طلب محامي — ولا شيء إذا لم يتمّ الإرسال خلال 5 دقائق.",
    "dl.apple.t": "حمّله من",
    "dl.google.t": "احصل عليه من",
    "dl.beta":
      "الوصول التجريبي لمقيمي البحرين المدعوّين · الإصدار العام في الربع الثالث 2026",
    "faq.eyebrow": "الأسئلة الشائعة",
    "faq.h": "أسئلة، <em>وأجوبتها</em>.",
    "faq.1.q": "ماذا لو لم يتّصل المحامي في الوقت المحدد؟",
    "faq.1.a":
      "هدفنا اتصال خلال 3 دقائق. إن لم يقبل أي محامي قضيتك خلال 5 دقائق، يُعاد المبلغ تلقائياً — دون الحاجة لتذكرة دعم.",
    "faq.2.q": "ماذا يحدث بعد استشارة الـ 15 دقيقة؟",
    "faq.2.a":
      "إذا تطلّب الموقف حضوراً ميدانياً أو متابعة، يمكن لمحاميك تقديم عرض الخطوة التالية داخل التطبيق. ويُحتسب مبلغ الـ 25 د.ب الذي دفعته كرصيد لقضية ميدانية إذا تمّت الترقية خلال 24 ساعة.",
    "faq.3.q": "كيف تُعتمد أهلية المحامين؟",
    "faq.3.a":
      "كلّ محامي في الشبكة مرخّص من نقابة المحامين البحرينية، يتم التحقق من هويته ومراجعة وضعه فصلياً. ويظهر رقم نقابته داخل التطبيق قبل بدء المكالمة.",
    "faq.4.q": "هل المكالمات خاصة وسرية؟",
    "faq.4.a":
      "كلّ المحادثات مشفّرة طرفاً لطرف ومحميّة بسرّية المهنة بموجب القانون البحريني. لا نسجّل الصوت. ولا تُحفظ بيانات القضية إلا لأغراض الفوترة والاسترداد.",
    "faq.5.q": "ما اللغات المدعومة؟",
    "faq.5.a":
      "التطبيق والإرسال والاستشارات بالكامل ثنائي اللغة — العربية والإنجليزية. تختار لغتك المفضّلة عند التسجيل وتربطك الشبكة بمحامي يتقنها.",
    "faq.6.q": "كيف يُحتسب السعر؟",
    "faq.6.a":
      "كلّ نوع قضية بسعرٍ ثابت بالدينار، يُعرض قبل تأكيدك. لا رسوم ساعية، لا رسوم استدعاء، لا رسوم خفية. الإرسال الميداني يغطي حتى أربع ساعات.",
    "faq.7.q": "ما الذي لا يغطّيه Legal SOS؟",
    "faq.7.a":
      "Legal SOS مصمَّم للأحداث الحسّاسة زمنياً. التقاضي طويل الأمد، صياغة العقود، والاتفاقيات السنوية تتم عبر شبكتنا الشقيقة lawyers.bh — ويمكن إحالة قضيتك إليها داخل التطبيق بعد الاستجابة الأولى.",
    "faq.8.q": "متى ينطلق Legal SOS خارج البحرين؟",
    "faq.8.a":
      "الإمارات والسعودية في الطريق، مع شراكات إرسال في مراحل متقدّمة. يمكنك طلب الوصول المبكر للكويت / قطر / عُمان من داخل التطبيق وسنخبرك يوم الإطلاق.",
    "foot.tagline":
      "خدمة الإرسال القانوني الطارئ 24/7 في البحرين. لأن الساعة الأولى تحدد موقفك.",
    "foot.product": "المنتج",
    "foot.p1": "كتالوج القضايا",
    "foot.p2": "كيف يعمل",
    "foot.p3": "التغطية",
    "foot.p4": "التحميل",
    "foot.contact": "تواصل",
    "foot.c1": "الشراكات والإعلام",
    "foot.legal": "قانوني",
    "foot.l1": "شروط الخدمة",
    "foot.l2": "الخصوصية والبيانات",
    "foot.l3": "سياسة الاسترداد",
    "foot.l4": "مدوّنة سلوك المحامي",
    "foot.copy": "© 2026 Legal SOS · مبادرة من GICC",
    "sticky.s": "25 د.ب",
    "sticky.l": "الساعة الأولى تهمّ",
    "sticky.cta": "حمّل التطبيق",
  },
};

// Small SVG icons reused across the page (chevron + phone + dl badges)
const Chevron = () => (
  <svg className="btn-icon" viewBox="0 0 16 16" fill="none">
    <path
      d="M5 3l5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg className="btn-icon" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4c0 5 4 9 9 9l1.5-2-3-1.5-1 1c-1.5-1-2.5-2-3.5-3.5l1-1L5.5 3 3 4z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Page() {
  const [lang, setLang] = useState<Lang>("en");
  const navRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  const t = (k: string) => I18N[lang][k] ?? k;
  const h = (k: string) => ({ __html: I18N[lang][k] ?? k });

  // language → html lang+dir + body font (CSS handles the font swap)
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // scroll reveal via IntersectionObserver
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  // nav scrolled + sticky CTA visibility + hero phones parallax
  useEffect(() => {
    let raf = 0;
    const phones = document.querySelectorAll<HTMLElement>(".phone-wrap");
    const onScroll = () => {
      const y = window.scrollY;
      if (navRef.current) {
        navRef.current.classList.toggle("scrolled", y > 12);
      }
      if (stickyRef.current) {
        stickyRef.current.classList.toggle(
          "show",
          y > 720 && y < document.body.scrollHeight - 1200,
        );
      }
      if (!raf) {
        raf = requestAnimationFrame(() => {
          const yy = Math.min(window.scrollY, 600);
          phones.forEach((p, i) => {
            const depth = [0.1, 0.04, 0.1][i] || 0.06;
            const baseTilt = i === 0 ? 14 : i === 2 ? -14 : 0;
            const baseY = i === 1 ? -20 : 20;
            p.style.transform = `rotateY(${baseTilt}deg) rotateX(2deg) translateY(${
              baseY + yy * depth
            }px) ${i === 1 ? "scale(1.04)" : ""}`;
          });
          raf = 0;
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* ───────── nav ───────── */}
      <nav className="nav" ref={navRef}>
        <div className="shell nav-inner">
          <a className="brand" href="#">
            <div className="brand-mark">Au</div>
            <span>{t("brand")}</span>
          </a>
          <div className="nav-links">
            <a href="#cases">{t("nav.cases")}</a>
            <a href="#how">{t("nav.how")}</a>
            <a href="#coverage">{t("nav.coverage")}</a>
            <a href="#faq">{t("nav.faq")}</a>
          </div>
          <div className="nav-right">
            <div className="lang-toggle" role="group" aria-label="Language">
              <button
                className={lang === "en" ? "on" : ""}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button
                className={lang === "ar" ? "on" : ""}
                onClick={() => setLang("ar")}
              >
                AR
              </button>
            </div>
            <a className="nav-cta" href="#download">
              {t("nav.cta")}
            </a>
          </div>
        </div>
      </nav>

      {/* ───────── hero ───────── */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <div className="shell hero-inner">
          <div className="hero-eyebrow reveal">
            <span className="dot" />
            <span>{t("hero.eyebrow")}</span>
            <span className="pill">v1.0</span>
          </div>
          <h1 className="reveal" dangerouslySetInnerHTML={h("hero.h1")} />
          <p className="hero-sub reveal">{t("hero.sub")}</p>
          <div className="hero-ctas reveal">
            <a className="btn btn-primary" href="#download">
              <span>{t("hero.cta1")}</span>
              <Chevron />
            </a>
            <a className="btn btn-secondary" href="tel:+97332317070">
              <PhoneIcon />
              <span>{t("hero.cta2")}</span>
            </a>
          </div>

          {/* ───── hero phones ───── */}
          <div className="hero-phones reveal">
            {/* phone 1: SOS home */}
            <div className="phone-wrap left">
              <div className="phone">
                <div className="phone-screen">
                  <div className="phone-status">
                    <span>9:41</span>
                    <span className="phone-status-r">
                      <span>5G</span>
                      <span className="b" />
                    </span>
                  </div>
                  <div className="p1-body">
                    <div className="p1-header">{t("p1.header")}</div>
                    <div
                      className="p1-greet"
                      dangerouslySetInnerHTML={h("p1.greet")}
                    />
                    <div className="p1-sos-wrap">
                      <div className="p1-sos-ring" />
                      <div className="p1-sos-ring" />
                      <div className="p1-sos">SOS</div>
                    </div>
                    <div className="p1-sos-label">{t("p1.sublabel")}</div>
                    <div className="p1-quick">
                      <div className="p1-quick-btn">
                        <span className="ico" />
                        <span>{t("p1.q1")}</span>
                      </div>
                      <div className="p1-quick-btn">
                        <span className="ico" />
                        <span>{t("p1.q2")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* phone 2: catalog */}
            <div className="phone-wrap center">
              <div className="phone">
                <div className="phone-screen">
                  <div className="phone-status">
                    <span>9:41</span>
                    <span className="phone-status-r">
                      <span>5G</span>
                      <span className="b" />
                    </span>
                  </div>
                  <div className="p2-body">
                    <div className="p2-h">{t("p2.h")}</div>
                    <div className="p2-t">{t("p2.t")}</div>
                    <div className="p2-search">
                      <span>{t("p2.search")}</span>
                    </div>
                    <div className="p2-list">
                      <div className="p2-case feat">
                        <div className="p2-case-l">
                          <div className="t">{t("p2.c1.t")}</div>
                          <div className="s">{t("p2.c1.s")}</div>
                        </div>
                        <div className="p2-case-r">
                          <div className="pr">BHD 25</div>
                          <div className="pop">POPULAR</div>
                        </div>
                      </div>
                      <div className="p2-case">
                        <div className="p2-case-l">
                          <div className="t">{t("p2.c2.t")}</div>
                          <div className="s">{t("p2.c2.s")}</div>
                        </div>
                        <div className="p2-case-r">
                          <div className="pr">BHD 150</div>
                        </div>
                      </div>
                      <div className="p2-case">
                        <div className="p2-case-l">
                          <div className="t">{t("p2.c3.t")}</div>
                          <div className="s">{t("p2.c3.s")}</div>
                        </div>
                        <div className="p2-case-r">
                          <div className="pr">BHD 200</div>
                        </div>
                      </div>
                      <div className="p2-case">
                        <div className="p2-case-l">
                          <div className="t">{t("p2.c4.t")}</div>
                          <div className="s">{t("p2.c4.s")}</div>
                        </div>
                        <div className="p2-case-r">
                          <div className="pr">BHD 300</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* phone 3: matching */}
            <div className="phone-wrap right">
              <div className="phone">
                <div className="phone-screen">
                  <div className="phone-status">
                    <span>9:41</span>
                    <span className="phone-status-r">
                      <span>5G</span>
                      <span className="b" />
                    </span>
                  </div>
                  <div className="p3-body">
                    <div className="p3-status">
                      <span className="d" />
                      <span>{t("p3.status")}</span>
                    </div>
                    <div
                      className="p3-title"
                      dangerouslySetInnerHTML={h("p3.title")}
                    />
                    <div className="p3-radar">
                      <div className="p3-radar-core">Au</div>
                      <div className="p3-radar-dot a" />
                      <div className="p3-radar-dot b" />
                      <div className="p3-radar-dot c" />
                    </div>
                    <div className="p3-eta">
                      <span className="lbl">{t("p3.eta")}</span>
                      <span className="val">~ 2:14</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── trust strip ───────── */}
      <section className="trust">
        <div className="shell trust-inner">
          <div className="trust-item">{t("trust.1")}</div>
          <div className="trust-item">{t("trust.2")}</div>
          <div className="trust-item">{t("trust.3")}</div>
          <div className="trust-item">{t("trust.4")}</div>
        </div>
      </section>

      {/* ───────── case catalog ───────── */}
      <section className="section" id="cases">
        <div className="shell">
          <div className="section-head reveal">
            <span className="section-eyebrow">{t("cases.eyebrow")}</span>
            <h2 dangerouslySetInnerHTML={h("cases.h")} />
            <p className="section-sub">{t("cases.sub")}</p>
          </div>

          <div className="cases-grid">
            {/* featured: Emergency Consultation */}
            <article className="case feature reveal">
              <div className="case-popular">
                <span className="star">★</span>
                <span>POPULAR</span>
              </div>
              <div className="case-content">
                <span className="case-tag remote">
                  <span className="d" />
                  <span>{t("cases.tag.remote")}</span>
                </span>
                <h3>{t("cases.1.t")}</h3>
                <p className="case-desc">{t("cases.1.d")}</p>
              </div>
              <div className="case-foot">
                <div className="case-price">
                  <span className="cur">BHD</span>25
                </div>
                <a className="case-cta" href="#download">
                  <span>{t("cases.1.cta")}</span>
                  <Chevron />
                </a>
              </div>
            </article>

            {[
              {
                id: 2,
                price: 150,
                meta: t("cases.2.m"),
              },
              {
                id: 3,
                price: 200,
                meta: t("cases.3.m"),
              },
              {
                id: 4,
                price: 300,
                meta: t("cases.4.m"),
              },
              {
                id: 5,
                price: 400,
                meta: t("cases.5.m"),
              },
              {
                id: 6,
                price: 150,
                meta: t("cases.6.m"),
              },
            ].map((c) => (
              <article className="case reveal" key={c.id}>
                <span className="case-tag field">
                  <span className="d" />
                  <span>{t("cases.tag.field")}</span>
                </span>
                <h3>{t(`cases.${c.id}.t`)}</h3>
                <p className="case-desc">{t(`cases.${c.id}.d`)}</p>
                <div className="case-foot">
                  <div className="case-price">
                    <span className="cur">BHD</span>
                    {c.price}
                  </div>
                  <span className="case-meta">{c.meta}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── how it works ───────── */}
      <section className="section" id="how">
        <div className="shell">
          <div className="section-head reveal">
            <span className="section-eyebrow">{t("how.eyebrow")}</span>
            <h2 dangerouslySetInnerHTML={h("how.h")} />
            <p className="section-sub">{t("how.sub")}</p>
          </div>

          <div className="steps">
            {/* step 1 */}
            <div className="step reveal">
              <div className="step-num">STEP 01</div>
              <h3>{t("how.1.t")}</h3>
              <p>{t("how.1.p")}</p>
              <div className="step-screen">
                <div className="step-screen-inner">
                  <div className="s1-row">
                    <span>9:41</span>
                    <span className="b" />
                  </div>
                  <div className="s1-cat">
                    <div className="s1-cat-item sel">
                      <span className="lbl">{t("how.1.s1")}</span>
                      <span className="sub">15 min · BHD 25</span>
                    </div>
                    <div className="s1-cat-item">
                      <span className="lbl">{t("how.1.s2")}</span>
                      <span className="sub">BHD 150</span>
                    </div>
                    <div className="s1-cat-item">
                      <span className="lbl">{t("how.1.s3")}</span>
                      <span className="sub">BHD 200</span>
                    </div>
                    <div className="s1-cat-item">
                      <span className="lbl">{t("how.1.s4")}</span>
                      <span className="sub">BHD 300</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* step 2 */}
            <div className="step reveal">
              <div className="step-num">STEP 02</div>
              <h3>{t("how.2.t")}</h3>
              <p>{t("how.2.p")}</p>
              <div className="step-screen">
                <div className="step-screen-inner">
                  <div className="s1-row">
                    <span>9:41</span>
                    <span className="b" />
                  </div>
                  <div className="s2-mid">
                    <div style={{ textAlign: "center" }}>
                      <div className="s2-radar">
                        <div className="s2-radar-core">Au</div>
                      </div>
                      <div className="s2-eta">
                        <span className="v">02:14</span>
                        <span className="l">{t("how.2.eta")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* step 3 */}
            <div className="step reveal">
              <div className="step-num">STEP 03</div>
              <h3>{t("how.3.t")}</h3>
              <p>{t("how.3.p")}</p>
              <div className="step-screen">
                <div className="step-screen-inner">
                  <div className="s1-row">
                    <span>9:41</span>
                    <span className="b" />
                  </div>
                  <div className="s3-card">
                    <div className="head">
                      <div className="av">SA</div>
                      <div>
                        <div className="n">{t("how.3.lawyer")}</div>
                        <div className="r">{t("how.3.bar")}</div>
                      </div>
                    </div>
                    <div className="s3-bars">
                      <div className="s3-bar">
                        <span className="ic" />
                        <span>{t("how.3.b1")}</span>
                      </div>
                      <div className="s3-bar">
                        <span className="ic" />
                        <span>{t("how.3.b2")}</span>
                      </div>
                    </div>
                    <div className="s3-call-btn">{t("how.3.cta")}</div>
                    <div className="s3-time">{t("how.3.time")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── countries ───────── */}
      <section className="section" id="coverage">
        <div className="shell">
          <div className="section-head reveal">
            <span className="section-eyebrow">{t("cov.eyebrow")}</span>
            <h2 dangerouslySetInnerHTML={h("cov.h")} />
            <p className="section-sub">{t("cov.sub")}</p>
          </div>

          <div className="countries">
            {[
              { key: "bh", flag: "🇧🇭", code: "BH · MNM", live: true },
              { key: "ae", flag: "🇦🇪", code: "AE · DXB" },
              { key: "sa", flag: "🇸🇦", code: "SA · RUH" },
              { key: "kw", flag: "🇰🇼", code: "KW · KWI" },
              { key: "qa", flag: "🇶🇦", code: "QA · DOH" },
              { key: "om", flag: "🇴🇲", code: "OM · MCT" },
            ].map((c) => (
              <div
                key={c.key}
                className={`country reveal ${c.live ? "live" : ""}`}
              >
                <span className="flag">{c.flag}</span>
                <div>
                  <div className="name">{t(`cov.${c.key}`)}</div>
                  <div className="code">{c.code}</div>
                </div>
                <span className="status">
                  {c.live ? (
                    <>
                      <span className="d" />
                      LIVE
                    </>
                  ) : (
                    "SOON"
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── download ───────── */}
      <section className="section">
        <div className="shell">
          <div className="download reveal" id="download">
            <span className="section-eyebrow">{t("dl.eyebrow")}</span>
            <h2
              style={{ marginTop: 18 }}
              dangerouslySetInnerHTML={h("dl.h")}
            />
            <p className="section-sub">{t("dl.sub")}</p>
            <div className="dl-row">
              <a className="dl-badge" href="#">
                <span className="ico">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 12.5c-.03-2.9 2.37-4.3 2.48-4.37-1.35-1.98-3.46-2.25-4.21-2.28-1.79-.18-3.5 1.05-4.41 1.05-.92 0-2.32-1.03-3.81-1-1.96.03-3.77 1.14-4.78 2.89-2.04 3.54-.52 8.78 1.46 11.66.97 1.41 2.12 3 3.61 2.95 1.45-.06 2-.94 3.76-.94 1.74 0 2.26.94 3.8.91 1.57-.03 2.56-1.44 3.52-2.86 1.11-1.64 1.57-3.23 1.59-3.31-.04-.02-3.05-1.17-3.08-4.7zM14.43 4.04c.8-.97 1.34-2.31 1.19-3.65-1.15.05-2.55.77-3.37 1.73-.73.85-1.38 2.21-1.21 3.53 1.29.1 2.6-.66 3.39-1.61z" />
                  </svg>
                </span>
                <div>
                  <div className="t">{t("dl.apple.t")}</div>
                  <div className="n">App Store</div>
                </div>
              </a>
              <a className="dl-badge" href="#">
                <span className="ico">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.6 1.8c-.4.4-.6 1-.6 1.8v16.8c0 .8.2 1.4.6 1.8l9.8-10.2L3.6 1.8zm10.6 9l2.6-2.6L5.5 1.7c-.4-.2-.8-.3-1.2-.2l9.9 9.3zm2.6 4.4l3.4-1.9c.9-.5.9-1.4 0-1.9l-3-1.7-3 2.8 2.6 2.7zM4.3 22.5c.4.1.8 0 1.2-.2l11.3-6.5-2.6-2.7-9.9 9.4z" />
                  </svg>
                </span>
                <div>
                  <div className="t">{t("dl.google.t")}</div>
                  <div className="n">Google Play</div>
                </div>
              </a>
            </div>
            <div
              style={{ marginTop: 36, fontSize: 13, color: "var(--subtle)" }}
            >
              {t("dl.beta")}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="section" id="faq" style={{ paddingTop: 40 }}>
        <div className="shell">
          <div className="section-head reveal">
            <span className="section-eyebrow">{t("faq.eyebrow")}</span>
            <h2 dangerouslySetInnerHTML={h("faq.h")} />
          </div>
          <div className="faq-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <details className="faq reveal" key={i}>
                <summary>
                  <span>{t(`faq.${i}.q`)}</span>
                  <span className="plus" />
                </summary>
                <div className="faq-body">{t(`faq.${i}.a`)}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── footer ───────── */}
      <footer className="footer">
        <div className="shell">
          <div className="footer-top">
            <div className="footer-brand">
              <a className="brand" href="#">
                <div className="brand-mark">Au</div>
                <span>Legal SOS</span>
              </a>
              <p>{t("foot.tagline")}</p>
            </div>
            <div className="footer-col">
              <h4>{t("foot.product")}</h4>
              <ul>
                <li>
                  <a href="#cases">{t("foot.p1")}</a>
                </li>
                <li>
                  <a href="#how">{t("foot.p2")}</a>
                </li>
                <li>
                  <a href="#coverage">{t("foot.p3")}</a>
                </li>
                <li>
                  <a href="#download">{t("foot.p4")}</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t("foot.contact")}</h4>
              <ul>
                <li>
                  <a href="tel:+97332317070">+973 3231 7070</a>
                </li>
                <li>
                  <a href="mailto:info@gicc.bh">info@gicc.bh</a>
                </li>
                <li>
                  <a href="#">{t("foot.c1")}</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t("foot.legal")}</h4>
              <ul>
                <li>
                  <a href="#">{t("foot.l1")}</a>
                </li>
                <li>
                  <a href="#">{t("foot.l2")}</a>
                </li>
                <li>
                  <a href="#">{t("foot.l3")}</a>
                </li>
                <li>
                  <a href="#">{t("foot.l4")}</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>{t("foot.copy")}</div>
            <div className="powered">
              Powered by <span>Saudi Lawyers</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ───────── sticky CTA ───────── */}
      <div className="sticky-cta" ref={stickyRef}>
        <span className="label">
          <strong>{t("sticky.s")}</strong> · <span>{t("sticky.l")}</span>
        </span>
        <a className="btn btn-primary" href="#download">
          <span>{t("sticky.cta")}</span>
          <Chevron />
        </a>
      </div>
    </>
  );
}
