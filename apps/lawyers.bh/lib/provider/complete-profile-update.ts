export type StoredFileMetadata = {
  fileName: string | null;
  mimeType: string | null;
  url: string | null;
  blobPath: string | null;
};

export const completeProfileProviderTypes = [
  "lawyer",
  "consultant",
  "mediator",
  "arbitrator",
  "expert",
  "private_executor",
  "private_notary",
  "translator",
] as const;

export type CompleteProfileProviderType =
  (typeof completeProfileProviderTypes)[number];

const providerTypes = new Set<string>(completeProfileProviderTypes);

function normalizeProviderType(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  return providerTypes.has(normalized)
    ? (normalized as CompleteProfileProviderType)
    : null;
}

export function normalizeCompleteProfileSubscriptionTypes(
  rawTypes: string,
  rawPrimaryType: string,
) {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(rawTypes);
  } catch {
    parsed = [];
  }
  const submitted = Array.isArray(parsed) ? parsed : [];
  const subscriptionTypes = Array.from(
    new Set(
      submitted
        .map(normalizeProviderType)
        .filter((value): value is CompleteProfileProviderType => Boolean(value)),
    ),
  );
  const fallback = normalizeProviderType(rawPrimaryType);
  if (subscriptionTypes.length === 0 && fallback) subscriptionTypes.push(fallback);
  return {
    subscriptionTypes,
    subscriptionType: subscriptionTypes.includes("lawyer")
      ? "lawyer"
      : (subscriptionTypes[0] ?? ""),
  };
}

export function normalizeCompleteProfileText(input: {
  subscriptionType: string;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  ibanNumber: string;
  crNumber: string;
}) {
  const subscriptionType = normalizeProviderType(input.subscriptionType);
  return {
    subscriptionType: subscriptionType ?? "",
    fullNameAr: input.fullNameAr.trim(),
    fullNameEn: input.fullNameEn.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    ibanNumber: input.ibanNumber.replace(/\s+/g, "").toUpperCase(),
    crNumber: input.crNumber.trim(),
  };
}

export function preserveOrReplaceFile(
  existing: StoredFileMetadata,
  replacement: StoredFileMetadata | null,
) {
  return replacement ?? existing;
}

export function normalizeCompleteProfileSignature(value: unknown) {
  const signature = String(value ?? "").trim();
  return /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(
    signature,
  )
    ? signature
    : "";
}
