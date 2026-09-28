export function formatMembershipNumber(
  countryCode: string,
  sequenceValue: number,
): string {
  if (!Number.isSafeInteger(sequenceValue) || sequenceValue <= 0) {
    throw new Error("Invalid membership sequence value");
  }

  const normalizedCountryCode = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    throw new Error("Invalid membership country code");
  }

  return `L${normalizedCountryCode}-${String(sequenceValue).padStart(6, "0")}`;
}
