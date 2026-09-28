import {
  Building2,
  FileCheck2,
  Users,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
};

export default async function Stats({ locale }: Props) {
  const t = await getTranslations({ locale });

  const stats = [
    {
      value: "25K+",
      label: "properties",
      icon: Building2,
    },
    {
      value: "80K+",
      label: "contracts",
      icon: FileCheck2,
    },
    {
      value: "40K+",
      label: "users",
      icon: Users,
    },
    {
      value: "150K+",
      label: "transactions",
      icon: ArrowLeftRight,
    },
  ] as const;

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="ejari-container">

        {/* ===================================================== */}
        {/* MAIN STATS CARD                                       */}
        {/* ===================================================== */}

        <div
          className="
            group relative overflow-hidden
            rounded-[24px]
            border border-[#03C39A]/30
            bg-[#1A2A3F]
            px-6 py-9
            text-white
            shadow-[0_20px_60px_rgba(26,42,63,0.20)]
            sm:px-10
            lg:px-12 lg:py-11
          "
        >

          {/* =================================================== */}
          {/* BACKGROUND                                          */}
          {/* =================================================== */}

          {/* Subtle grid */}
          <div
            className="
              pointer-events-none absolute inset-0
              opacity-[0.025]
              [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)]
              [background-size:45px_45px]
            "
          />

          {/* Organic dot pattern */}
          <div
            className="
              pointer-events-none absolute inset-0
              opacity-[0.025]
              [background-image:radial-gradient(circle_at_20%_30%,white_1px,transparent_1px),radial-gradient(circle_at_70%_60%,white_1px,transparent_1px)]
              [background-size:70px_70px]
            "
          />

          {/* Top turquoise glow */}
          <div
            className="
              pointer-events-none absolute
              -right-40 -top-40
              h-[420px] w-[420px]
              rounded-full
              bg-[#03C39A]/10
              blur-[100px]
              transition-transform duration-[1500ms]
              group-hover:scale-125
            "
          />

          {/* Bottom turquoise glow */}
          <div
            className="
              pointer-events-none absolute
              -bottom-40 -left-40
              h-[360px] w-[360px]
              rounded-full
              bg-[#029A7A]/10
              blur-[90px]
            "
          />

          {/* =================================================== */}
          {/* CONTENT                                             */}
          {/* =================================================== */}

          <div className="relative z-10">

            {/* ================================================= */}
            {/* HEADER                                            */}
            {/* ================================================= */}

            <div className="mb-9 text-center">

              {/* Label */}
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-white/10
                  bg-white/[0.05]
                  px-4 py-2
                  text-xs font-bold
                  text-white/70
                  backdrop-blur-sm
                "
              >
                <ShieldCheck
                  size={15}
                  strokeWidth={1.7}
                  className="text-[#03C39A]"
                />

                {t("stats.label")}
              </div>

              {/* Title */}
              <h2
                className="
                  mt-4
                  text-2xl
                  font-extrabold
                  tracking-tight
                  text-white
                  sm:text-3xl
                "
              >
                {t("stats.title")}
              </h2>

              {/* Subtitle */}
              <p
                className="
                  mx-auto mt-3
                  max-w-2xl
                  text-xs
                  leading-6
                  text-white/55
                  sm:text-sm
                "
              >
                {t("stats.subtitle")}
              </p>

            </div>

            {/* ================================================= */}
            {/* MOBILE TRUST                                      */}
            {/* ================================================= */}

            <div
              className="
                mb-7
                flex items-center justify-center gap-4
                border-b border-white/10
                pb-7
                lg:hidden
              "
            >

              <div
                className="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-full
                  border border-[#03C39A]/25
                  bg-[#03C39A]/10
                "
              >
                <ShieldCheck
                  size={25}
                  strokeWidth={1.5}
                  className="text-[#03C39A]"
                />
              </div>

              <div className="text-left rtl:text-right">

                <div className="text-sm font-extrabold text-white">
                  {t("stats.trustedTitle")}
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-white/45
                  "
                >
                  {t("stats.trustedSubtitle")}
                </div>

              </div>

            </div>

            {/* ================================================= */}
            {/* DATA ROW                                          */}
            {/* ================================================= */}

            <div className="grid grid-cols-2 lg:grid-cols-5">

              {/* ================================================= */}
              {/* TRUST BLOCK                                      */}
              {/* ================================================= */}

              <div
                className="
                  hidden
                  items-center
                  justify-center
                  gap-4
                  border-r border-white/10
                  px-6
                  text-right
                  lg:flex
                  rtl:border-r-0
                  rtl:border-l
                  rtl:text-left
                "
              >

                <div
                  className="
                    flex h-14 w-14 shrink-0
                    items-center justify-center
                    rounded-full
                    border border-[#03C39A]/25
                    bg-[#03C39A]/10
                  "
                >
                  <ShieldCheck
                    size={29}
                    strokeWidth={1.5}
                    className="text-[#03C39A]"
                  />
                </div>

                <div>

                  <div className="text-sm font-extrabold text-white">
                    {t("stats.trustedTitle")}
                  </div>

                  <div
                    className="
                      mt-1
                      max-w-[145px]
                      text-xs
                      leading-5
                      text-white/45
                    "
                  >
                    {t("stats.trustedSubtitle")}
                  </div>

                </div>

              </div>

              {/* ================================================= */}
              {/* STATISTICS                                       */}
              {/* ================================================= */}

              {stats.map(({ value, label, icon: Icon }, index) => (
                <div
                  key={label}
                  className={`
                    group/stat relative
                    flex items-center
                    justify-center
                    gap-4
                    px-4 py-6
                    transition-colors duration-500
                    hover:bg-white/[0.025]
                    sm:px-6

                    ${
                      index > 0
                        ? "border-l border-white/10 rtl:border-l-0 rtl:border-r"
                        : ""
                    }

                    ${
                      index === 2 || index === 3
                        ? "max-lg:border-t max-lg:border-white/10"
                        : ""
                    }
                  `}
                >

                  {/* =========================================== */}
                  {/* LIGHT SWEEP                                  */}
                  {/* =========================================== */}

                  <div
                    className="
                      pointer-events-none absolute
                      -left-[120%] top-0
                      h-full w-[55%]
                      rotate-[12deg]
                      bg-gradient-to-r
                      from-transparent
                      via-white/[0.055]
                      to-transparent
                      transition-all
                      duration-[1000ms]
                      ease-in-out
                      group-hover/stat:left-[130%]
                    "
                  />

                  {/* =========================================== */}
                  {/* ICON                                          */}
                  {/* =========================================== */}

                  <div
                    className="
                      relative
                      flex h-14 w-14
                      shrink-0
                      items-center justify-center
                    "
                  >

                    {/* Outer ring */}
                    <div
                      className="
                        absolute inset-0
                        rounded-full
                        border border-white/10
                        transition-all duration-700
                        group-hover/stat:scale-[1.2]
                        group-hover/stat:border-[#03C39A]/35
                      "
                    />

                    {/* Inner circle */}
                    <div
                      className="
                        relative z-10
                        flex h-11 w-11
                        items-center justify-center
                        rounded-full
                        bg-white/[0.07]
                        transition-all duration-500
                        group-hover/stat:bg-[#03C39A]/10
                      "
                    >

                      <Icon
                        size={23}
                        strokeWidth={1.5}
                        className="
                          text-white/80
                          transition-all duration-500
                          group-hover/stat:text-[#03C39A]
                          group-hover/stat:scale-110
                        "
                      />

                    </div>

                  </div>

                  {/* =========================================== */}
                  {/* DATA                                          */}
                  {/* =========================================== */}

                  <div
                    className="
                      relative z-10
                      min-w-0
                      text-left
                      rtl:text-right
                    "
                  >

                    {/* Number */}
                    <div
                      className="
                        text-3xl
                        font-extrabold
                        tracking-tight
                        text-white
                        transition-all duration-500
                        group-hover/stat:text-[#03C39A]
                        sm:text-4xl
                      "
                    >
                      {value}
                    </div>

                    {/* Label */}
                    <div
                      className="
                        mt-1
                        text-[11px]
                        font-semibold
                        text-white/45
                        transition-colors duration-500
                        group-hover/stat:text-white/70
                        sm:text-xs
                      "
                    >
                      {t(`stats.${label}`)}
                    </div>

                  </div>

                  {/* =========================================== */}
                  {/* BOTTOM SIGNAL                                 */}
                  {/* =========================================== */}

                  <div
                    className="
                      pointer-events-none
                      absolute
                      bottom-0
                      left-1/2
                      h-[2px]
                      w-0
                      -translate-x-1/2
                      rounded-full
                      bg-[#03C39A]
                      shadow-[0_0_12px_rgba(3,195,154,0.55)]
                      transition-all duration-700
                      group-hover/stat:w-12
                    "
                  />

                </div>
              ))}

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}