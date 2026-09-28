import {
  RefreshCw,
  FolderOpen,
  Wrench,
  House,
  CreditCard,
  FilePenLine,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

type Props = {
  locale: string;
};

export default async function Services({ locale }: Props) {
  const t = await getTranslations({ locale });
  const isAr = locale === "ar";

  const services = [
    {
      key: "renewal",
      icon: RefreshCw,
    },
    {
      key: "documents",
      icon: FolderOpen,
    },
    {
      key: "maintenance",
      icon: Wrench,
    },
    {
      key: "properties",
      icon: House,
    },
    {
      key: "payments",
      icon: CreditCard,
    },
    {
      key: "contracts",
      icon: FilePenLine,
    },
  ] as const;

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <section
      id="services"
      className="ejari-section bg-white"
    >
      <div className="ejari-container">

        {/* =====================================================
            SECTION HEADING
        ===================================================== */}

        <div className="mb-12 text-center">

          <span className="text-sm font-bold text-primary">
            {t("services.label")}
          </span>

          <h2 className="ejari-section-title mt-2">
            {t("services.title")}
          </h2>

          <div className="ejari-section-line" />

          <p className="ejari-section-subtitle mx-auto mt-4 max-w-2xl">
            {t("services.subtitle")}
          </p>

        </div>

        {/* =====================================================
            SERVICES GRID
        ===================================================== */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">

          {services.map(({ key, icon: Icon }) => (
            <a
              key={key}
              href={`#${key}`}
              className="
                group relative flex h-[255px] flex-col
                overflow-hidden rounded-2xl
                border border-[#EAEAEC]
                bg-white
                p-5
                shadow-[0_4px_20px_rgba(31,41,55,0.045)]
                transition-all duration-500 ease-out

                hover:-translate-y-2
                hover:border-primary/20
                hover:shadow-[0_18px_40px_rgba(3,195,154,0.12)]
              "
            >

              {/* =================================================
                  SOFT BACKGROUND GLOW
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -right-16
                  -top-16
                  h-36
                  w-36
                  rounded-full
                  bg-primary/0
                  blur-3xl
                  transition-all
                  duration-700
                  ease-out
                  group-hover:scale-[1.6]
                  group-hover:bg-primary/10
                "
              />

              {/* =================================================
                  TOP ACCENT
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  left-0
                  right-0
                  top-0
                  h-[2px]
                  origin-center
                  scale-x-0
                  bg-gradient-to-r
                  from-primary-light
                  via-primary
                  to-primary-light
                  transition-transform
                  duration-500
                  group-hover:scale-x-100
                "
              />

              {/* =================================================
                  ICON + ARROW
              ================================================= */}

              <div className="relative z-10 flex items-center justify-between">

                {/* Icon */}

                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#F4F7FA]
                    text-primary
                    transition-all
                    duration-500
                    ease-out

                    group-hover:rotate-[-5deg]
                    group-hover:scale-110
                    group-hover:bg-primary
                    group-hover:text-white
                    group-hover:shadow-[0_8px_20px_rgba(3,195,154,0.22)]
                  "
                >
                  <Icon
                    size={29}
                    strokeWidth={1.7}
                    className="
                      transition-transform
                      duration-500
                      group-hover:scale-110
                    "
                  />
                </div>

                {/* Hover Arrow */}

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    bg-[#F4F7FA]
                    text-primary
                    opacity-0
                    scale-75
                    transition-all
                    duration-300

                    group-hover:scale-100
                    group-hover:opacity-100
                  "
                >
                  <Arrow size={14} />
                </div>

              </div>

              {/* =================================================
                  CONTENT
              ================================================= */}

              <div
                className="
                  relative
                  z-10
                  mt-7
                  transition-transform
                  duration-500
                  ease-out
                  group-hover:-translate-y-1
                "
              >

                <h3
                  className="
                    text-base
                    font-extrabold
                    leading-6
                    text-text-primary
                    transition-colors
                    duration-300
                    group-hover:text-primary
                  "
                >
                  {t(`services.${key}.title`)}
                </h3>

                <p
                  className="
                    mt-3
                    text-xs
                    leading-6
                    text-text-muted
                    transition-colors
                    duration-300
                    group-hover:text-text-secondary
                  "
                >
                  {t(`services.${key}.desc`)}
                </p>

              </div>

              {/* =================================================
                  LEARN MORE
              ================================================= */}

              <div
                className="
                  relative
                  z-10
                  mt-auto
                  flex
                  items-center
                  justify-end
                  gap-1
                  pt-5
                  text-[11px]
                  font-bold
                  text-primary
                "
              >

                <span
                  className="
                    transition-transform
                    duration-300
                    group-hover:-translate-x-1
                  "
                >
                  {t("services.learnMore")}
                </span>

                <Arrow
                  size={13}
                  className="
                    transition-transform
                    duration-300
                    group-hover:-translate-x-1
                  "
                />

              </div>

              {/* =================================================
                  BOTTOM ACCENT
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  bottom-0
                  left-0
                  right-0
                  h-[3px]
                  origin-right
                  scale-x-0
                  bg-gradient-to-r
                  from-primary-light
                  via-primary
                  to-primary-light
                  transition-transform
                  duration-500
                  group-hover:scale-x-100
                "
              />

              {/* =================================================
                  HOVER BORDER
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  rounded-2xl
                  border
                  border-transparent
                  transition-colors
                  duration-500
                  group-hover:border-primary/10
                "
              />

            </a>
          ))}

        </div>

      </div>
    </section>
  );
}