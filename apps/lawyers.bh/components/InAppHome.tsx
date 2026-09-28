"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Landmark,
  MessageSquareQuote,
  ScrollText,
  Video,
  Handshake,
  Gavel,
  FileSignature,
  Globe,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  UsersRound,
  ShieldCheck,
  FileText,
  RotateCcw,
  Newspaper,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { governmentPartners } from "@/lib/practiceAreas";
import SosCta from "@/components/SosCta";
import LegalToolsTabs from "@/components/LegalToolsTabs";
import PartnerLogo from "@/components/PartnerLogo";

const SERVICE_CARDS: { key: string; icon: LucideIcon; image: string; href?: string }[] = [
  { key: "legal", icon: ScrollText, image: "/images/hero-1.jpg" },
  { key: "comprehensive", icon: Video, image: "/images/hero-2.jpg" },
  { key: "firms", icon: Landmark, image: "/images/hero-3.jpg", href: "/directory" },
  { key: "business", icon: Handshake, image: "/images/hero-4.jpg" },
  { key: "execution", icon: Gavel, image: "/images/hero-1.jpg" },
  { key: "notary", icon: FileSignature, image: "/images/hero-2.jpg" },
];

const QUICK_LINKS: { href: string; icon: LucideIcon; tNavKey: string }[] = [
  { href: "/directory", icon: UsersRound, tNavKey: "directory" },
  { href: "/book-appointment", icon: CalendarDays, tNavKey: "appointLawyer" },
];

