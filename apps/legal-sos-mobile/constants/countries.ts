// Supported Legal SOS markets. Bahrain is the launch country; the rest
// are reachable in the UI for early demand signals but route to a
// "coming soon" path for now.

import type { CountryCode } from "../lib/secureStore";

export interface Country {
  code: CountryCode;
  name: string;
  nameAr: string;
  flag: string;
  dialCode: string;
  /** True for markets where dispatch is live. */
  available: boolean;
}

export const COUNTRIES: Country[] = [
  {
    code: "BH",
    name: "Bahrain",
    nameAr: "البحرين",
    flag: "🇧🇭",
    dialCode: "+973",
    available: true,
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    nameAr: "الإمارات",
    flag: "🇦🇪",
    dialCode: "+971",
    available: false,
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    nameAr: "السعودية",
    flag: "🇸🇦",
    dialCode: "+966",
    available: false,
  },
  {
    code: "KW",
    name: "Kuwait",
    nameAr: "الكويت",
    flag: "🇰🇼",
    dialCode: "+965",
    available: false,
  },
  {
    code: "QA",
    name: "Qatar",
    nameAr: "قطر",
    flag: "🇶🇦",
    dialCode: "+974",
    available: false,
  },
  {
    code: "OM",
    name: "Oman",
    nameAr: "عُمان",
    flag: "🇴🇲",
    dialCode: "+968",
    available: false,
  },
];

export function getCountry(code: CountryCode | null): Country | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) ?? null;
}
