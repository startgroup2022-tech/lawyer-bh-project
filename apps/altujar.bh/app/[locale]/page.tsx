import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Building2,
  FileCheck2,
  Scale,
  Rocket,
  PenTool,
  Banknote,
} from "lucide-react";
import ServiceCard from "@/components/ServiceCard";

type Props = { params: Promise<{ locale: string }> };

const SERVICE_GRADIENTS = [
  "linear-gradient(135deg, #206DBD 0%, #1A5898 100%)",
  "linear-gradient(135deg, #8988CD 0%, #6C6BBB 100%)",
  "linear-gradient(135deg, #3B8FD8 0%, #206DBD 100%)",
  "linear-gradient(135deg, #1A5898 0%, #0F1B2D 100%)",
  "linear-gradient(135deg, #6C6BBB 0%, #4A4A8F 100%)",
  "linear-gradient(135deg, #206DBD 0%, #8988CD 100%)",
];

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isAr = locale === "ar";
  const otherLocale = isAr ? "en" : "ar";

  const services = [
    { icon: FileCheck2, k: "cr" },
    { icon: Building2, k: "office" },
    { icon: Scale, k: "legal" },
    { icon: PenTool, k: "notary" },
    { icon: Banknote, k: "banking" },
    { icon: Rocket, k: "growth" },
  ] as const;

  return (
    <main>
      <header className="hide-in-app border-b border-[var(--border-color)] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold text-primary tracking-tight">
            التجار<span className="text-accent">.bh</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-text-secondary">
            <Link href="/" className="hover:text-primary">{t("nav.home")}</Link>
            <a href="#services" className="hover:text-primary">{t("nav.services")}</a>
            <a href="#contact" className="hover:text-primary">{t("nav.contact")}</a>
            <Link href="/" locale={otherLocale} className="text-text-muted hover:text-primary">
              {t("site.langSwitch")}
            </Link>
          </nav>
          <a href="#contact" className="hidden md:inline-flex items-center px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors">
            {t("cta.start")}
          </a>
        </div>
      </header>

      <section className="hide-in-app relative bg-gradient-to-br from-primary via-primary-dark to-bg-dark text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/10 rounded-md mb-5">
              {t("hero.badge")}
            </span>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.15] mb-5">
              {t("hero.title")}
            </h1>
            <p className="text-white/80 text-lg mb-7 max-w-lg">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <a href="#contact" className="inline-flex items-center px-6 py-3 bg-white text-primary font-bold rounded-lg hover:bg-white/90 transition-colors">
                {t("cta.start")}
              </a>
              <a href="#services" className="inline-flex items-center px-6 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                {t("cta.learn")}
              </a>
            </div>
          </div>
          <div className="hidden lg:flex justify-end">
            <div className="w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
          </div>
        </div>
      </section>

      <section id="services" className="py-12 lg:py-20 bg-bg-light">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="mb-8 lg:mb-10 text-center">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              {t("services.label")}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary mt-2">
              {t("services.title")}
            </h2>
            <p className="text-text-muted mt-3 max-w-2xl mx-auto text-sm sm:text-base">
              {t("services.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {services.map((s, i) => (
              <ServiceCard
                key={s.k}
                icon={s.icon}
                title={t(`services.${s.k}.title`)}
                gradient={SERVICE_GRADIENTS[i % SERVICE_GRADIENTS.length]}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-text-primary mb-3">{t("contact.title")}</h2>
          <p className="text-text-muted mb-6">{t("contact.subtitle")}</p>
          <a href="https://wa.me/97336470706" className="inline-flex items-center px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors">
            {t("cta.whatsapp")}
          </a>
        </div>
      </section>

      <footer className="hide-in-app bg-bg-dark text-white/70 py-8 text-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Altujar.bh — {t("footer.rights")}</span>
          <span>{t("footer.madeBy")} <a href="https://azinove.com" className="text-white font-semibold">Azinove</a></span>
        </div>
      </footer>
    </main>
  );
}
