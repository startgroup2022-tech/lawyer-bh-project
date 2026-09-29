/**
 * Pure view-model helpers for the admin Appearance screen.
 *
 * Separated from the component so the clamping, labelling and payload-building
 * rules can be unit-tested without a DOM or a network.
 */
export type AppearanceCountry = {
  code: string;
  nameAr: string;
  nameEn: string;
  backgroundUrl: string | null;
  backgroundOpacity: number;
  backgroundOverlayOpacity: number;
  backgroundColor: string | null;
  tablesProvisioned: boolean;
};

/** Percentages are stored as whole numbers; the range input works in integers. */
export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function appearancePatchBody(
  country: AppearanceCountry,
  patch: Partial<Pick<AppearanceCountry, "backgroundOpacity" | "backgroundOverlayOpacity" | "backgroundColor">>,
) {
  return { code: country.code, ...patch };
}

export function backgroundStateLabel(country: AppearanceCountry, isAr: boolean) {
  if (country.backgroundUrl) return isAr ? "خلفية مخصّصة مفعّلة" : "Custom background active";
  return isAr ? "الخلفية الافتراضية" : "Default background";
}
