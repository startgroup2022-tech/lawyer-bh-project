import "server-only";
import { findConsultationMethod } from "@/lib/booking/consultationMethodCatalog";
import { getActiveCountry } from "@/lib/db/country-tables";
import { getCaseTypeBySlug } from "@/lib/sos/caseTypes";
import { parseSarToHalalas } from "./pricing";

export async function resolveOriginalPrice(data: Record<string, unknown>) {
  if (data.paymentFlow === "sos") {
    const caseType = getCaseTypeBySlug(String(data.caseType ?? "").trim());
    if (!caseType) throw new Error("invalid_sos_case_type");
    return { originalFils: parseSarToHalalas(caseType.baseFee), amountBd: caseType.baseFee.toFixed(2) };
  }

  if (String(data.requestType ?? "").trim() === "lawyer_authorization") {
    return { originalFils: 1_000, amountBd: "10.00" };
  }

  const requestedCountry = String(data.countryCode ?? data.country_code ?? data.country ?? "SA").trim().toUpperCase().slice(0, 2);
  if (requestedCountry !== "SA") throw new Error("invalid_country");
  const country = await getActiveCountry("SA");
  if (!country) throw new Error("invalid_country");
  const method = String(data.consultationMethod ?? "").trim();
  if (!["online", "whatsapp", "phone", "office", "video"].includes(method)) {
    throw new Error("invalid_consultation_method");
  }
  const catalogueMethod = await findConsultationMethod(country, method as "online" | "whatsapp" | "phone" | "office" | "video");
  if (!catalogueMethod) throw new Error("invalid_consultation_method");
  return { originalFils: parseSarToHalalas(catalogueMethod.price), amountBd: catalogueMethod.price.toFixed(2) };
}
