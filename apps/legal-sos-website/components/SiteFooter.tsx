"use client";

import { EnvelopeSimple, LockKey, MapPin, Phone } from "@phosphor-icons/react";
import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/i18n";
import { LegalSosLogo } from "./LegalSosLogo";
import { useSite } from "./providers/SiteProvider";

const mapsAddress = "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town, Bahrain";
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`;
const officeAddresses: Record<Locale, string> = {
  ar: "مجمع ساريا سكوير، مبنى 1853ج، طريق 1546، مجمع 815، مدينة عيسى",
  en: "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town",
  tr: "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town",
};

export function SiteFooter({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const links = dictionary.footer.links;

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <LegalSosLogo compact />
          <h3>{dictionary.brand}</h3>
          <p className="footer-description">{dictionary.footer.description}</p>
          <a
            className="footer-efada"
            href="https://service.moic.gov.bh/newefadaapi/api/Seal/Cart?url=http://legalsos.org"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={locale === "ar" ? "إفادة" : "eFada"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://service.moic.gov.bh/newefadaapi/Images/image-r-1.png" alt="" width={84} height={96} />
          </a>
        </div>

        <div>
          <h4>{dictionary.footer.quick}</h4>
          <Link href={`/${locale}`}>{links.home}</Link>
          <Link href={`/${locale}/about`}>{links.about}</Link>
          <Link href={`/${locale}/help`}>{links.help}</Link>
          <Link href={`/${locale}/portal`}>{links.portal}</Link>
          <Link href={`/${locale}/lawyer/register`}>{links.lawyerRegister}</Link>
        </div>

        <div>
          <h4>{dictionary.footer.services}</h4>
          <Link href={`/${locale}#services`}>{links.services}</Link>
          <Link href={`/${locale}#how`}>{links.howItWorks}</Link>
          <button type="button" onClick={() => site.openSos()}>{dictionary.hero.sos}</button>
          <Link href={`/${locale}/terms`}>{links.terms}</Link>
          <Link href={`/${locale}/refund-policy`}>{links.refundPolicy}</Link>
        </div>

        <div className="footer-contact">
          <h4>{dictionary.footer.contact}</h4>
          <a className="footer-email" href="mailto:info@legalsos.org">
            <EnvelopeSimple size={17} /><bdi dir="ltr">info@legalsos.org</bdi>
          </a>
          <a className="footer-location" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <MapPin size={17} /><span>{officeAddresses[locale]}</span>
          </a>
          <a className="footer-phone" href="tel:+97332317070"><Phone size={17} /><bdi dir="ltr">+973 3231 7070</bdi></a>
        </div>
      </div>
      <div className="emergency-bar"><LockKey size={18} /><p>{dictionary.emergencyDisclaimer}</p></div>
      <div className="footer-bottom">{dictionary.footer.rights}</div>
    </footer>
  );
}
