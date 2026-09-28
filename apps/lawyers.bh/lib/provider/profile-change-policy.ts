export const providerRoles = [
  "lawyer",
  "consultant",
  "mediator",
  "arbitrator",
  "expert",
  "private_executor",
  "private_notary",
  "translator",
] as const;

export type ProviderRole = (typeof providerRoles)[number];

export type ProviderProfileChangeValues = Partial<{
  fullNameAr: string;
  fullNameEn: string;
  subscriptionTypes: readonly ProviderRole[];
  registrationNo: string;
  registrationLevel: string | null;
  ibanNumber: string | null;
  licenseExpiryDate: string | null;
  crNumber: string | null;
}>;

const sensitiveKeys = [
  "fullNameAr",
  "fullNameEn",
  "subscriptionTypes",
  "registrationNo",
  "registrationLevel",
  "ibanNumber",
  "licenseExpiryDate",
  "crNumber",
] as const;

function normalizeRoleList(value: unknown): ProviderRole[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(providerRoles);
  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter((item): item is ProviderRole => allowed.has(item)),
    ),
  ).sort();
}

function normalizeValue(
  key: (typeof sensitiveKeys)[number],
  value: unknown,
): string | null | ProviderRole[] {
  if (key === "subscriptionTypes") return normalizeRoleList(value);
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (key === "ibanNumber") return text.replace(/\s+/g, "").toUpperCase() || null;
  return text || null;
}

function equalValue(a: unknown, b: unknown) {
  return Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
    : a === b;
}

export function diffSensitiveProfileValues(
  approved: ProviderProfileChangeValues,
  submitted: Record<string, unknown>,
): ProviderProfileChangeValues {
  const result: ProviderProfileChangeValues = {};
  const output = result as Record<string, unknown>;
  const current = approved as Record<string, unknown>;

  for (const key of sensitiveKeys) {
    if (!(key in submitted)) continue;
    const nextValue = normalizeValue(key, submitted[key]);
    const approvedValue = normalizeValue(key, current[key]);
    if (!equalValue(nextValue, approvedValue)) output[key] = nextValue;
  }

  return result;
}

export function mergePendingProfileValues(
  approved: ProviderProfileChangeValues,
  pending: ProviderProfileChangeValues,
  patch: Record<string, unknown>,
): ProviderProfileChangeValues {
  const merged = { ...pending } as Record<string, unknown>;
  const approvedRecord = approved as Record<string, unknown>;

  for (const key of sensitiveKeys) {
    if (!(key in patch)) continue;
    const nextValue = normalizeValue(key, patch[key]);
    const approvedValue = normalizeValue(key, approvedRecord[key]);
    if (equalValue(nextValue, approvedValue)) delete merged[key];
    else merged[key] = nextValue;
  }

  return merged as ProviderProfileChangeValues;
}

export function hasProfileChanges(
  values: ProviderProfileChangeValues,
  proposedFileKinds: readonly string[] = [],
) {
  return Object.keys(values).length > 0 || proposedFileKinds.length > 0;
}
