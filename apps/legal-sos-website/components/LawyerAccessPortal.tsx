"use client";

import Link from "next/link";
import { Scales, UserPlus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { LawyerLoginForm } from "@/components/LawyerLoginForm";
import { LawyerRegistrationFlow } from "@/components/LawyerRegistrationFlow";
import { LawyerWebDashboard } from "@/components/LawyerWebDashboard";
import { useSite } from "@/components/providers/SiteProvider";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { LawyerSessionProfile } from "@/lib/lawyer-portal-types";

type PortalMode = "loading" | "login" | "registration" | "dashboard";

export function LawyerAccessPortal({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const [mode, setMode] = useState<PortalMode>("loading");
  const [lawyer, setLawyer] = useState<LawyerSessionProfile | null>(null);
  const hasCountry = /^[A-Z]{2}$/.test(site.country.code);

  const signedOut = useCallback(() => {
    setLawyer(null);
    setMode("login");
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/lawyer-auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as
          | { lawyer?: LawyerSessionProfile }
          | null;
        if (!active) return;
        if (response.ok && payload?.lawyer) {
          setLawyer(payload.lawyer);
          setMode("dashboard");
        } else {
          signedOut();
        }
      })
      .catch(() => { if (active) signedOut(); });
    return () => { active = false; };
  }, [signedOut]);

  function authenticated(profile: LawyerSessionProfile) {
    setLawyer(profile);
    setMode("dashboard");
  }

  return (
    <main className="portal-page">
      <section className="container portal-access-page" aria-label={dictionary.portal.gateway.lawyerTitle}>
        <Link className="portal-back-link" href={`/${locale}/portal`}>{dictionary.portal.gateway.back}</Link>
        {mode === "loading" ? <p role="status">{dictionary.portal.lawyerAuth.loading}</p> : null}
        {mode === "dashboard" && lawyer ? (
          <LawyerWebDashboard locale={locale} dictionary={dictionary} lawyer={lawyer} onSignedOut={signedOut} />
        ) : null}
        {mode === "login" ? (
          <div className="portal-access-card">
            <Scales size={38} aria-hidden="true" />
            <h1 id="lawyer-access-title">{dictionary.portal.gateway.lawyerTitle}</h1>
            <p>{dictionary.portal.gateway.lawyerDescription}</p>
            {hasCountry ? (
              <LawyerLoginForm
                key="lawyer-login"
                locale={locale}
                dictionary={dictionary}
                countries={site.countries}
                countryCode={site.country.code}
                onCountryChange={site.setCountry}
                onAuthenticated={authenticated}
              />
            ) : <p role="status">{site.countriesLoading ? dictionary.portal.loading : dictionary.portal.empty}</p>}
            <button type="button" className="ghost-button" onClick={() => setMode("registration")}>
              <UserPlus size={19} aria-hidden="true" />{dictionary.portal.gateway.lawyerRegister}
            </button>
          </div>
        ) : null}
        {mode === "registration" ? (
          <div className="lawyer-registration-portal">
            <button type="button" className="ghost-button" onClick={signedOut}>{dictionary.portal.lawyerAuth.backToLogin}</button>
            {hasCountry
              ? <LawyerRegistrationFlow countryCode={site.country.code} locale={locale} />
              : <p role="status">{site.countriesLoading ? dictionary.portal.loading : dictionary.portal.empty}</p>}
          </div>
        ) : null}
      </section>
    </main>
  );
}
