export const SOS_WORKFLOWS = [
  "emergency_dispatch",
  "direct_consultation",
] as const;

export type SosWorkflow = (typeof SOS_WORKFLOWS)[number];

export type AdminSosCaseInput = {
  countryCode: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  actionTypeAr: string;
  actionTypeEn: string;
  price: string;
  currencyCode: string;
  workflowType: SosWorkflow;
  iconAssetUrl: string;
  iconStorageKey: string;
  sortOrder: number;
  isActive: boolean;
};

export class SosCaseAdminError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "SosCaseAdminError";
  }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const currencyPattern = /^[A-Z]{3}$/;

function sourceRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SosCaseAdminError("invalid_payload");
  }
  return value as Record<string, unknown>;
}

function requiredText(
  value: unknown,
  maxLength: number,
  code: string,
): string {
  if (typeof value !== "string") throw new SosCaseAdminError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new SosCaseAdminError(code);
  }
  return normalized;
}

function validIconUrl(value: unknown): string {
  const text = requiredText(value, 2048, "invalid_icon");
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") throw new Error("protocol");
    return url.toString();
  } catch {
    throw new SosCaseAdminError("invalid_icon");
  }
}

export function parseAdminSosCaseInput(value: unknown): AdminSosCaseInput {
  const source = sourceRecord(value);
  const countryCode = requiredText(
    source.countryCode,
    2,
    "invalid_country",
  ).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new SosCaseAdminError("invalid_country");
  }

  const slug = requiredText(source.slug, 64, "invalid_slug").toLowerCase();
  if (!slugPattern.test(slug)) throw new SosCaseAdminError("invalid_slug");

  const numericPrice = Number(source.price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 9999999) {
    throw new SosCaseAdminError("invalid_price");
  }
  const price = numericPrice.toFixed(3);

  const currencyCode = requiredText(
    source.currencyCode,
    3,
    "invalid_currency",
  ).toUpperCase();
  if (!currencyPattern.test(currencyCode)) {
    throw new SosCaseAdminError("invalid_currency");
  }

  if (!Number.isInteger(source.sortOrder) || Number(source.sortOrder) < 0) {
    throw new SosCaseAdminError("invalid_order");
  }
  if (!SOS_WORKFLOWS.includes(source.workflowType as SosWorkflow)) {
    throw new SosCaseAdminError("invalid_workflow");
  }
  if (typeof source.isActive !== "boolean") {
    throw new SosCaseAdminError("invalid_active_state");
  }

  const iconStorageKey = requiredText(
    source.iconStorageKey,
    256,
    "invalid_icon",
  );
  if (!/^sos-case-icons\/[0-9a-f-]+\.(?:svg|png)$/i.test(iconStorageKey)) {
    throw new SosCaseAdminError("invalid_icon");
  }

  return {
    countryCode,
    slug,
    nameAr: requiredText(source.nameAr, 160, "invalid_name"),
    nameEn: requiredText(source.nameEn, 160, "invalid_name"),
    descriptionAr: requiredText(
      source.descriptionAr,
      1000,
      "invalid_description",
    ),
    descriptionEn: requiredText(
      source.descriptionEn,
      1000,
      "invalid_description",
    ),
    actionTypeAr: requiredText(
      source.actionTypeAr,
      160,
      "invalid_action_type",
    ),
    actionTypeEn: requiredText(
      source.actionTypeEn,
      160,
      "invalid_action_type",
    ),
    price,
    currencyCode,
    workflowType: source.workflowType as SosWorkflow,
    iconAssetUrl: validIconUrl(source.iconAssetUrl),
    iconStorageKey,
    sortOrder: Number(source.sortOrder),
    isActive: source.isActive,
  };
}
