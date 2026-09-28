import "server-only";
import { findConsultationMethod } from "@/lib/booking/consultationMethodCatalog";
import { getActiveCountry } from "@/lib/db/country-tables";
import { getCaseTypeBySlug } from "@/lib/sos/caseTypes";
import { parseBhdToFils } from "./pricing";

export async function resolveOriginalPrice(data: Record<string, unknown>) {
  if (data.paymentFlow === "sos") {
    const caseType = getCaseTypeBySlug(String(data.caseType ?? "").trim());
    if (!caseType) throw new Error("invalid_sos_case_type");
    return { originalFils: parseBhdToFils(caseType.baseFeeBhd), amountBd: caseType.baseFeeBhd.toFixed(3) };
  }

  if (String(data.requestType ?? "").trim() === "lawyer_authorization") {
    return { originalFils: 10_000, amountBd: "10.000" };
  }

  const requestedCountry = String(data.countryCode ?? data.country_code ?? data.country ?? "BH").trim().toUpperCase().slice(0, 2);
  const country = await getActiveCountry(requestedCountry || "BH");
  if (!country) throw new Error("invalid_country");
  const method = String(data.consultationMethod ?? "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(method)) {
    throw new Error("invalid_consultation_method");
  }
  const catalogueMethod = await findConsultationMethod(country, method);
  if (!catalogueMethod) throw new Error("invalid_consultation_method");
  return { originalFils: parseBhdToFils(catalogueMethod.price), amountBd: catalogueMethod.price.toFixed(3) };
}
