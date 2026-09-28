import {
  UserPlus,
  House,
  FileText,
  FileSignature,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
};

export default async function HowItWorks({ locale }: Props) {
  const t = await getTranslations({ locale });
  const isAr = locale === "ar";

  const steps = [
    {
      key: "step1",
      icon: UserPlus,
    },
    {
      key: "step2",
      icon: House,
    },
    {
      key: "step3",
      icon: FileText,
    },
    {
      key: "step4",
      icon: FileSignature,
    },
    {
      key: "step5",
      icon: CreditCard,
    },
    {
      key: "step6",
      icon: ShieldCheck,
    },
  ] as const;

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden bg-[#F4F7FA] py-20">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -left-40
          top-20
          h-80
          w-80
          rounded-full
          bg-primary/5
          blur-[100px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-40
          bottom-0
          h-96
          w-96
          rounded-full
          bg-primary/5
          blur-[110px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.025]
          [background-image:radial-gradient(circle_at_1px_1px,#03C39A_1px,transparent_1px)]
          [background-size:24px_24px]
        "
      />

      <div className="ejari-container relative z-10">

        {/* =====================================================
            SECTION HEADING
        ===================================================== */}

        <div className="mb-16 text-center">

          <span
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-primary/10
              bg-primary/5
              px-4
              py-1.5
              text-sm
              font-bold
              text-primary
            "
          >
            {t("howItWorks.label")}
          </span>

          <h2 className="ejari-section-title mt-3">
            {t("howItWorks.title")}
          </h2>

          <div className="ejari-section-line" />

          <p className="ejari-section-subtitle mx-auto mt-4 max-w-2xl">
            {t("howItWorks.subtitle")}
          </p>

        </div>

        {/* =====================================================
            TIMELINE
        ===================================================== */}

        <div className="relative">

          {/* Desktop Timeline Base */}

          <div
            className="
              pointer-events-none
              absolute
              left-[7%]
              right-[7%]
              top-[45px]
              hidden
              h-[2px]
              overflow-hidden
              rounded-full
              bg-primary/10
              lg:block
            "
          >

            {/* Animated Progress */}

            <div
              className="
                h-full
                w-full
                origin-left
                rounded-full
                bg-gradient-to-r
                from-primary/20
                via-primary
                to-primary/20
                animate-[timelineProgress_2s_ease-out_forwards]
              "
            />

          </div>

          {/* =================================================
              STEPS
          ================================================= */}

          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6 lg:gap-3">

            {steps.map(({ key, icon: Icon }, index) => (

              <div
                key={key}
                className="
                  group
                  relative
                  text-center
                  animate-[stepReveal_0.7s_ease-out_both]
                "
                style={{
                  animationDelay: `${index * 120}ms`,
                }}
              >

                {/* =================================================
                    ICON / NODE
                ================================================= */}

                <div className="relative z-10 mx-auto h-[92px] w-[92px]">

                  {/* Outer glow */}

                  <div
                    className="
                      absolute
                      inset-[-5px]
                      rounded-full
                      bg-primary/0
                      blur-md
                      transition-all
                      duration-700
                      group-hover:bg-primary/10
                      group-hover:scale-110
                    "
                  />

                  {/* Outer ring */}

                  <div
                    className="
                      absolute
                      inset-0
                      rounded-full
                      border
                      border-primary/15
                      bg-white
                      shadow-[0_5px_20px_rgba(31,41,55,0.04)]
                      transition-all
                      duration-500
                      ease-out
                      group-hover:scale-110
                      group-hover:border-primary/30
                      group-hover:bg-primary/5
                    "
                  />

                  {/* Inner icon */}

                  <div
                    className="
                      absolute
                      left-1/2
                      top-1/2
                      flex
                      h-[66px]
                      w-[66px]
                      -translate-x-1/2
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-primary
                      shadow-[0_5px_18px_rgba(31,41,55,0.07)]
                      transition-all
                      duration-500
                      ease-out
                      group-hover:scale-110
                      group-hover:bg-primary
                      group-hover:text-white
                      group-hover:shadow-[0_12px_30px_rgba(3,195,154,0.22)]
                    "
                  >

                    <Icon
                      size={28}
                      strokeWidth={1.7}
                      className="
                        transition-all
                        duration-500
                        ease-out
                        group-hover:scale-110
                        group-hover:rotate-[-6deg]
                      "
                    />

                  </div>

                  {/* Number */}

                  <div
                    className="
                      absolute
                      -right-1
                      -top-2
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      border-[3px]
                      border-[#F4F7FA]
                      bg-primary
                      text-[10px]
                      font-extrabold
                      text-white
                      shadow-[0_4px_12px_rgba(3,195,154,0.22)]
                      transition-all
                      duration-500
                      group-hover:scale-110
                      group-hover:rotate-6
                    "
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>

                </div>

                {/* =================================================
                    CONTENT
                ================================================= */}

                <div
                  className="
                    transition-transform
                    duration-500
                    ease-out
                    group-hover:-translate-y-1
                  "
                >

                  <h3
                    className="
                      mt-6
                      text-sm
                      font-extrabold
                      leading-6
                      text-text-primary
                      transition-colors
                      duration-300
                      group-hover:text-primary
                      sm:text-base
                    "
                  >
                    {t(`howItWorks.${key}.title`)}
                  </h3>

                  <p
                    className="
                      mx-auto
                      mt-3
                      max-w-[175px]
                      text-xs
                      leading-6
                      text-text-muted
                      transition-colors
                      duration-300
                      group-hover:text-text-secondary
                    "
                  >
                    {t(`howItWorks.${key}.desc`)}
                  </p>

                </div>

                {/* =================================================
                    MOBILE CONNECTOR
                ================================================= */}

                {index < steps.length - 1 && (
                  <div
                    className="
                      relative
                      mx-auto
                      mt-7
                      h-10
                      w-px
                      overflow-hidden
                      rounded-full
                      bg-primary/10
                      sm:hidden
                    "
                  >
                    <div
                      className="
                        h-1/2
                        w-full
                        rounded-full
                        bg-primary/40
                      "
                    />
                  </div>
                )}

                {/* =================================================
                    DESKTOP ARROW
                ================================================= */}

                {index < steps.length - 1 && (
                  <div
                    className="
                      absolute
                      top-[36px]
                      hidden
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-primary/10
                      bg-white
                      text-primary/40
                      shadow-sm
                      transition-all
                      duration-500
                      group-hover:scale-125
                      group-hover:border-primary/30
                      group-hover:text-primary
                      lg:flex
                    "
                    style={{
                      [isAr ? "left" : "right"]: "-16px",
                    }}
                  >
                    <Arrow
                      size={13}
                      strokeWidth={2}
                    />
                  </div>
                )}

              </div>

            ))}

          </div>

        </div>

      </div>
    </section>
  );
}