export default function InAppHome() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const tServices = useTranslations("services");
  const tNav = useTranslations("nav");
  const tSite = useTranslations("site");
  const tHero = useTranslations("hero");
  const tAbout = useTranslations("about");
  const pathname = usePathname();
  const otherLocale = isAr ? "en" : "ar";
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const tClearance = useTranslations("clearance");
  const tFooter = useTranslations("footer");

  const policyLinks: { href: string; icon: LucideIcon; label: string }[] = [
    { href: "/about", icon: Info, label: tNav("about") },
    { href: "/terms", icon: FileText, label: tNav("terms") },
    { href: "/refund-policy", icon: RotateCcw, label: tFooter("refund") },
    { href: "/police-directory", icon: Newspaper, label: tNav("policeDir") },
  ];

  // We loop the data array twice to ensure seamless continuity when cycling.
  const doubledPartners = [...governmentPartners, ...governmentPartners];

  return (
    <div className="bg-bg-light min-h-screen pb-10">
      {/* Brand header */}
      <div className="in-app-safe-top relative bg-gradient-to-br from-primary-dark via-primary to-primary-dark text-white">
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25) 0, transparent 40%)",
          }}
        />
        <div className="relative px-5 pt-6 pb-8">
          <div className="flex items-center justify-between mb-7">
            <Image
              src="/images/logo-full.png"
              alt="Lawyers.bh"
              width={56}
              height={56}
              priority
              className="h-14 w-auto brightness-0 invert"
            />
            <Link
              href={pathname}
              locale={otherLocale}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-xs font-semibold backdrop-blur-sm transition-colors"
            >
              <Globe size={13} />
              {tSite("langSwitch")}
            </Link>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/65 mb-2">
            {tHero("slide1.badge")}
          </p>
          <h1 className="text-2xl font-extrabold leading-tight">
            {tHero("slide1.title")}
          </h1>
          <p className="mt-2 text-sm text-white/75 leading-relaxed">
            {tHero("slide1.subtitle")}
          </p>

          <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/85 px-2.5 py-1.5 rounded-md bg-white/10 ring-1 ring-white/15">
            <ShieldCheck size={13} />
            {tAbout("legalNotice")} {isAr ? "وزارة العدل" : "Ministry of Justice"}
          </div>
        </div>
      </div>

      {/* Legal SOS — emergency CTA pinned at the top of the iOS surface */}
      <div className="px-5 -mt-5 relative z-10 mb-3">
        <SosCta variant="panel" />
      </div>

      {/* Quick links */}
      <div className="px-5 relative z-10">
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_LINKS.map(({ href, icon: Icon, tNavKey }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white shadow-sm border border-gray-100 px-2 py-3.5 text-text-primary active:scale-[0.97] transition-transform"
            >
              <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon size={18} className="text-primary" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-center">
                {tNav(tNavKey)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Services */}
      <section className="px-5 pt-7">
        <div className="flex items-baseline justify-between mb-3.5">
          <h2 className="text-base font-extrabold text-text-primary">
            {tServices("title")}
          </h2>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">
            {tServices("label")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SERVICE_CARDS.map(({ key, icon: Icon, image, href }, i) => {
            const cardInner = (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-md active:scale-[0.97] transition-transform">
                {/* Background photo */}
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />
                {/* Brand-color overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/85 via-primary-dark/90 to-[#5a0d0d]/95" />
                {/* Content */}
                <div className="relative z-10 h-full p-4 flex flex-col items-center justify-center text-center text-white">
                  <Icon className="w-12 h-12 mb-3 stroke-[1.4] text-white drop-shadow-sm" />
                  <h3 className="text-[14px] font-extrabold leading-tight mb-1.5 drop-shadow-sm">
                    {tServices(`${key}.title`)}
                  </h3>
                  <p className="text-[11px] text-white/80 leading-snug line-clamp-2">
                    {tServices(`${key}.desc`)}
                  </p>
                </div>
              </div>
            );

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Link href={href ?? `/book-appointment?service=${key}`}>{cardInner}</Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Legal Tools — tabbed calculators live under the services grid */}
      <LegalToolsTabs />

      {/* WhatsApp CTA */}
      <section className="px-5 pt-6">
        <a
          href="https://wa.me/97336470706"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl p-4 bg-[#25D366] text-white shadow-md active:scale-[0.98] transition-transform"
        >
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageSquareQuote size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-extrabold leading-tight">
              {isAr ? "بحاجة إلى مساعدة قانونية؟" : "Need legal guidance?"}
            </div>
            <div className="text-[11px] text-white/85 leading-snug mt-0.5">
              {isAr ? "تواصل معنا الآن عبر واتساب" : "Chat with us instantly on WhatsApp"}
            </div>
          </div>
          <Chevron size={18} className="flex-shrink-0 opacity-80" />
        </a>
      </section>

{/* Government Partners — Desktop Vertical Infinite Carousel */}
<section className="pt-8 mb-4 max-w-7xl mx-auto px-4">
  <div className="flex items-baseline justify-between mb-3">
    <h2 className="text-xl font-extrabold text-text-primary leading-tight md:text-2xl">
      {tClearance("title")}
    </h2>
  </div>
  <p className="text-[14px] text-text-muted leading-relaxed mb-8 max-w-3xl">
    {tClearance("description")}
  </p>

  {/* Carousel Container: 3 Columns matching image_67a864.png layout */}
  <div 
    className="relative w-full h-[400px] overflow-hidden mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
    style={{
      maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)'
    }}
  >
    {/* Column 1 — Moves UP */}
    <div className="h-full overflow-hidden relative">
      <motion.div
        className="flex flex-col gap-6"
        animate={{ y: ["0%", "-50%"] }}
        transition={{
          ease: "linear",
          duration: 20, 
          repeat: Infinity,
        }}
      >
        {[...governmentPartners, ...governmentPartners].map((p, index) => (
          <div
            key={`desk-col1-${p.key}-${index}`}
            className="w-full flex flex-col items-center text-center gap-3 bg-white border border-gray-100 rounded-xl p-5 shadow-sm min-h-[140px] justify-center"
          >
            <div className="h-14 flex items-center justify-center">
              <PartnerLogo partner={p} size="lg" bare />
            </div>
            <p className="text-[12px] font-bold text-text-primary leading-tight mt-1">
              {isAr ? p.ar : p.en}
            </p>
            {p.acronym && (
              <span className="text-[9px] font-extrabold tracking-[0.08em] text-text-muted">
                {p.acronym}
              </span>
            )}
          </div>
        ))}
      </motion.div>
    </div>

    {/* Column 2 — Moves DOWN (Reverse) */}
    <div className="h-full overflow-hidden relative hidden sm:block">
      <motion.div
        className="flex flex-col gap-6"
        animate={{ y: ["-50%", "0%"] }}
        transition={{
          ease: "linear",
          duration: 24, 
          repeat: Infinity,
        }}
      >
        {[...governmentPartners, ...governmentPartners].map((p, index) => (
          <div
            key={`desk-col2-${p.key}-${index}`}
            className="w-full flex flex-col items-center text-center gap-3 bg-white border border-gray-100 rounded-xl p-5 shadow-sm min-h-[140px] justify-center"
          >
            <div className="h-14 flex items-center justify-center">
              <PartnerLogo partner={p} size="lg" bare />
            </div>
            <p className="text-[12px] font-bold text-text-primary leading-tight mt-1">
              {isAr ? p.ar : p.en}
            </p>
            {p.acronym && (
              <span className="text-[9px] font-extrabold tracking-[0.08em] text-text-muted">
                {p.acronym}
              </span>
            )}
          </div>
        ))}
      </motion.div>
    </div>

    {/* Column 3 — Moves UP (Slightly alternate speed) */}
    <div className="h-full overflow-hidden relative hidden md:block">
      <motion.div
        className="flex flex-col gap-6"
        animate={{ y: ["0%", "-50%"] }}
        transition={{
          ease: "linear",
          duration: 18, 
          repeat: Infinity,
        }}
      >
        {[...governmentPartners, ...governmentPartners].map((p, index) => (
          <div
            key={`desk-col3-${p.key}-${index}`}
            className="w-full flex flex-col items-center text-center gap-3 bg-white border border-gray-100 rounded-xl p-5 shadow-sm min-h-[140px] justify-center"
          >
            <div className="h-14 flex items-center justify-center">
              <PartnerLogo partner={p} size="lg" bare />
            </div>
            <p className="text-[12px] font-bold text-text-primary leading-tight mt-1">
              {isAr ? p.ar : p.en}
            </p>
            {p.acronym && (
              <span className="text-[9px] font-extrabold tracking-[0.08em] text-text-muted">
                {p.acronym}
              </span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  </div>
</section>

      {/* About / Policies */}
      <section className="px-5 pt-9">
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex flex-col items-center text-center mb-5">
            <Image
              src="/images/logo-full.png"
              alt="Lawyers.bh"
              width={64}
              height={64}
              className="h-16 w-auto mb-3"
            />
            <h3 className="text-[14px] font-extrabold text-text-primary leading-tight mb-1.5">
              {tAbout("title")}
            </h3>
            <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3">
              {tAbout("description")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {policyLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-light border border-gray-100 active:scale-[0.97] transition-transform"
              >
                <span className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-primary" />
                </span>
                <span className="text-[11px] font-semibold text-text-primary leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-text-muted">
          {tFooter("copyright")} © {new Date().getFullYear()}{" "}
          <span className="text-primary font-semibold">lawyers.bh</span> · {tFooter("allRights")}
        </p>
      </section>

    </div>
  );
}