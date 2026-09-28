import {
  Search,
  FilePlus2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
};

export default async function Hero({ locale }: Props) {
  const t = await getTranslations({ locale });

  return (
    <section
      className="
        relative
        overflow-hidden
        bg-white
      "
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      {/* Top green glow */}
      <div
        className="
          pointer-events-none
          absolute
          -right-40
          -top-32
          h-[520px]
          w-[520px]
          rounded-full
          bg-primary/5
          blur-[110px]
          ejari-pulse
        "
      />

      {/* Bottom green glow */}
      <div
        className="
          pointer-events-none
          absolute
          -left-40
          bottom-0
          h-[420px]
          w-[420px]
          rounded-full
          bg-primary/5
          blur-[110px]
        "
      />

      {/* Subtle grid */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.025]
          bg-[linear-gradient(rgba(3,195,154,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(3,195,154,0.5)_1px,transparent_1px)]
          bg-[size:48px_48px]
        "
      />

      {/* Bottom wash */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-b
          from-white
          via-white
          to-bg-light/60
        "
      />

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="ejari-container relative z-10">

        <div
          className="
            grid
            min-h-[620px]
            items-center
            gap-10
            py-14
            lg:grid-cols-[0.9fr_1.1fr]
            lg:py-16
          "
        >

          {/* =================================================
              PHONE / VISUAL
          ================================================= */}

          <div className="order-2 flex justify-center lg:order-1">

            <div
              className="
                relative
                flex
                h-[420px]
                w-full
                max-w-[500px]
                items-center
                justify-center
                ejari-fade-up
              "
            >

              {/* Main phone glow */}
              <div
                className="
                  pointer-events-none
                  absolute
                  h-[320px]
                  w-[320px]
                  rounded-full
                  bg-primary/10
                  blur-3xl
                  ejari-pulse
                "
              />

              {/* Ground glow */}
              <div
                className="
                  absolute
                  bottom-0
                  h-[250px]
                  w-full
                  rounded-[50%]
                  bg-gradient-to-t
                  from-primary/10
                  to-transparent
                  opacity-80
                  blur-[2px]
                "
              />

              {/* Decorative ring */}
              <div
                className="
                  pointer-events-none
                  absolute
                  bottom-[30px]
                  h-[260px]
                  w-[360px]
                  rounded-full
                  border
                  border-primary/5
                "
              />

              {/* Small decorative ring */}
              <div
                className="
                  pointer-events-none
                  absolute
                  bottom-[65px]
                  h-[210px]
                  w-[290px]
                  rounded-full
                  border
                  border-primary/5
                  opacity-60
                "
              />

              {/* =================================================
                  PHONE
              ================================================= */}

              <div
                className="
                  relative
                  z-10
                  h-[430px]
                  w-[215px]
                  rotate-[-5deg]
                  rounded-[34px]
                  border-[7px]
                  border-bg-dark
                  bg-white
                  shadow-[0_25px_60px_rgba(26,42,63,0.18)]
                  transition-all
                  duration-700
                  ease-out
                  hover:rotate-[-2deg]
                  hover:-translate-y-2
                  hover:shadow-[0_35px_75px_rgba(26,42,63,0.24)]
                  ejari-float
                "
              >

                {/* Dynamic Island */}
                <div
                  className="
                    absolute
                    left-1/2
                    top-2
                    z-20
                    h-5
                    w-20
                    -translate-x-1/2
                    rounded-full
                    bg-bg-dark
                  "
                />

                {/* Phone screen */}
                <div
                  className="
                    flex
                    h-full
                    flex-col
                    overflow-hidden
                    rounded-[27px]
                    bg-bg-light
                  "
                >

                  {/* Screen content */}
                  <div className="px-4 pt-12">

                    {/* Welcome */}
                    <div
                      className="
                        text-right
                        text-[10px]
                        text-text-muted
                      "
                    >
                      {locale === "ar"
                        ? "مرحباً راشد"
                        : "Welcome"}
                    </div>

                    {/* Lease Card */}
                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-border
                        bg-white
                        p-3
                        shadow-[0_4px_14px_rgba(26,42,63,0.06)]
                        transition-all
                        duration-500
                        hover:-translate-y-1
                      "
                    >

                      <div className="text-[9px] text-text-muted">
                        {locale === "ar"
                          ? "عقد الإيجار"
                          : "Lease Contract"}
                      </div>

                      <div className="mt-2 text-lg font-extrabold text-text-primary">
                        BD 400
                      </div>

                      {/* Progress */}
                      <div className="mt-2 h-2 w-24 rounded-full bg-primary/10">
                        <div
                          className="
                            h-2
                            w-16
                            rounded-full
                            bg-primary
                            shadow-[0_0_10px_rgba(3,195,154,0.25)]
                          "
                        />
                      </div>

                    </div>

                    {/* Mini cards */}
                    <div className="mt-3 grid grid-cols-2 gap-2">

                      {/* Contracts */}
                      <div
                        className="
                          rounded-xl
                          border
                          border-border
                          bg-white
                          p-3
                          shadow-[0_4px_14px_rgba(26,42,63,0.05)]
                          transition-all
                          duration-500
                          hover:-translate-y-1
                          hover:border-primary/20
                        "
                      >
                        <FilePlus2
                          size={17}
                          strokeWidth={1.7}
                          className="text-primary"
                        />

                        <div className="mt-2 text-[8px] font-bold text-text-primary">
                          {locale === "ar"
                            ? "العقود"
                            : "Contracts"}
                        </div>
                      </div>

                      {/* Verification */}
                      <div
                        className="
                          rounded-xl
                          border
                          border-border
                          bg-white
                          p-3
                          shadow-[0_4px_14px_rgba(26,42,63,0.05)]
                          transition-all
                          duration-500
                          hover:-translate-y-1
                          hover:border-primary/20
                        "
                      >
                        <ShieldCheck
                          size={17}
                          strokeWidth={1.7}
                          className="text-primary"
                        />

                        <div className="mt-2 text-[8px] font-bold text-text-primary">
                          {locale === "ar"
                            ? "التحقق"
                            : "Verification"}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Bottom navigation */}
                  <div
                    className="
                      mt-auto
                      flex
                      h-14
                      items-center
                      justify-around
                      border-t
                      border-border
                      bg-white
                    "
                  >
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(3,195,154,0.45)]" />
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                  </div>

                </div>
              </div>

              {/* Floating green dot */}
              <div
                className="
                  absolute
                  right-[18%]
                  top-[18%]
                  h-3
                  w-3
                  rounded-full
                  bg-primary
                  shadow-[0_0_18px_rgba(3,195,154,0.55)]
                  ejari-pulse
                "
              />

              {/* Floating small dot */}
              <div
                className="
                  absolute
                  bottom-[24%]
                  left-[18%]
                  h-2
                  w-2
                  rounded-full
                  bg-primary/50
                  ejari-pulse
                "
                style={{
                  animationDelay: "1.2s",
                }}
              />

            </div>
          </div>

          {/* =================================================
              CONTENT
          ================================================= */}

          <div
            className="
              order-1
              text-center
              lg:order-2
              lg:text-right
              ejari-fade-up
            "
          >

            {/* Badge */}
            <div
              className="
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-primary/10
                bg-primary/5
                px-4
                py-2
                text-xs
                font-bold
                text-primary
                transition-all
                duration-300
                hover:border-primary/20
                hover:bg-primary/10
              "
            >
              <CheckCircle2
                size={15}
                strokeWidth={1.8}
              />

              {t("hero.badge")}
            </div>

            {/* Title */}
            <h1
              className="
                text-4xl
                font-extrabold
                leading-[1.25]
                tracking-tight
                text-text-primary
                sm:text-5xl
                lg:text-[56px]
              "
            >
              {t("hero.title")}

              <br />

              <span
                className="
                  text-primary
                  drop-shadow-[0_4px_15px_rgba(3,195,154,0.10)]
                "
              >
                {t("hero.highlight")}
              </span>
            </h1>

            {/* Description */}
            <p
              className="
                mx-auto
                mt-6
                max-w-[600px]
                text-base
                leading-8
                text-text-secondary
                lg:mx-0
                lg:text-lg
              "
            >
              {t("hero.subtitle")}
            </p>

            {/* =================================================
                SEARCH
            ================================================= */}

            <div
              className="
                mt-8
                rounded-xl
                border
                border-border
                bg-white
                p-2
                shadow-[0_8px_30px_rgba(26,42,63,0.08)]
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:border-primary/20
                hover:shadow-[0_14px_35px_rgba(3,195,154,0.10)]
              "
            >

              <div className="flex items-center gap-3">

                {/* Search button */}
                <button
                  type="button"
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-primary
                    text-white
                    shadow-[0_5px_15px_rgba(3,195,154,0.16)]
                    transition-all
                    duration-300
                    hover:scale-105
                    hover:bg-primary-dark
                    hover:shadow-[0_7px_20px_rgba(3,195,154,0.25)]
                  "
                  aria-label={t("hero.searchPlaceholder")}
                >
                  <Search
                    size={21}
                    strokeWidth={1.8}
                  />
                </button>

                {/* Search text */}
                <div className="min-w-0 flex-1 text-right">

                  <div
                    className="
                      text-sm
                      font-semibold
                      text-text-secondary
                    "
                  >
                    {t("hero.searchPlaceholder")}
                  </div>

                  <div
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-text-muted
                    "
                  >
                    {t("hero.searchHint")}
                  </div>

                </div>

              </div>
            </div>

            {/* =================================================
                HERO ACTIONS
            ================================================= */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              {/* New Contract */}
              <button
                type="button"
                className="
                  group
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-border
                  bg-white
                  p-4
                  text-right
                  shadow-[0_4px_15px_rgba(26,42,63,0.05)]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-primary/25
                  hover:shadow-[0_12px_25px_rgba(3,195,154,0.10)]
                "
              >

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-primary
                    text-white
                    shadow-[0_5px_15px_rgba(3,195,154,0.15)]
                    transition-all
                    duration-300
                    group-hover:scale-105
                    group-hover:bg-primary-dark
                  "
                >
                  <FilePlus2
                    size={22}
                    strokeWidth={1.7}
                  />
                </div>

                <div className="flex-1 px-4">

                  <div
                    className="
                      text-sm
                      font-extrabold
                      text-text-primary
                      transition-colors
                      group-hover:text-primary
                    "
                  >
                    {t("hero.newContract")}
                  </div>

                  <div className="mt-1 text-xs text-text-muted">
                    {t("hero.newContractDesc")}
                  </div>

                </div>

              </button>

              {/* Verify Contract */}
              <button
                type="button"
                className="
                  group
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-border
                  bg-white
                  p-4
                  text-right
                  shadow-[0_4px_15px_rgba(26,42,63,0.05)]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-primary/25
                  hover:shadow-[0_12px_25px_rgba(3,195,154,0.10)]
                "
              >

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-primary/25
                    bg-primary/5
                    text-primary
                    transition-all
                    duration-300
                    group-hover:scale-105
                    group-hover:bg-primary
                    group-hover:text-white
                  "
                >
                  <ShieldCheck
                    size={22}
                    strokeWidth={1.7}
                  />
                </div>

                <div className="flex-1 px-4">

                  <div
                    className="
                      text-sm
                      font-extrabold
                      text-text-primary
                      transition-colors
                      group-hover:text-primary
                    "
                  >
                    {t("hero.verifyContract")}
                  </div>

                  <div className="mt-1 text-xs text-text-muted">
                    {t("hero.verifyContractDesc")}
                  </div>

                </div>

              </button>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}