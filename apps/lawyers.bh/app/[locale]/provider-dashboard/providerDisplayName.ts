export function providerDisplayName(
  profile: { fullNameAr?: string | null; fullNameEn?: string | null },
  isArabic: boolean,
) {
  const primary = String(isArabic ? profile.fullNameAr ?? "" : profile.fullNameEn ?? "").trim();
  const fallback = String(isArabic ? profile.fullNameEn ?? "" : profile.fullNameAr ?? "").trim();
  return primary || fallback;
}
