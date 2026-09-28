"use client";

import type { Dictionary, Locale } from "@/lib/i18n";
import { useSite } from "./providers/SiteProvider";

export function Hero({ dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  return (
    <section className="hero-section">
      <div
        className="hero-image"
        aria-hidden="true"
        style={site.country.backgroundUrl ? { backgroundImage: `url("${site.country.backgroundUrl}")` } : undefined}
      />
      <div className="hero-shade" aria-hidden="true" />
      <div className="container hero-content">
        <div className="hero-copy">
          <span className="eyebrow">{dictionary.hero.eyebrow}</span>
          <h1>{dictionary.hero.title}</h1>
          <p>{dictionary.hero.body}</p>
        </div>
        <div className="sos-orb-stage">
          <span className="sos-pulse-ring sos-pulse-ring--1" aria-hidden="true" />
          <span className="sos-pulse-ring sos-pulse-ring--2" aria-hidden="true" />
          <span className="sos-pulse-ring sos-pulse-ring--3" aria-hidden="true" />
          <span className="sos-pulse-ring sos-pulse-ring--4" aria-hidden="true" />
          <button className="sos-orb" onClick={() => site.openSos()} aria-label={dictionary.hero.sos}>
            <span>SOS</span>
          </button>
        </div>
      </div>
    </section>
  );
}
