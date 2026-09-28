"use client";

import { Bell, CaretDown, List, SignIn, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { LegalSosLogo } from "./LegalSosLogo";
import { useSite } from "./providers/SiteProvider";

const localeLabels: Record<Locale, string> = { ar: "العربية", en: "English", tr: "Türkçe" };

export function Header({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScrolledState = () => setIsScrolled(window.scrollY > 32);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMobileOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [mobileOpen]);

  function changeLocale(nextLocale: Locale) {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/") || `/${nextLocale}`);
  }

  return (
    <header className={isScrolled ? "site-header is-scrolled" : "site-header"}>
      <div className="container header-inner" ref={headerRef}>
        <Link href={`/${locale}`} className="brand-lockup" aria-label={dictionary.brand}>
          <LegalSosLogo compact />
          <span><strong>{dictionary.brand}</strong><small>{dictionary.tagline}</small></span>
        </Link>
        <nav className={mobileOpen ? "main-nav open" : "main-nav"} aria-label={dictionary.nav.menu}>
          <a href={`/${locale}#app-mirror`} onClick={() => setMobileOpen(false)}>{dictionary.nav.download}</a>
          <a href={`/${locale}#services`} onClick={() => setMobileOpen(false)}>{dictionary.nav.services}</a>
          <a href={`/${locale}#how`} onClick={() => setMobileOpen(false)}>{dictionary.nav.how}</a>
          <a href={`/${locale}/help`} onClick={() => setMobileOpen(false)}>{dictionary.nav.questions}</a>
          <Link href={`/${locale}/about`} onClick={() => setMobileOpen(false)}>{dictionary.nav.about}</Link>
          <Link className="lawyer-register-link" href={`/${locale}/lawyer/register`} onClick={() => setMobileOpen(false)}>{dictionary.nav.lawyerRegister}</Link>
          <Link href={`/${locale}/portal`} onClick={() => setMobileOpen(false)}>{dictionary.nav.portal}</Link>
        </nav>
        <div className="header-actions">
          <button className="notification-button" aria-label="Notifications"><Bell size={21} /></button>
          <button className="country-select" onClick={() => site.setCountryMenuOpen(true)}>
            <span className="country-code">{site.country.code}</span>
            <span>{site.country.names[locale]}</span><CaretDown size={14} />
          </button>
          <label className="language-select">
            <span className="sr-only">Language</span>
            <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
              {locales.map((item) => <option key={item} value={item}>{localeLabels[item]}</option>)}
            </select>
          </label>
          <Link className="sign-in" href={`/${locale}/portal`}><SignIn size={18} />{dictionary.nav.signIn}</Link>
          <button className="mobile-menu" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label={dictionary.nav.menu}>
            {mobileOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}
