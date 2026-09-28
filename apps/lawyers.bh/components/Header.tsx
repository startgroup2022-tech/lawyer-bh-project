"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, MapPin, Menu, X, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import SosCta from "@/components/SosCta";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Header() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const tNav = useTranslations("nav");
  const tSite = useTranslations("site");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

const navItems: {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}[] = [
  { label: tNav("home"), href: "/" },
  { label: tNav("directory"), href: "/directory" },
  { label: tNav("legalTools"), href: "/#legal-tools" },
  { label: tNav("about"), href: "/about" },
  { label: tNav("faq"), href: "/faq" },
  { label: tNav("joinPlatform"), href: "/join" },
  { label: tNav("contactUs"), href: "#contact" },
];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const otherLocale = isAr ? "en" : "ar";

  return (
    <>
      {/* Top contact bar */}
      <div className="hide-in-app bg-bg-dark text-white/75 text-[13px] hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-7">
            <a href="tel:+97317537070" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone size={14} /> <span dir="ltr">{tSite("phone")}</span>
            </a>
            <a href="mailto:info@lawyers.bh" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail size={14} /> <span>{tSite("email")}</span>
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={14} /> <span>{tSite("location")}</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://instagram.com/lawyers.bh" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <InstagramIcon size={16} />
            </a>
            <Link
              href={pathname}
              locale={otherLocale}
              className="flex items-center gap-1.5 hover:text-white transition-colors border-s border-white/20 ps-5"
            >
              <Globe size={14} />
              <span>{tSite("langSwitch")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
<header
  id="main-header"
  className={`hide-in-app sticky top-0 z-50 transition-all duration-300 ${
    scrolled
      ? "bg-white/25 backdrop-blur-md shadow-md"
      : "bg-white/25 shadow-none"
  }`}
>
        <div className=" mx-auto px-6">
          <div className="flex items-center justify-between h-[88px] lg:h-[104px]">
            <Link href="/" className="flex-shrink-0">
<Image
    src={isAr ? "/images/logo-full-ar.png" : "/images/logo-full-en.png"}
  alt={isAr ? "محامون البحرين" : "Lawyers Bahrain"}
  width={360}
  height={99}
  sizes="(min-width: 1024px) 320px, 220px"
  className="h-16 w-auto lg:h-20 object-contain"
  priority
/>            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => item.children && setActiveDropdown(item.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 px-3 py-2 text-[18px] font-semibold text-text-secondary hover:text-primary transition-colors"
                  >
                    {item.label}
                    {item.children && <ChevronDown size={12} className="opacity-50" />}
                  </Link>
                  <AnimatePresence>
                    {item.children && activeDropdown === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full ${isAr ? "right-0" : "left-0"} mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden`}
                      >
                        {item.children.map((child) => (
                          <Link key={child.label} href={child.href} className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-primary hover:text-white transition-colors">
                            {child.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden md:inline-flex items-center px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors">
                {isAr ? "تسجيل الدخول" : "Login"}
              </Link>
              <Link
                href={pathname}
                locale={otherLocale}
                className="lg:hidden text-sm text-text-secondary font-medium"
              >
                {tSite("langSwitch")}
              </Link>
              <button className="lg:hidden p-2" onClick={() => setMobileOpen(true)}>
                <Menu size={22} className="text-text-primary" />
              </button>
            </div>
          </div>
        </div>
        <div className={`h-[2px] bg-primary transition-opacity ${scrolled ? "opacity-100" : "opacity-0"}`} />
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className={`fixed top-0 ${isAr ? "left-0" : "right-0"} bottom-0 w-80 max-w-[85vw] bg-white z-50 lg:hidden overflow-y-auto`}
              initial={{ x: isAr ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isAr ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <Image src="/images/logo-full.png" alt="Lawyers.bh" width={28} height={28} className="h-7 w-auto" />
                  <button onClick={() => setMobileOpen(false)} className="p-2"><X size={22} /></button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <div key={item.label}>
                      <Link href={item.href} className="block px-3 py-2.5 font-semibold text-text-primary hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>
                        {item.label}
                      </Link>
                      {item.children && (
                        <div className={`${isAr ? "mr-4 border-r-2 pr-3" : "ml-4 border-l-2 pl-3"} border-gray-200 space-y-0.5`}>
                          {item.children.map((child) => (
                            <Link key={child.label} href={child.href} className="block px-2 py-1.5 text-sm text-text-muted hover:text-primary" onClick={() => setMobileOpen(false)}>
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
                <Link href="/login" className="block w-full text-center mt-8 px-5 py-3 bg-primary text-white font-bold rounded-lg" onClick={() => setMobileOpen(false)}>
                  {isAr ? "تسجيل الدخول" : "Login"}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
