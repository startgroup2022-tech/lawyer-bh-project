import type {
  AvailableLawyer,
  LawyerRegistrationLevel,
  ProviderSubscriptionType,
} from "./types";

export function normalizeProviderSubscriptionType(value: unknown): ProviderSubscriptionType {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const map: Record<string, ProviderSubscriptionType> = {
    lawyer: "lawyer",
    محامي: "lawyer",
    consultant: "consultant",
    مستشار: "consultant",
    mediator: "mediator",
    وسيط: "mediator",
    arbitrator: "arbitrator",
    محكم: "arbitrator",
    expert: "expert",
    خبير: "expert",
    private_executor: "private_executor",
    منفذ_خاص: "private_executor",
    private_notary: "private_notary",
    private_notary_public: "private_notary",
    private_notary_service: "private_notary",
    notary: "private_notary",
    notary_public: "private_notary",
    موثق_خاص: "private_notary",
    الموثق_الخاص: "private_notary",
    موثقين_خاصين: "private_notary",
    الموثقين_الخاصين: "private_notary",
    كاتب_العدل_الخاص: "private_notary",
    كاتب_عدل_خاص: "private_notary",
    خاص_كاتب_العدل: "private_notary",
    translator: "translator",
    مترجم: "translator",
  };

  return map[raw] ?? "lawyer";
}

export function getProviderTitle(lawyer: AvailableLawyer, isAr: boolean) {
  const type = normalizeProviderSubscriptionType(lawyer.subscriptionType);

  const labels: Record<ProviderSubscriptionType, { ar: string; en: string }> = {
    lawyer: { ar: "المحامي", en: "Lawyer" },
    consultant: { ar: "المستشار", en: "Consultant" },
    mediator: { ar: "الوسيط", en: "Mediator" },
    arbitrator: { ar: "المحكم", en: "Arbitrator" },
    expert: { ar: "الخبير", en: "Expert" },
    private_executor: { ar: "المنفذ الخاص", en: "Private Executor" },
    private_notary: { ar: "الموثق الخاص", en: "Private Notary" },
    translator: { ar: "المترجم", en: "Translator" },
  };

  return isAr ? labels[type].ar : labels[type].en;
}

export function getProviderDisplayName(lawyer: AvailableLawyer, isAr: boolean) {
  const name = (isAr ? lawyer.nameAr : lawyer.nameEn).trim();
  const title = getProviderTitle(lawyer, isAr);

  if (!name) return title;
  if (name.startsWith(title)) return name;
  return `${title} ${name}`;
}

export function getLawyerRegistrationLevel(
  lawyer: AvailableLawyer,
): Exclude<LawyerRegistrationLevel, "all"> | null {
  const value = `${lawyer.registrationLevel ?? ""} ${lawyer.subtitleAr ?? ""} ${lawyer.subtitleEn ?? ""}`
    .trim()
    .toLowerCase();

  if (value.includes("cassation") || value.includes("تمييز") || value.includes("محكمة التمييز")) return "cassation";
  if (value.includes("trainee") || value.includes("training") || value.includes("تحت التمرين") || value.includes("تحت التدريب")) return "trainee";
  if (value.includes("practicing") || value.includes("active") || value.includes("مشتغل") || value.includes("محامي مشتغل")) return "practicing";

  return null;
}

export function isPrivateExecutorProvider(lawyer: AvailableLawyer) {
  return normalizeProviderSubscriptionType(lawyer.subscriptionType) === "private_executor";
}

export function isPrivateNotaryProvider(lawyer: AvailableLawyer) {
  return normalizeProviderSubscriptionType(lawyer.subscriptionType) === "private_notary";
}

export function isProviderOfType(
  lawyer: AvailableLawyer,
  providerType: ProviderSubscriptionType | null,
) {
  if (!providerType) return true;
  return normalizeProviderSubscriptionType(lawyer.subscriptionType) === providerType;
}
