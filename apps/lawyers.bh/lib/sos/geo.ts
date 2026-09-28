import "server-only";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import type { SosCaseSlug } from "./caseTypes";
import { getOnShiftAdvocateIds } from "./shifts";
export { haversineKm } from "./distance";
import { haversineKm } from "./distance";

export interface AdvocateMatch {
  id: string;
  fullName: string;
  registrationNo: string;
  phone: string;
  email: string | null;
  distanceKm: number;
  emergencyRadiusKm: number;
  rateBhd: number | null;
  baseLocation: { lat: number; lng: number; address?: string } | null;
}

/** Finds advocates available right now (is_emergency_ready toggle is
 *  on OR they're inside a declared shift), within their own
 *  emergency_radius_km of the request location, sorted by distance.
 *  Falls back to the case-type platform baseline when an advocate
 *  hasn't customised their per-case rate. */
export async function findNearestAdvocates(
  countryCode: string,
  requestLocation: { lat: number; lng: number } | null,
  caseType: SosCaseSlug,
  baselineFeeBhd: number,
  limit = 5,
): Promise<AdvocateMatch[]> {
  if (!requestLocation) return [];

  // Pull every active advocate; we filter availability in JS so we
  // can union the `is_emergency_ready` flag with the shift schedule
  // without a complicated SQL JOIN.
  const onShiftIds = await getOnShiftAdvocateIds(countryCode);
  const rows = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      fullName: schema.bahrainLawyers.fullNameAr,
      registrationNo: schema.bahrainLawyers.registrationNo,
      phone: schema.bahrainLawyers.phone,
      email: schema.bahrainLawyers.email,
      isEmergencyReady: schema.bahrainLawyers.isEmergencyReady,
      emergencyRadiusKm: schema.bahrainLawyers.emergencyRadiusKm,
      emergencyRates: schema.bahrainLawyers.emergencyRates,
      baseLocation: schema.bahrainLawyers.baseLocation,
      isActive: schema.bahrainLawyers.isActive,
    })
    .from(schema.bahrainLawyers)
    .where(eq(schema.bahrainLawyers.countryCode, countryCode));

  const matches: AdvocateMatch[] = [];
  for (const row of rows) {
    if (!row.isActive) continue;
    const available = row.isEmergencyReady || onShiftIds.has(row.id);
    if (!available) continue;
    if (!row.baseLocation) continue;
    const distance = haversineKm(requestLocation, row.baseLocation);
    if (distance > row.emergencyRadiusKm) continue;
    const customRate =
      (row.emergencyRates as Record<string, number> | null)?.[caseType];
    matches.push({
      id: row.id,
      fullName: row.fullName,
      registrationNo: row.registrationNo,
      phone: row.phone,
      email: row.email,
      distanceKm: distance,
      emergencyRadiusKm: row.emergencyRadiusKm,
      rateBhd:
        typeof customRate === "number" && Number.isFinite(customRate)
          ? customRate
          : baselineFeeBhd,
      baseLocation: row.baseLocation,
    });
  }
  matches.sort((a, b) => a.distanceKm - b.distanceKm);
  return matches.slice(0, limit);
}
