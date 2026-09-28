export type RegistrationChannel =
  | "legalsos-web"
  | "legalsos-mobile"
  | "lawyers-bh-web";

type RegistrationCountry = {
  code: string;
  tablePrefix: string;
};

type CountryLoader<TCountry extends RegistrationCountry> = (
  code: string,
) => Promise<TCountry | null>;

export class RegistrationRoutingError extends Error {
  constructor(public readonly code: "COUNTRY_UNAVAILABLE" | "WEBSITE_BAHRAIN_ONLY" | "COUNTRY_TABLE_MISMATCH") {
    super(code.toLowerCase());
    this.name = "RegistrationRoutingError";
  }
}

export function resolveRegistrationDestination(country: RegistrationCountry) {
  const code = country.code.toUpperCase();
  const expectedPrefix = getRegistrationCountryDefinition(code)?.tablePrefix;

  if (!expectedPrefix || country.tablePrefix !== expectedPrefix) {
    throw new RegistrationRoutingError("COUNTRY_TABLE_MISMATCH");
  }

  return `${expectedPrefix}_lawyers`;
}

export async function resolveRegistrationCountry<
  TCountry extends RegistrationCountry,
>({
  formData,
  channel,
  loadCountry,
}: {
  formData: FormData;
  channel: RegistrationChannel;
  loadCountry: CountryLoader<TCountry>;
}) {
  const submittedCountryCode = String(formData.get("countryCode") ?? "")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  if (
    channel === "lawyers-bh-web" &&
    submittedCountryCode &&
    submittedCountryCode !== "BH"
  ) {
    throw new RegistrationRoutingError("WEBSITE_BAHRAIN_ONLY");
  }

  const requestedCountryCode =
    channel === "lawyers-bh-web" ? "BH" : submittedCountryCode || "BH";
  const country = await loadCountry(requestedCountryCode);

  if (!country) {
    throw new RegistrationRoutingError("COUNTRY_UNAVAILABLE");
  }

  return {
    country,
    lawyersTable: resolveRegistrationDestination(country),
  };
}
import { getRegistrationCountryDefinition } from "@/lib/countries/registration-country";
