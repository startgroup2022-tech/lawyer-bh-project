import { Link } from "@/i18n/navigation";
import { UserRound, UserPlus} from "lucide-react";
import { getTranslations } from "next-intl/server";
import StickyHeader from "./StickyHeader";

type Props = {
  locale: string;
};

export default async function Header({ locale }: Props) {
  const t = await getTranslations({ locale });
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <StickyHeader>
      <div className="ejari-container">
        <div className="flex h-[84px] items-center justify-between gap-6">

          {/* =====================================================
              LOGO
          ===================================================== */}

          <Link
            href="/"
            className="
              flex shrink-0
              items-center
              transition-opacity duration-300
              hover:opacity-90
            "
            aria-label={t("site.brand")}
          >
            <img
              src="/images/ejariLogo.webp"
              alt={t("site.brand")}
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* =====================================================
              DESKTOP NAVIGATION
          ===================================================== */}

          <nav
            className="
              hidden
              items-center
              gap-8
              text-[14px]
              font-semibold
              lg:flex
            "
          >
            {/* Home */}

            <Link
              href="/"
              className="
                relative
                py-7
                text-primary
                transition-colors duration-300
              "
            >
              {t("nav.home")}

              <span
                className="
                  absolute
                  bottom-0
                  left-1/2
                  h-[3px]
                  w-7
                  -translate-x-1/2
                  rounded-full
                  bg-primary
                "
              />
            </Link>

            {/* Services */}

            <a
              href="#services"
              className="
                py-7
                text-text-primary
                transition-colors duration-300
                hover:text-primary
              "
            >
              {t("nav.services")}
            </a>
            {/* Owner */}

            <Link
            href="/owner"
            className="
                group
                relative
                flex
                items-center
                gap-1.5
                py-7
                text-text-primary
                transition-colors
                duration-300
                hover:text-primary
            "
            >


            <span>
                {locale === "ar" ? "المالك" : "Owner"}
            </span>

            <span
                className="
                absolute
                bottom-0
                left-1/2
                h-[3px]
                w-0
                -translate-x-1/2
                rounded-full
                bg-primary
                transition-all
                duration-300
                group-hover:w-6
                "
            />
            </Link>
            {/* About */}

            <a
              href="#about"
              className="
                py-7
                text-text-primary
                transition-colors duration-300
                hover:text-primary
              "
            >
              {t("nav.about")}
            </a>

            {/* Pricing */}

            <a
              href="#pricing"
              className="
                py-7
                text-text-primary
                transition-colors duration-300
                hover:text-primary
              "
            >
              {t("nav.pricing")}
            </a>

            {/* Help */}

            <a
              href="#help"
              className="
                py-7
                text-text-primary
                transition-colors duration-300
                hover:text-primary
              "
            >
              {t("nav.help")}
            </a>
          </nav>

          {/* =====================================================
              DESKTOP ACTIONS
          ===================================================== */}

          <div className="hidden shrink-0 items-center gap-3 md:flex">

            {/* Language */}

            <Link
              href="/"
              locale={otherLocale}
              className="
                rounded-lg
                px-3 py-2
                text-sm
                font-semibold
                text-text-secondary
                transition-colors duration-300
                hover:text-primary
              "
            >
              {t("site.langSwitch")}
            </Link>

            {/* Login */}

            <button
              type="button"
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-lg
                border
                border-border
                bg-white
                px-4
                text-sm
                font-bold
                text-text-secondary
                transition-all duration-300
                hover:border-primary/30
                hover:bg-primary/5
                hover:text-primary
              "
            >
              <UserRound size={16} strokeWidth={1.8} />

              {t("nav.login")}
            </button>

            {/* Create Account */}

            <button
              type="button"
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-lg
                bg-primary
                px-5
                text-sm
                font-bold
                text-white
                shadow-[0_6px_18px_rgba(3,195,154,0.18)]
                transition-all duration-300
                hover:-translate-y-0.5
                hover:bg-primary-dark
                hover:shadow-[0_10px_25px_rgba(3,195,154,0.24)]
              "
            >
              <UserPlus size={16} strokeWidth={1.8} />

              {t("nav.createAccount")}
            </button>
          </div>

          {/* =====================================================
              MOBILE ACTIONS
          ===================================================== */}

          <div className="flex items-center gap-2 md:hidden">

            {/* Language */}

            <Link
              href="/"
              locale={otherLocale}
              className="
                px-2
                text-xs
                font-bold
                text-text-secondary
                transition-colors duration-300
                hover:text-primary
              "
            >
              {t("site.langSwitch")}
            </Link>

            <Link
                href="/owner"
                aria-label={locale === "ar" ? "المالك" : "Owner"}
                className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-border
                    bg-white
                    text-text-secondary
                    transition-all
                    duration-300
                    hover:border-primary/30
                    hover:bg-primary/5
                    hover:text-primary
                "
                >
            </Link>

            {/* Login */}

            <button
              type="button"
              aria-label={t("nav.login")}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                border
                border-border
                bg-white
                text-text-secondary
                transition-all duration-300
                hover:border-primary/30
                hover:bg-primary/5
                hover:text-primary
              "
            >
              <UserRound size={17} strokeWidth={1.8} />
            </button>

            {/* Create Account */}

            <button
              type="button"
              aria-label={t("nav.createAccount")}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-primary
                text-white
                shadow-[0_4px_12px_rgba(3,195,154,0.18)]
                transition-all duration-300
                hover:bg-primary-dark
              "
            >
              <UserPlus size={17} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </StickyHeader>
  );
}