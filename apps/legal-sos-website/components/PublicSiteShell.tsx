"use client";

import type { ReactNode } from "react";

import type { CountryConfig } from "@/lib/countries";
import type { Dictionary, Locale } from "@/lib/i18n";
import { CountryGate } from "./CountryGate";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";
import { SosDialog } from "./SosDialog";
import { SiteProvider } from "./providers/SiteProvider";

type PublicSiteShellProps = {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
  withSosDialog?: boolean;
  initialCountries?: CountryConfig[];
};

export function PublicSiteShell({
  locale,
  dictionary,
  children,
  withSosDialog = false,
  initialCountries,
}: PublicSiteShellProps) {
  return (
    <SiteProvider initialCountries={initialCountries}>
      <Header locale={locale} dictionary={dictionary} />
      {children}
      <SiteFooter locale={locale} dictionary={dictionary} />
      <CountryGate locale={locale} dictionary={dictionary} />
      {withSosDialog ? <SosDialog locale={locale} dictionary={dictionary} /> : null}
    </SiteProvider>
  );
}
