import {
  Mail,
  Phone,
  ArrowUp,
} from "lucide-react";

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  locale: string;
};

export default async function Footer({ locale }: Props) {
  const t = await getTranslations({ locale });

  return (
    <footer className="relative overflow-hidden bg-[#1A2A3F] text-white">

      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}

      <div
        className="
          pointer-events-none absolute
          -right-40 -top-40
          h-[420px] w-[420px]
          rounded-full
          bg-[#03C39A]/10
          blur-[110px]
        "
      />

      <div
        className="
          pointer-events-none absolute
          -bottom-48 -left-40
          h-[420px] w-[420px]
          rounded-full
          bg-[#029A7A]/10
          blur-[110px]
        "
      />

      {/* Subtle grid */}
      <div
        className="
          pointer-events-none absolute inset-0
          opacity-[0.018]
          [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)]
          [background-size:50px_50px]
        "
      />

      {/* =====================================================
          MAIN FOOTER
      ===================================================== */}

      <div className="ejari-container relative z-10 py-16 lg:py-20">

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">

          {/* =================================================
              BRAND
          ================================================= */}

          <div>

            <Link
              href="/"
              className="
                inline-flex
                items-center
                transition-opacity
                duration-300
                hover:opacity-85
              "
            >
              <img
                src="/images/ejariLogo.webp"
                alt={t("site.brand")}
                className="
                  h-16
                  w-auto
                  object-contain
                "
              />
            </Link>

            <p
              className="
                mt-6
                max-w-sm
                text-sm
                leading-7
                text-white/55
              "
            >
              {t("footer.description")}
            </p>

            {/* Accent */}
            <div
              className="
                mt-6
                h-[3px]
                w-12
                rounded-full
                bg-[#03C39A]
              "
            />

          </div>


          {/* =================================================
              QUICK LINKS
          ================================================= */}

          <div>

            <h3
              className="
                text-sm
                font-extrabold
                text-white
              "
            >
              {t("footer.quickLinks")}
            </h3>

            <div
              className="
                mt-6
                flex
                flex-col
                gap-3.5
                text-sm
                text-white/50
              "
            >

              <Link
                href="/"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.home")}
              </Link>

              <a
                href="#about"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.about")}
              </a>

              <a
                href="#services"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.services")}
              </a>

              <a
                href="#help"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.faq")}
              </a>

            </div>

          </div>


          {/* =================================================
              SUPPORT / LEGAL
          ================================================= */}

          <div>

            <h3
              className="
                text-sm
                font-extrabold
                text-white
              "
            >
              {t("footer.support")}
            </h3>

            <div
              className="
                mt-6
                flex
                flex-col
                gap-3.5
                text-sm
                text-white/50
              "
            >

              <a
                href="#"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.privacy")}
              </a>

              <a
                href="#"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.terms")}
              </a>

              <a
                href="#help"
                className="
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:text-[#03C39A]
                "
              >
                {t("footer.faq")}
              </a>

            </div>

          </div>


          {/* =================================================
              CONTACT
          ================================================= */}

          <div>

            <h3
              className="
                text-sm
                font-extrabold
                text-white
              "
            >
              {t("footer.contact")}
            </h3>


            <div className="mt-6 space-y-3">


              {/* =================================================
                  PHONE 1
              ================================================= */}

              <a
                href="tel:+97317537070"
                
                className="
                  group
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.035]
                  px-4
                  py-3
                  transition-all
                  duration-300
                  hover:border-[#03C39A]/20
                  hover:bg-white/[0.06]
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#03C39A]/10
                    transition-all
                    duration-300
                    group-hover:bg-[#03C39A]/20
                  "
                >
                  <Phone
                    size={17}
                    strokeWidth={1.7}
                    className="text-[#03C39A]"
                  />
                </div>

                <div className="min-w-0">

                  <div className="text-[10px] text-white/35">
                    {locale === "ar" ? "الهاتف الأول" : "Phone"}
                  </div>

                  <span
                    dir="ltr"
                    className="
                      mt-0.5
                      block
                      text-sm
                      font-semibold
                      text-white/80
                      transition-colors
                      group-hover:text-white
                    "
                  >
                    +973 17537070
                  </span>

                </div>

              </a>


              {/* =================================================
                  PHONE 2
              ================================================= */}

              <a
                href="tel:+97317257070"
                
                className="
                  group
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.035]
                  px-4
                  py-3
                  transition-all
                  duration-300
                  hover:border-[#03C39A]/20
                  hover:bg-white/[0.06]
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#03C39A]/10
                    transition-all
                    duration-300
                    group-hover:bg-[#03C39A]/20
                  "
                >
                  <Phone
                    size={17}
                    strokeWidth={1.7}
                    className="text-[#03C39A]"
                  />
                </div>

                <div className="min-w-0">

                  <div className="text-[10px] text-white/35">
                    {locale === "ar" ? "الهاتف الثاني" : "Phone"}
                  </div>

                  <span
                    dir="ltr"
                    className="
                      mt-0.5
                      block
                      text-sm
                      font-semibold
                      text-white/80
                      transition-colors
                      group-hover:text-white
                    "
                  >
                    +973 17257070
                  </span>

                </div>

              </a>


              {/* =================================================
                  EMAIL
              ================================================= */}

              <a
                href="mailto:info@ejari.bh"
                className="
                  group
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.035]
                  px-4
                  py-3
                  transition-all
                  duration-300
                  hover:border-[#03C39A]/20
                  hover:bg-white/[0.06]
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#03C39A]/10
                    transition-all
                    duration-300
                    group-hover:bg-[#03C39A]/20
                  "
                >
                  <Mail
                    size={17}
                    strokeWidth={1.7}
                    className="text-[#03C39A]"
                  />
                </div>

                <div className="min-w-0">

                  <div className="text-[10px] text-white/35">
                    {locale === "ar"
                      ? "البريد الإلكتروني"
                      : "Email"}
                  </div>

                  <span
                    className="
                      mt-0.5
                      block
                      truncate
                      text-sm
                      font-semibold
                      text-white/80
                      transition-colors
                      group-hover:text-white
                    "
                  >
                    info@ejari.bh
                  </span>

                </div>

              </a>


              {/* =================================================
                  INSTAGRAM
              ================================================= */}

              <a
                href="https://www.instagram.com/lawyers.bh?igshid=Yzg5MTU1MDY%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.035]
                  px-4
                  py-3
                  transition-all
                  duration-300
                  hover:border-[#03C39A]/20
                  hover:bg-white/[0.06]
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#03C39A]/10
                    transition-all
                    duration-300
                    group-hover:bg-[#03C39A]/20
                  "
                >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[#03C39A]"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <circle
                  cx="17.5"
                  cy="6.5"
                  r="1"
                  fill="currentColor"
                />
              </svg>
                </div>

                <div>

                  <div className="text-[10px] text-white/35">
                    {locale === "ar"
                      ? "إنستغرام"
                      : "Instagram"}
                  </div>

                  <span
                    className="
                      mt-0.5
                      block
                      text-sm
                      font-semibold
                      text-white/80
                      transition-colors
                      group-hover:text-white
                    "
                  >
                    lawyers.bh
                  </span>

                </div>

              </a>

            </div>

          </div>

        </div>


        {/* =====================================================
            BOTTOM AREA
        ===================================================== */}

        <div
          className="
            mt-14
            border-t
            border-white/10
            pt-6
          "
        >

          <div
            className="
              flex
              flex-col
              items-center
              justify-between
              gap-4
              text-xs
              md:flex-row
            "
          >

            {/* Copyright */}

            <span className="text-white/35">
              © {new Date().getFullYear()} Ejari.bh —{" "}
              {t("footer.rights")}
            </span>


            {/* Developer */}

            <span className="text-white/35">

              {t("footer.madeBy")}{" "}

              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  font-semibold
                  text-white/65
                  transition-colors
                  duration-300
                  hover:text-[#03C39A]
                "
              >
                Codezy
              </a>

            </span>

          </div>

        </div>

      </div>


      {/* =====================================================
          BACK TO TOP
      ===================================================== */}

      <a
        href="#"
        aria-label={
          locale === "ar"
            ? "العودة إلى الأعلى"
            : "Back to top"
        }
        className="
          absolute
          bottom-6
          right-6
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-full
          border
          border-white/10
          bg-white/[0.05]
          text-white/60
          backdrop-blur-sm
          transition-all
          duration-300
          hover:-translate-y-1
          hover:border-[#03C39A]/30
          hover:bg-[#03C39A]
          hover:text-white
          md:right-8
        "
      >
        <ArrowUp size={16} />
      </a>

    </footer>
  );
}