import {
  Building2,
  Landmark,
  Droplets,
  MapPinned,
  Banknote,
} from "lucide-react";

import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
};

export default async function Partners({ locale }: Props) {
  const t = await getTranslations({ locale });

  const partners = [
    {
      key: "rera",
      icon: Building2,
    },
    {
      key: "bahrain",
      icon: Landmark,
    },
    {
      key: "ewa",
      icon: Droplets,
    },
    {
      key: "municipality",
      icon: MapPinned,
    },
    {
      key: "banks",
      icon: Banknote,
    },
  ] as const;

  return (
    <section className="relative overflow-hidden bg-white py-20">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -left-40
          top-10
          h-80
          w-80
          rounded-full
          bg-primary/5
          blur-[110px]
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
          blur-[120px]
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
            HEADING
        ===================================================== */}

        <div className="mb-12 text-center">

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
            {t("partners.label")}
          </span>

          <h2 className="ejari-section-title mt-3">
            {t("partners.title")}
          </h2>

          <div className="ejari-section-line" />

          <p className="ejari-section-subtitle mx-auto mt-4 max-w-2xl">
            {t("partners.subtitle")}
          </p>

        </div>

        {/* =====================================================
            PARTNERS
        ===================================================== */}

        <div
          className="
            grid
            grid-cols-2
            gap-4
            sm:grid-cols-3
            lg:grid-cols-5
          "
        >

          {partners.map(({ key, icon: Icon }, index) => (

            <div
              key={key}
              className="
                group
                relative
                flex
                min-h-[175px]
                flex-col
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
                border
                border-[#EAEAEC]
                bg-[#F4F7FA]
                px-5
                py-7
                text-center
                shadow-[0_4px_18px_rgba(31,41,55,0.03)]
                transition-all
                duration-500
                ease-out

                hover:-translate-y-2
                hover:border-primary/20
                hover:bg-white
                hover:shadow-[0_18px_40px_rgba(3,195,154,0.10)]
              "
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >

              {/* =================================================
                  GREEN GLOW
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -right-12
                  -top-12
                  h-28
                  w-28
                  rounded-full
                  bg-primary/0
                  blur-3xl
                  transition-all
                  duration-700
                  group-hover:scale-150
                  group-hover:bg-primary/10
                "
              />

              {/* =================================================
                  BOTTOM GLOW
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -bottom-16
                  -left-10
                  h-28
                  w-28
                  rounded-full
                  bg-primary/0
                  blur-3xl
                  transition-all
                  duration-700
                  group-hover:bg-primary/5
                "
              />

              {/* =================================================
                  TOP ACCENT
              ================================================= */}

              <div
                className="
                  absolute
                  left-1/2
                  top-0
                  h-[3px]
                  w-0
                  -translate-x-1/2
                  rounded-full
                  bg-primary
                  transition-all
                  duration-500
                  group-hover:w-20
                "
              />

              {/* =================================================
                  ICON
              ================================================= */}

              <div
                className="
                  relative
                  z-10
                  flex
                  h-[68px]
                  w-[68px]
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-[#EAEAEC]
                  bg-white
                  text-primary
                  shadow-[0_5px_18px_rgba(31,41,55,0.05)]
                  transition-all
                  duration-500
                  ease-out

                  group-hover:-translate-y-1
                  group-hover:scale-105
                  group-hover:rotate-[-3deg]
                  group-hover:border-primary/20
                  group-hover:bg-primary
                  group-hover:text-white
                  group-hover:shadow-[0_12px_30px_rgba(3,195,154,0.20)]
                "
              >
                <Icon
                  size={29}
                  strokeWidth={1.6}
                  className="
                    transition-transform
                    duration-500
                    group-hover:scale-110
                  "
                />
              </div>

              {/* =================================================
                  NAME
              ================================================= */}

              <div
                className="
                  relative
                  z-10
                  mt-5
                  text-xs
                  font-bold
                  leading-5
                  text-text-secondary
                  transition-all
                  duration-300
                  group-hover:text-text-primary
                "
              >
                {t(`partners.${key}`)}
              </div>

              {/* =================================================
                  SMALL INDICATOR
              ================================================= */}

              <div
                className="
                  absolute
                  bottom-4
                  h-1
                  w-1
                  rounded-full
                  bg-primary/20
                  transition-all
                  duration-500
                  group-hover:w-8
                  group-hover:bg-primary
                "
              />

            </div>

          ))}

        </div>

        {/* =====================================================
            TRUST LINE
        ===================================================== */}

        <div className="mt-10 flex items-center justify-center gap-3">

          <div className="h-px w-12 bg-primary/10" />

          <div
            className="
              flex
              items-center
              gap-2
              text-[11px]
              font-semibold
              text-text-muted
            "
          >
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            {locale === "ar"
              ? "منظومة موثوقة ومتكاملة"
              : "A trusted and connected ecosystem"}
          </div>

          <div className="h-px w-12 bg-primary/10" />

        </div>

      </div>
    </section>
  );
}