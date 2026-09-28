import { countryCatalog } from "./catalog";

export type RegistrationCountryDefinition = {
  code: string;
  nameAr: string;
  nameEn: string;
  tablePrefix: string;
  phoneCode: string | null;
  currencyCode: string;
  defaultLocale: string;
};

type CountryDefaults = Pick<
  RegistrationCountryDefinition,
  "tablePrefix" | "phoneCode" | "currencyCode" | "defaultLocale"
>;

const countryDefaults: Readonly<Record<string, CountryDefaults>> = {
  BH: {
    tablePrefix: "bahrain",
    phoneCode: "+973",
    currencyCode: "BHD",
    defaultLocale: "ar",
  },
  SA: {
    tablePrefix: "saudi",
    phoneCode: "+966",
    currencyCode: "SAR",
    defaultLocale: "ar",
  },
  KW: {
    tablePrefix: "kuwait",
    phoneCode: "+965",
    currencyCode: "KWD",
    defaultLocale: "ar",
  },
  AE: {
    tablePrefix: "uae",
    phoneCode: "+971",
    currencyCode: "AED",
    defaultLocale: "ar",
  },
  QA: {
    tablePrefix: "qatar",
    phoneCode: "+974",
    currencyCode: "QAR",
    defaultLocale: "ar",
  },
  OM: {
    tablePrefix: "oman",
    phoneCode: "+968",
    currencyCode: "OMR",
    defaultLocale: "ar",
  },
  IQ: {
    tablePrefix: "iraq",
    phoneCode: "+964",
    currencyCode: "IQD",
    defaultLocale: "ar",
  },
  TR: {
    tablePrefix: "turkey",
    phoneCode: "+90",
    currencyCode: "TRY",
    defaultLocale: "tr",
  },
  EG: {
    tablePrefix: "egypt",
    phoneCode: "+20",
    currencyCode: "EGP",
    defaultLocale: "ar",
  },
};

function safeGeneratedPrefix(code: string) {
  const prefix = `country_${code.toLowerCase()}`;
  if (!/^[a-z][a-z0-9_]{1,15}$/.test(prefix)) {
    throw new Error("Unsafe country table prefix");
  }
  return prefix;
}

export function getRegistrationCountryDefinition(
  inputCode: string,
): RegistrationCountryDefinition | null {
  const code = inputCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;

  const country = countryCatalog.find((item) => item.code === code);
  if (!country) return null;

  const defaults = countryDefaults[code] ?? {
    tablePrefix: safeGeneratedPrefix(code),
    phoneCode: null,
    currencyCode: "USD",
    defaultLocale: "en",
  };

  return {
    code,
    nameAr: country.nameAr,
    nameEn: country.nameEn,
    ...defaults,
  };
}
