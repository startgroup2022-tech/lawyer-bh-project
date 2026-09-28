"use client";

import { Check, Crosshair, MapPin, X } from "@phosphor-icons/react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useSite } from "./providers/SiteProvider";

function countryFlag(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

export function CountryGate({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  if (!site.showCountryGate && !site.countryMenuOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="country-dialog" role="dialog" aria-modal="true" aria-labelledby="country-title">
        {!site.showCountryGate && (
          <button className="icon-button dialog-close" onClick={() => site.setCountryMenuOpen(false)} aria-label={dictionary.sos.close}>
            <X size={20} />
          </button>
        )}
        <span className="dialog-symbol"><MapPin size={28} weight="duotone" /></span>
        <h2 id="country-title">{dictionary.countryGate.title}</h2>
        <p>{dictionary.countryGate.body}</p>
        <button className="detect-button" onClick={site.requestLocation} disabled={site.locationState === "requesting"}>
          <Crosshair size={20} />
          {site.locationState === "requesting" ? dictionary.countryGate.detecting : dictionary.countryGate.detect}
        </button>
        {(site.locationState === "unavailable" || site.countriesError) && <p className="field-error" role="alert">{dictionary.countryGate.unavailable}</p>}
        <div className="country-grid" aria-label={dictionary.countryGate.manual}>
          {site.countries.map((country) => (
            <button
              key={country.code}
              onClick={() => site.setCountry(country.code)}
              aria-pressed={site.country.code === country.code}
            >
              <span className="country-flag" aria-hidden="true">{countryFlag(country.code)}</span>
              <span className="country-option-copy">
                <strong>{country.names[locale]}</strong>
                <small>{country.code} · <bdi>{country.dialCode}</bdi></small>
              </span>
              <Check className="country-option-check" size={18} weight="bold" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
