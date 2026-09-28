import "server-only";

import { requireCountryProduct } from "@/lib/countries/product-access";
import {
  buildCountryTableSet,
  type ActiveCountry,
} from "@/lib/db/country-tables";
import { KSA_COUNTRY_CODE, KSA_CURRENCY_CODE } from "./constants";

export { KSA_COUNTRY_CODE, KSA_CURRENCY_CODE } from "./constants";

export type KsaContext = {
  country: ActiveCountry & {
    code: typeof KSA_COUNTRY_CODE;
    currencyCode: typeof KSA_CURRENCY_CODE;
  };
  tables: ReturnType<typeof buildCountryTableSet>;
};

type CountryProductError = Error & { code?: string };

export async function getKsaContext(): Promise<KsaContext> {
  let country: ActiveCountry;
  try {
    country = await requireCountryProduct(KSA_COUNTRY_CODE, "lawyers");
  } catch (error) {
    if ((error as CountryProductError).code === "COUNTRY_PRODUCT_DISABLED") {
      throw new Error("KSA_LAWYERS_PLATFORM_DISABLED");
    }
    throw error;
  }

  if (
    country.code !== KSA_COUNTRY_CODE ||
    country.tablePrefix !== "saudi" ||
    country.currencyCode !== KSA_CURRENCY_CODE
  ) {
    throw new Error("KSA_COUNTRY_NOT_PROVISIONED");
  }

  return {
    country: country as KsaContext["country"],
    tables: buildCountryTableSet(country),
  };
}

export function assertKsaInputCountry(value: unknown): void {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized && normalized !== KSA_COUNTRY_CODE) {
    throw new Error("KSA_COUNTRY_REQUIRED");
  }
}
