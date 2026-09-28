"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import Link from "next/link";

const DISCLAIMER_STORAGE_KEY = "lawyers-bh-disclaimer-v1";

function subscribe() {
  return () => {};
}

export default function DisclaimerPopup() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const [isDismissed, setIsDismissed] = useState(false);

  const hasAccepted = isClient
    ? window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "accepted"
    : false;

  const isOpen = isClient && !hasAccepted && !isDismissed;

  function handleAccept() {
    window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "accepted");
    setIsDismissed(true);
  }

  function handleClose() {
    setIsDismissed(true);
  }

  if (!isOpen) {
    return null;
  }

  const content = isAr
    ? {
        title: "إخلاء مسؤولية",
        intro:
          "تعمل منصة محامون البحرين كمنصة إلكترونية تربط العملاء بالمحامين ومزودي الخدمات القانونية المرخصين، ويقتصر دورها على تسهيل التواصل وحجز الخدمات وإدارة المدفوعات الإلكترونية.",
        sectionTitle: "الشروط والمسؤوليات",
        sectionDescription: "يرجى قراءة جميع البنود قبل الموافقة",
        points: [
          "تقع جميع المسؤوليات القانونية والتعاقدية والمهنية والمالية الناتجة عن أي استشارة قانونية أو خدمة أو اتفاق أو تمثيل قانوني على العميل ومزود الخدمة فقط.",
          "لا تُعد منصة محامون البحرين طرفًا في أي اتفاق أو علاقة تعاقدية تنشأ بين العميل ومزود الخدمة، سواء تم التواصل أو تقديم الخدمة من خلال المنصة أو خارجها.",
          "يتحمل العميل ومزود الخدمة مسؤولية الالتزام بجميع الأنظمة والقوانين والاتفاقيات المبرمة بينهما، بما في ذلك الأتعاب وجودة الخدمة والتنفيذ والمواعيد وأي التزامات أو مطالبات قانونية.",
          "لا تتحمل المنصة مسؤولية أي نزاع أو مطالبة أو خسارة أو ضرر ينشأ عن العلاقة أو التعامل بين العميل ومزود الخدمة، وذلك في حدود ما يسمح به القانون.",
          "نوصي بإتمام جميع المراسلات وحجوزات المواعيد وعمليات الدفع من خلال المنصة لضمان توثيق المعاملات وتحقيق مزيد من الأمان والشفافية.",
        ],
        confirmationStart:
          'بالضغط على "نعم، أوافق"، فإنك تقر بأنك قرأت وفهمت هذا الإخلاء وتوافق على',
        terms: "شروط الاستخدام",
        privacy: "سياسة الخصوصية",
        and: "و",
        accept: "نعم، أوافق",
        closeLabel: "إغلاق",
      }
    : {
        title: "Disclaimer",
        intro:
          "Lawyers BH is an online platform that connects clients with licensed lawyers and legal service providers. Its role is limited to facilitating communication, appointment bookings, and electronic payments.",
        sectionTitle: "Terms and Responsibilities",
        sectionDescription: "Please read all terms before accepting",
        points: [
          "All legal, contractual, professional, and financial responsibilities arising from any legal consultation, service, agreement, or legal representation rest solely with the client and the service provider.",
          "Lawyers BH is not a party to any agreement or contractual relationship between the client and the service provider, whether communication or services take place through the platform or outside it.",
          "The client and the service provider are solely responsible for complying with applicable laws and the terms agreed between them, including fees, service quality, performance, deadlines, and any resulting legal obligations or claims.",
          "Lawyers BH shall not be responsible for any dispute, claim, loss, or damage arising from the relationship or dealings between the client and the service provider, to the extent permitted by law.",
          "We recommend completing all communications, appointment bookings, and payments through the platform to ensure proper documentation, security, and transparency.",
        ],
        confirmationStart:
          'By clicking "Yes, I Accept", you confirm that you have read and understood this disclaimer and agree to the',
        terms: "Terms of Use",
        privacy: "Privacy Policy",
        and: "and",
        accept: "Yes, I Accept",
        closeLabel: "Close",
      };

  return (
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        overflow-hidden
        bg-[#06111f]/85
        p-3
        backdrop-blur-[3px]
        sm:p-5
        lg:p-6
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-description"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="
          relative
          flex h-[88dvh]
          max-h-[760px]
          w-full max-w-3xl
          flex-col overflow-hidden
          rounded-2xl
          border border-slate-200
          bg-white
          shadow-2xl
          sm:h-[90dvh]
          sm:rounded-3xl
        "
      >
        {/* رأس النافذة */}
        <header
          className="
            relative shrink-0
            border-b border-slate-100
            bg-white
            px-12 py-3.5
            text-center
            sm:px-16 sm:py-5
          "
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label={content.closeLabel}
            className={`
              absolute top-1/2 z-20
              flex h-8 w-8
              -translate-y-1/2
              items-center justify-center
              rounded-full
              border border-slate-200
              bg-white
              text-slate-500
              shadow-sm
              transition
              hover:bg-slate-100
              hover:text-slate-900
              focus:outline-none
              focus:ring-4
              focus:ring-red-100
              sm:h-10 sm:w-10
              ${isAr ? "left-3 sm:left-5" : "right-3 sm:right-5"}
            `}
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <h2
            id="disclaimer-title"
            className="
              text-lg font-bold
              text-[#07111f]
              sm:text-2xl
              lg:text-3xl
            "
          >
            {content.title}
          </h2>

          <div className="mx-auto mt-2.5 h-0.5 w-14 bg-[#d71920] sm:mt-3 sm:w-20" />
        </header>

        {/* المحتوى */}
        <div
          className="
            flex min-h-0 flex-1
            flex-col overflow-hidden
            px-3.5 py-3.5
            sm:px-7 sm:py-5
            lg:px-10
          "
        >
          <p
            id="disclaimer-description"
            className="
              mb-3 shrink-0
              text-[11px] leading-5
              text-slate-600
              sm:mb-5
              sm:text-sm sm:leading-7
              lg:text-[15px]
            "
          >
            {content.intro}
          </p>

          {/* مربع الشروط */}
          <section
            aria-labelledby="disclaimer-terms-title"
            className="
              flex min-h-0 flex-1
              flex-col overflow-hidden
              rounded-xl
              border border-red-200
              bg-[#fff6f6]
              shadow-[0_8px_30px_rgba(215,25,32,0.06)]
              sm:rounded-2xl
            "
          >
            {/* عنوان الشروط */}
            <div
              className="
                flex shrink-0
                items-center gap-2.5
                border-b border-red-200
                bg-[#fdeaea]
                px-3 py-2.5
                sm:gap-3
                sm:px-5 sm:py-3
              "
            >
              <div
                className="
                  flex h-8 w-8
                  shrink-0 items-center justify-center
                  rounded-full
                  bg-white
                  text-[#d71920]
                  shadow-sm
                  sm:h-9 sm:w-9
                "
              >
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              <div className="min-w-0">
                <h3
                  id="disclaimer-terms-title"
                  className="
                    text-xs font-bold
                    text-[#07111f]
                    sm:text-sm
                    lg:text-base
                  "
                >
                  {content.sectionTitle}
                </h3>

                <p className="mt-0.5 text-[9px] text-slate-500 sm:text-xs">
                  {content.sectionDescription}
                </p>
              </div>
            </div>

            {/* السكرول الداخلي للشروط */}
            <div
              className="
                min-h-0 flex-1
                space-y-2
                overflow-y-auto
                overscroll-contain
                bg-[#fffafa]
                p-2.5
                sm:space-y-3
                sm:p-4
              "
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#d71920 #fee2e2",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {content.points.map((point, index) => (
                <article
                  key={point}
                  className="
                    flex items-start
                    gap-2.5
                    rounded-lg
                    border border-red-100
                    bg-white
                    p-3
                    shadow-sm
                    sm:gap-3
                    sm:rounded-xl
                    sm:p-4
                  "
                >
                  <div
                    className="
                      flex h-6 w-6
                      shrink-0 items-center justify-center
                      rounded-full
                      bg-[#d71920]
                      text-[10px] font-bold
                      text-white
                      sm:h-7 sm:w-7
                      sm:text-xs
                    "
                  >
                    {index + 1}
                  </div>

                  <p
                    className="
                      min-w-0
                      text-[11px] leading-5
                      text-slate-700
                      sm:text-sm sm:leading-7
                      lg:text-[15px]
                    "
                  >
                    {point}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* الجزء السفلي */}
        <footer
          className="
            shrink-0
            border-t border-slate-200
            bg-white
            px-3.5 py-3
            sm:px-7 sm:py-4
            lg:px-10
          "
        >
          <p
            className="
              mx-auto max-w-2xl
              text-center
              text-[9px] leading-4
              text-slate-500
              sm:text-xs sm:leading-6
              lg:text-sm
            "
          >
            {content.confirmationStart}{" "}
            <Link
              href={`/${locale}/terms`}
              className="
                font-semibold
                text-[#d71920]
                underline
                decoration-red-200
                underline-offset-4
                transition
                hover:decoration-[#d71920]
              "
            >
              {content.terms}
            </Link>{" "}
            {content.and}{" "}
            <Link
              href={`/${locale}/privacy`}
              className="
                font-semibold
                text-[#d71920]
                underline
                decoration-red-200
                underline-offset-4
                transition
                hover:decoration-[#d71920]
              "
            >
              {content.privacy}
            </Link>
            .
          </p>

          <button
            type="button"
            onClick={handleAccept}
            className="
              mt-2.5
              flex w-full
              items-center justify-center
              gap-2
              rounded-lg
              bg-[#d71920]
              px-4 py-2.5
              text-xs font-bold
              text-white
              shadow-lg shadow-red-900/15
              transition
              hover:bg-[#b9151b]
              focus:outline-none
              focus:ring-4
              focus:ring-red-200
              active:scale-[0.99]
              sm:mt-4
              sm:rounded-xl
              sm:px-6
              sm:py-3.5
              sm:text-base
            "
          >
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            {content.accept}
          </button>
        </footer>
      </div>
    </div>
  );
}