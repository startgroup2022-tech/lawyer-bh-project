"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Scale, Shield, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import CodezyCredit from "./CodezyCredit";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const tFooter = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tSite = useTranslations("site");
  const tServices = useTranslations("services");
  const tAbout = useTranslations("about");

  // English address always used for the maps query so the result is
  // unambiguous regardless of which locale the user is on.
  const mapsAddress = "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town, Bahrain";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`;

  const contactItems = [
    { icon: Phone, title: tFooter("phone"), value: tSite("phone"), href: "tel:+97317537070", ltr: true, external: false },
    { icon: MapPin, title: tFooter("location"), value: tSite("address"), href: mapsUrl, ltr: false, external: true, multiline: true },
    { icon: InstagramIcon, title: tFooter("instagram"), value: "@lawyers.bh", href: "https://instagram.com/lawyers.bh", ltr: true, external: true },
    { icon: Mail, title: tFooter("emailLabel"), value: tSite("email"), href: "mailto:info@lawyers.bh", ltr: true, external: false },
  ];

  return (
    <footer id="contact" className="hide-in-app">
      {/* Contact strip */}
      <div className="bg-primary">
        <motion.div className="max-w-7xl mx-auto px-6 py-8" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {contactItems.map((c) => (
              <a
                key={c.title}
                href={c.href}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noopener noreferrer" : undefined}
                className="flex items-start gap-3 text-white group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/25 transition-colors">
                  <c.icon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-white/50 uppercase tracking-wider">{c.title}</div>
                  <div
                    className={`text-sm font-semibold ${c.multiline ? "leading-snug" : "truncate"}`}
                    dir={c.ltr ? "ltr" : undefined}
                  >
                    {c.value}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Main footer */}
      <div className="bg-bg-dark text-white/70">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <Image src="/images/logo-full.png" alt="Lawyers.bh" width={80} height={80} className="h-20 w-auto mb-4 brightness-0 invert" />
              <p className="text-sm leading-relaxed text-white/40 mb-4">{tFooter("description")}</p>
              <a
                href="https://service.moic.gov.bh/newefadaapi/api/Seal/Cart?url=http://lawyers.bh"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(
                    "https://service.moic.gov.bh/newefadaapi/api/Seal/Cart?url=http://lawyers.bh",
                    "_blank",
                    "height=640,width=700"
                  );
                }}
                className="w-[96px] h-[108px] rounded-md bg-white/[0.04] p-1.5 inline-flex items-center justify-center cursor-pointer hover:bg-white/[0.07] transition-colors mt-2"
                aria-label="eFada verified Commercial Registration"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://service.moic.gov.bh/newefadaapi/Images/image-r-1.png"
                  alt="eFada CR Seal"
                  className="max-w-full h-auto"
                />
              </a>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 flex items-center gap-1.5">
                <Scale size={14} className="text-primary" /> {tFooter("quickLinks")}
              </h4>
              <ul className="space-y-2.5">
  <li>
    <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
      {tNav("home")}
    </Link>
  </li>

  <li>
    <Link href="/about" className="text-sm text-white/40 hover:text-white transition-colors">
      {tNav("about")}
    </Link>
  </li>

  <li>
    <Link href="/faq" className="text-sm text-white/40 hover:text-white transition-colors">
      {tNav("faq")}
    </Link>
  </li>

  <li>
    <Link href="/careers" className="text-sm text-white/40 hover:text-white transition-colors">
      {isAr ? "الوظائف" : "Careers"}
    </Link>
  </li>

  <li><Link href="/training" className="text-sm text-white/40 hover:text-white transition-colors">{isAr ? "طلبات التدريب" : "Training applications"}</Link></li>

  <li>
    <Link href="/directory" className="text-sm text-white/40 hover:text-white transition-colors">
      {tNav("directory")}
    </Link>
  </li>

  <li>
    <Link href="/join" className="text-sm text-white/40 hover:text-white transition-colors">
      {tNav("joinPlatform")}
    </Link>
  </li>

  <li>
    <Link href="/police-directory" className="text-sm text-white/40 hover:text-white transition-colors">
      {tNav("policeDir")}
    </Link>
  </li>
</ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 flex items-center gap-1.5">
                <Shield size={14} className="text-primary" /> {tFooter("services")}
              </h4>
              <ul className="space-y-2.5">
                <li><Link href="/#services" className="text-sm text-white/40 hover:text-white transition-colors">{tServices("legal.title")}</Link></li>
                <li><Link href="/#services" className="text-sm text-white/40 hover:text-white transition-colors">{tNav("appointLawyer")}</Link></li>
                <li><Link href="/#services" className="text-sm text-white/40 hover:text-white transition-colors">{tNav("appointExpert")}</Link></li>
                <li><Link href="/#services" className="text-sm text-white/40 hover:text-white transition-colors">{tNav("mediation")}</Link></li>
                <li><Link href="/#services" className="text-sm text-white/40 hover:text-white transition-colors">{tServices("notary.title")}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-bold mb-4 flex items-center gap-1.5">
                <ExternalLink size={14} className="text-primary" /> {tFooter("legal")}
              </h4>
              <ul className="space-y-2.5">
                <li><Link href="/terms" className="text-sm text-white/40 hover:text-white transition-colors">{tFooter("terms")}</Link></li>
                <li><Link href="/refund-policy" className="text-sm text-white/40 hover:text-white transition-colors">{tFooter("refund")}</Link></li>
                <li><Link href="/terms" className="text-sm text-white/40 hover:text-white transition-colors">{tFooter("privacy")}</Link></li>
              </ul>
            </div>
          </div>

          {/* Legal notice */}
          <div className="mt-10 pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/30 leading-relaxed">
              <strong className="text-white/50">{tAbout("legalNotice")}</strong>{" "}
              {tAbout("legalNoticeText")}
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/25">
              {tFooter("copyright")} &copy; {new Date().getFullYear()}{" "}
              <span className="text-primary-light">lawyers.bh</span>. {tFooter("allRights")}
            </p>
            <CodezyCredit locale={locale} />
          </div>
        </div>
      </div>
    </footer>
  );
}
