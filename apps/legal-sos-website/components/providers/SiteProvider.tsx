"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { requestBrowserCountry } from "@/lib/countries";
import type { CountryCode, CountryConfig } from "@/lib/countries";

type LocationState = "loading" | "idle" | "requesting" | "resolved" | "manual" | "unavailable";

type SiteContextValue = {
  country: CountryConfig;
  countries: CountryConfig[];
  countriesLoading: boolean;
  countriesError: boolean;
  locationState: LocationState;
  showCountryGate: boolean;
  countryMenuOpen: boolean;
  sosOpen: boolean;
  sosSeed: string;
  sosCaseId: string;
  setCountry: (code: CountryCode) => void;
  requestLocation: () => Promise<void>;
  setShowCountryGate: (open: boolean) => void;
  setCountryMenuOpen: (open: boolean) => void;
  openSos: (seed?: string, caseId?: string) => void;
  closeSos: () => void;
};

const unavailableCountry: CountryConfig = {
  code: "--",
  names: { ar: "غير متاح", en: "Unavailable", tr: "Kullanılamıyor" },
  translations: { ar: "غير متاح", en: "Unavailable", tr: "Kullanılamıyor" },
  enabledLanguages: ["ar", "en", "tr"],
  defaultLanguage: "en",
  legalSosEnabled: false,
  currency: "",
  dialCode: "",
  bounds: null,
  backgroundUrl: null,
  servicesActive: false,
  defaultLocale: "en",
};

const SiteContext = createContext<SiteContextValue | null>(null);
const STORAGE_KEY = "legal-sos-country";

function isCountryList(value: unknown): value is CountryConfig[] {
  return Array.isArray(value) && value.every((country) => (
    country && typeof country === "object" &&
    typeof country.code === "string" && /^[A-Z]{2}$/.test(country.code) &&
    country.names && typeof country.names === "object" &&
    typeof country.names.ar === "string" && typeof country.names.en === "string" && typeof country.names.tr === "string" &&
    (country.backgroundUrl === null || (typeof country.backgroundUrl === "string" && country.backgroundUrl.startsWith("https://")))
  ));
}

export function SiteProvider({ children, initialCountries }: { children: ReactNode; initialCountries?: CountryConfig[] }) {
  const [countries, setCountries] = useState<CountryConfig[]>(initialCountries ?? []);
  const [countriesLoading, setCountriesLoading] = useState(initialCountries === undefined);
  const [countriesError, setCountriesError] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>(initialCountries?.[0]?.code ?? "--");
  const [locationState, setLocationState] = useState<LocationState>("loading");
  const [showCountryGate, setShowCountryGate] = useState(false);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosSeed, setSosSeed] = useState("");
  const [sosCaseId, setSosCaseId] = useState("");

  useEffect(() => {
    if (initialCountries !== undefined) return;
    const controller = new AbortController();
    void fetch("/api/countries", { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load countries");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("countries" in payload) || !isCountryList(payload.countries) || !payload.countries.length) {
          throw new Error("Invalid countries response");
        }
        setCountries(payload.countries);
        setCountriesError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCountries([]);
        setCountriesError(true);
        setLocationState("unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCountriesLoading(false);
      });
    return () => controller.abort();
  }, [initialCountries]);

  useEffect(() => {
    if (!countries.length) return;
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const selected = countries.find((country) => country.code === saved);
      if (selected) {
        setCountryCode(selected.code);
        setLocationState("manual");
        return;
      }

      const fallback = countries[0];
      setCountryCode(fallback.code);
      setLocationState("requesting");
      void requestBrowserCountry(countries).then((detectedCode) => {
        const detected = countries.find((country) => country.code === detectedCode) ?? fallback;
        setCountryCode(detected.code);
        window.localStorage.setItem(STORAGE_KEY, detected.code);
        setLocationState(detectedCode ? "resolved" : "unavailable");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [countries]);

  const setCountry = useCallback((code: CountryCode) => {
    if (!countries.some((country) => country.code === code)) return;
    setCountryCode(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    setLocationState("manual");
    setShowCountryGate(false);
    setCountryMenuOpen(false);
  }, [countries]);

  const requestLocation = useCallback(async () => {
    setLocationState("requesting");
    const result = await requestBrowserCountry(countries);
    if (!result) {
      setLocationState("unavailable");
      return;
    }
    setCountryCode(result);
    window.localStorage.setItem(STORAGE_KEY, result);
    setLocationState("resolved");
    setShowCountryGate(false);
  }, [countries]);

  const country = countries.find((candidate) => candidate.code === countryCode) ?? countries[0] ?? unavailableCountry;
  const value = useMemo<SiteContextValue>(() => ({
    country, countries, countriesLoading, countriesError, locationState, showCountryGate, countryMenuOpen, sosOpen, sosSeed, sosCaseId,
    setCountry, requestLocation, setShowCountryGate, setCountryMenuOpen,
    openSos: (seed = "", caseId = "") => { setSosSeed(seed); setSosCaseId(caseId); setSosOpen(true); },
    closeSos: () => { setSosOpen(false); setSosSeed(""); setSosCaseId(""); },
  }), [country, countries, countriesLoading, countriesError, locationState, showCountryGate, countryMenuOpen, sosOpen, sosSeed, sosCaseId, setCountry, requestLocation]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used inside SiteProvider");
  return value;
}
