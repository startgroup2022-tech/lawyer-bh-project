export type EmergencyCase = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  iconKey: string;
  workflowType: string;
};

export async function loadEmergencyCases(countryCode: string, signal?: AbortSignal): Promise<EmergencyCase[]> {
  const response = await fetch(`/api/sos/case-types?countryCode=${encodeURIComponent(countryCode)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Could not load emergency cases");
  const payload = await response.json() as { ok?: boolean; cases?: unknown };
  if (payload.ok !== true || !Array.isArray(payload.cases)) {
    throw new Error("Invalid emergency cases response");
  }
  return payload.cases.filter((item): item is EmergencyCase => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<EmergencyCase>;
    return typeof candidate.id === "string" && candidate.id.length > 0 &&
      typeof candidate.nameEn === "string" && candidate.nameEn.trim().length > 0 &&
      typeof candidate.price === "number" && candidate.price > 0;
  });
}
