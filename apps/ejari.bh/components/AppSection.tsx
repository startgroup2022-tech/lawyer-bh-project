import {
  Smartphone,
  CheckCircle2,
  Download,
  Apple,
  Play,
} from "lucide-react";

import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
};

export default async function AppDownload({ locale }: Props) {
  const t = await getTranslations({ locale });

  return (
    <section
      id="app"
      className="py-20"
    >
      <div className="ejari-container">

        {/* =====================================================
            MAIN APP CARD
        ===================================================== */}

        <div
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-[#DDEBE6]
            bg-[#F4F7FA]
            px-6
            py-14
            shadow-[0_18px_50px_rgba(31,41,55,0.06)]
            sm:px-10
            lg:px-14
          "
        >

          {/* ===================================================
              BACKGROUND GRID
          =================================================== */}

          <div
            className="
              ejari-app-grid
              pointer-events-none
              absolute
              inset-0
              opacity-[0.035]
              [background-image:linear-gradient(rgba(3,195,154,1)_1px,transparent_1px),linear-gradient(90deg,rgba(3,195,154,1)_1px,transparent_1px)]
              [background-size:32px_32px]
            "
          />

          {/* ===================================================
              GREEN GLOW - RIGHT
          =================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              -right-32
              top-1/2
              h-[400px]
              w-[400px]
              -translate-y-1/2
              rounded-full
              bg-primary/10
              blur-[100px]
            "
          />

          {/* ===================================================
              GREEN GLOW - LEFT
          =================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              -left-32
              bottom-0
              h-[300px]
              w-[300px]
              rounded-full
              bg-primary/5
              blur-[90px]
            "
          />

          {/* ===================================================
              CONTENT
          =================================================== */}

          <div
            className="
              relative
              z-10
              grid
              items-center
              gap-12
              lg:grid-cols-[0.8fr_1.2fr]
            "
          >

            {/* =================================================
                PHONE VISUAL
            ================================================= */}

            <div
              className="
                order-2
                flex
                justify-center
                lg:order-1
              "
            >

              <div
                className="
                  relative
                  h-[400px]
                  w-full
                  max-w-[430px]
                  overflow-visible
                "
              >

                {/* Phone glow */}

                <div
                  className="
                  ejari-app-glow
                  absolute
                  left-1/2
                  top-1/2
                  h-[280px]
                  w-[280px]
                  -translate-x-1/2
                  -translate-y-1/2
                  rounded-full
                  bg-primary/10
                  blur-[70px]
                  "
                />

                {/* Back phone */}

                <div
                  className="
                    ejari-app-back-phone
                    absolute
                    right-[7%]
                    top-[25px]
                    h-[330px]
                    w-[165px]
                    rotate-[8deg]
                    rounded-[30px]
                    border-[6px]
                    border-[#1F2937]
                    bg-white
                    shadow-[0_25px_50px_rgba(31,41,55,0.16)]
                    opacity-90
                  "
                >

                  <div
                    className="
                      absolute
                      left-1/2
                      top-2
                      h-4
                      w-16
                      -translate-x-1/2
                      rounded-full
                      bg-[#1F2937]
                    "
                  />

                  <div
                    className="
                      absolute
                      inset-[6px]
                      overflow-hidden
                      rounded-[24px]
                      bg-[#F4F7FA]
                    "
                  >

                    <div className="px-3 pt-10">

                      <div className="text-[7px] text-text-muted">
                        Ejari
                      </div>

                      <div
                        className="
                          mt-5
                          rounded-xl
                          bg-primary
                          px-3
                          py-5
                          text-center
                          text-white
                          shadow-sm
                        "
                      >
                        <div className="text-[7px] opacity-80">
                          {locale === "ar"
                            ? "الرصيد المستحق"
                            : "Amount due"}
                        </div>

                        <div className="mt-2 text-xl font-extrabold">
                          BD 400
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

                {/* Main phone */}

                <div
                  className="
                    ejari-app-phone
                    absolute
                    left-[17%]
                    top-0
                    z-10
                    h-[390px]
                    w-[195px]
                    rotate-[-6deg]
                    rounded-[34px]
                    border-[7px]
                    border-[#1F2937]
                    bg-white
                    shadow-[0_25px_60px_rgba(31,41,55,0.20)]
                  "
                >

                  {/* Dynamic Island */}

                  <div
                    className="
                      absolute
                      left-1/2
                      top-2
                      h-5
                      w-20
                      -translate-x-1/2
                      rounded-full
                      bg-[#1F2937]
                    "
                  />

                  {/* Screen */}

                  <div
                    className="
                      flex
                      h-full
                      flex-col
                      overflow-hidden
                      rounded-[27px]
                      bg-[#F4F7FA]
                    "
                  >

                    <div className="px-4 pt-12">

                      <div className="text-right text-[9px] text-text-muted">
                        {locale === "ar"
                          ? "مرحباً بك"
                          : "Welcome"}
                      </div>

                      <div
                        className="
                          mt-4
                          rounded-xl
                          bg-white
                          p-3
                          shadow-[0_4px_15px_rgba(31,41,55,0.06)]
                        "
                      >

                        <div className="text-[8px] text-text-muted">
                          {locale === "ar"
                            ? "عقد الإيجار"
                            : "Lease Contract"}
                        </div>

                        <div className="mt-2 text-xl font-extrabold text-text-primary">
                          BD 400
                        </div>

                        <div className="mt-2 h-2 w-full rounded-full bg-primary/10">
                          <div className="h-2 w-2/3 rounded-full bg-primary" />
                        </div>

                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <div
                          className="
                            rounded-xl
                            bg-white
                            p-3
                            shadow-[0_4px_15px_rgba(31,41,55,0.05)]
                          "
                        >
                          <CheckCircle2
                            size={17}
                            className="text-primary"
                          />

                          <div className="mt-2 text-[8px] font-bold text-text-primary">
                            {locale === "ar"
                              ? "التحقق"
                              : "Verify"}
                          </div>
                        </div>

                        <div
                          className="
                            rounded-xl
                            bg-white
                            p-3
                            shadow-[0_4px_15px_rgba(31,41,55,0.05)]
                          "
                        >
                          <Download
                            size={17}
                            className="text-primary"
                          />

                          <div className="mt-2 text-[8px] font-bold text-text-primary">
                            {locale === "ar"
                              ? "العقود"
                              : "Contracts"}
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Bottom Navigation */}

                    <div
                      className="
                        mt-auto
                        flex
                        h-12
                        items-center
                        justify-around
                        border-t
                        border-[#EAEAEC]
                        bg-white
                      "
                    >

                      <div className="h-2 w-2 rounded-full bg-gray-300" />
                      <div className="h-2 w-2 rounded-full bg-gray-300" />
                      <div className="h-2 w-2 rounded-full bg-gray-300" />
                      <div className="h-2 w-2 rounded-full bg-primary" />

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* =================================================
                TEXT CONTENT
            ================================================= */}

            <div
              className="
                ejari-app-content
                order-1
                text-center
                lg:order-2
                lg:text-right
              "
            >

              {/* Badge */}

              <div
                className="
                  mb-5
                  ejari-app-badge
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-primary/15
                  bg-white
                  px-4
                  py-2
                  text-xs
                  font-bold
                  text-primary
                  shadow-sm
                "
              >
                <Smartphone size={15} />

                {locale === "ar"
                  ? "تطبيق إيجاري"
                  : "Ejari App"}
              </div>

              {/* Title */}

              <h2
                className="
                  text-3xl
                  font-extrabold
                  leading-[1.35]
                  tracking-tight
                  text-text-primary
                  sm:text-4xl
                "
              >
                {locale === "ar"
                  ? "إيجاري معك أينما كنت"
                  : "Ejari with you wherever you are"}
              </h2>

              {/* Accent */}

              <div
                className="
                  mt-4
                  h-[3px]
                  w-12
                  rounded-full
                  bg-primary
                  lg:mr-0
                  lg:ml-auto
                "
              />

              {/* Description */}

              <p
                className="
                  mx-auto
                  mt-6
                  max-w-xl
                  text-sm
                  leading-8
                  text-text-secondary
                  lg:mx-0
                  lg:text-base
                "
              >
                {locale === "ar"
                  ? "أنجز معاملاتك، تابع عقودك ومدفوعاتك، واحصل على التنبيهات مباشرة من هاتفك."
                  : "Manage your contracts, payments and rental services directly from your phone."}
              </p>

              {/* =================================================
                  DOWNLOAD TITLE
              ================================================= */}

              <div className="mt-8">

                <div className="flex items-center justify-center gap-2 lg:justify-start">

                  <span className="text-sm font-extrabold text-text-primary">
                    {locale === "ar"
                      ? "حمّل التطبيق الآن"
                      : "Download the app"}
                  </span>

                  <div
                    className="
                      ejari-app-check
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-primary
                      text-white
                    "
                  >
                    <CheckCircle2 size={16} />
                  </div>

                </div>

              </div>

              {/* =================================================
                  STORE BUTTONS
              ================================================= */}

              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                  lg:justify-start
                "
              >

                {/* App Store */}

                <a
                  href="#"
                  className="
                    group
                    flex
                    h-12
                    items-center
                    justify-center
                    gap-3
                    rounded-xl
                    bg-[#1F2937]
                    px-5
                    text-white
                    shadow-[0_6px_18px_rgba(31,41,55,0.12)]
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:scale-[1.02]
                    hover:bg-[#17212f]
                    hover:shadow-[0_12px_28px_rgba(31,41,55,0.18)]
                    active:translate-y-0
                    active:scale-[0.98]
                  "
                >

                  <Apple
                    size={21}
                    fill="currentColor"
                  />

                  <div className="text-right leading-none">

                    <div className="text-[8px] text-white/60">
                      Download on the
                    </div>

                    <div className="mt-1 text-sm font-bold">
                      App Store
                    </div>

                  </div>

                </a>

                {/* Google Play */}

                <a
                  href="#"
                  className="
                    group
                    flex
                    h-12
                    items-center
                    justify-center
                    gap-3
                    rounded-xl
                    bg-[#1F2937]
                    px-5
                    text-white
                    shadow-[0_6px_18px_rgba(31,41,55,0.12)]
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:scale-[1.02]
                    hover:bg-[#17212f]
                    hover:shadow-[0_12px_28px_rgba(31,41,55,0.18)]
                    active:translate-y-0
                    active:scale-[0.98]
                  "
                >

                  <Play
                    size={19}
                    fill="currentColor"
                  />

                  <div className="text-right leading-none">

                    <div className="text-[8px] text-white/60">
                      GET IT ON
                    </div>

                    <div className="mt-1 text-sm font-bold">
                      Google Play
                    </div>

                  </div>

                </a>

              </div>

              {/* =================================================
                  SMALL TRUST NOTE
              ================================================= */}

              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-xs
                  text-text-muted
                  lg:justify-start
                "
              >
                <CheckCircle2
                  size={14}
                  className="text-primary"
                />

                <span>
                  {locale === "ar"
                    ? "متوفر لأجهزة iOS و Android"
                    : "Available for iOS and Android"}
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}