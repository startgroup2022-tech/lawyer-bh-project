import { countryCatalog } from "./catalog";

export type CountryProvisionInput = {
  code: string;
  phoneCode: string;
  currencyCode: string;
  defaultLocale: "ar" | "en" | "tr";
};

export class CountryProvisionInputError extends Error {
  override name = "CountryProvisionInputError";
}

export function parseCountryProvisionInput(input: unknown): CountryProvisionInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CountryProvisionInputError("Invalid country metadata");
  }

  const value = input as Record<string, unknown>;
  const code = String(value.code ?? "").trim().toUpperCase();
  const phoneCode = String(value.phoneCode ?? "").trim();
  const currencyCode = String(value.currencyCode ?? "").trim().toUpperCase();
  const defaultLocale = String(value.defaultLocale ?? "").trim().toLowerCase();

  if (!countryCatalog.some((country) => country.code === code)) {
    throw new CountryProvisionInputError("Unknown country");
  }
  if (!/^\+[1-9][0-9]{0,6}$/.test(phoneCode)) {
    throw new CountryProvisionInputError("Invalid calling code");
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new CountryProvisionInputError("Invalid currency code");
  }
  if (!(["ar", "en", "tr"] as const).includes(defaultLocale as "ar" | "en" | "tr")) {
    throw new CountryProvisionInputError("Unsupported default locale");
  }

  return { code, phoneCode, currencyCode, defaultLocale: defaultLocale as "ar" | "en" | "tr" };
}
