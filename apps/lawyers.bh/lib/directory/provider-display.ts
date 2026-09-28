export type ProviderRole =
  | "lawyer"
  | "consultant"
  | "mediator"
  | "arbitrator"
  | "expert"
  | "private_executor"
  | "private_notary"
  | "translator";

const canonicalRoles: ProviderRole[] = [
  "lawyer", "consultant", "mediator", "arbitrator", "expert",
  "private_executor", "private_notary", "translator",
];

const aliases: Record<string, ProviderRole> = {
  lawyer: "lawyer", محامي: "lawyer",
  consultant: "consultant", مستشار: "consultant",
  mediator: "mediator", وسيط: "mediator",
  arbitrator: "arbitrator", محكم: "arbitrator",
  expert: "expert", خبير: "expert",
  private_executor: "private_executor", منفذ_خاص: "private_executor",
  private_notary: "private_notary", notary: "private_notary", موثق_خاص: "private_notary",
  translator: "translator", مترجم: "translator",
};

const labels: Record<ProviderRole, { ar: string; en: string }> = {
  lawyer: { ar: "محامي", en: "Lawyer" },
  consultant: { ar: "مستشار", en: "Consultant" },
  mediator: { ar: "وسيط", en: "Mediator" },
  arbitrator: { ar: "محكّم", en: "Arbitrator" },
  expert: { ar: "خبير", en: "Expert" },
  private_executor: { ar: "منفذ خاص", en: "Private Executor" },
  private_notary: { ar: "موثق خاص", en: "Private Notary" },
  translator: { ar: "مترجم", en: "Translator" },
};

function normalizeRole(value: unknown): ProviderRole | null {
  const key = String(value ?? "").trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  return aliases[key] ?? null;
}

export function providerRoles(provider: { subscriptionType?: unknown; subscriptionTypes?: unknown }): ProviderRole[] {
  const multiple = Array.isArray(provider.subscriptionTypes)
    ? provider.subscriptionTypes.map(normalizeRole).filter((role): role is ProviderRole => role !== null)
    : [];
  const selected = multiple.length > 0 ? multiple : [normalizeRole(provider.subscriptionType) ?? "lawyer"];
  const unique = new Set(selected);
  return canonicalRoles.filter((role) => unique.has(role));
}

export function providerRoleLabels(roles: ProviderRole[], isAr: boolean): string[] {
  return roles.map((role) => isAr ? labels[role].ar : labels[role].en);
}

export function providerMatchesCategory(
  provider: { subscriptionType?: unknown; subscriptionTypes?: unknown },
  category: ProviderRole,
): boolean {
  return providerRoles(provider).includes(category);
}

export function displayMembershipNumber(value: string | null | undefined, isAr: boolean): string {
  return value?.trim() || (isAr ? "غير متوفر" : "Not available");
}

export function displayProviderName(provider: { nameAr: string; nameEn: string }, isAr: boolean): string {
  return isAr ? provider.nameAr : provider.nameEn;
}
