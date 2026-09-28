import {
  BriefcaseBusiness,
  CarFront,
  Fingerprint,
  Gavel,
  Home,
  Landmark,
  Scale,
  ScrollText,
  ShieldAlert,
  Stethoscope,
  Store,
  UsersRound,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { PracticeAreaIconKey } from "@/lib/practiceAreas";
import type { SpecialtyKey } from "./types";

const specialtyLabels: Record<SpecialtyKey, { en: string; ar: string }> = {
  administrative: { en: "Administrative", ar: "إداري" },
  civil: { en: "Civil", ar: "مدني" },
  commercial: { en: "Commercial", ar: "تجاري" },
  labor: { en: "Labor", ar: "عمالي" },
  criminal: { en: "Criminal", ar: "جنائي" },
  sharia: { en: "Sharia / Family", ar: "شرعي / أسري" },
  constitutional: { en: "Constitutional", ar: "دستوري" },
  cassation: { en: "Cassation", ar: "تمييز" },
  sports: { en: "Sports", ar: "رياضي" },
};

const practiceAreaToSpecialtyMap: Partial<Record<PracticeAreaIconKey, SpecialtyKey>> = {
  family: "sharia",
  inheritance: "sharia",
  criminal: "criminal",
  civil: "civil",
  labor: "labor",
  commercial: "commercial",
  intellectual: "commercial",
  administrative: "administrative",
  committees: "administrative",
  medical: "civil",
  traffic: "civil",
  real_estate: "civil",
};

export const practiceAreaIconMap: Record<PracticeAreaIconKey, LucideIcon> = {
  family: UsersRound,
  inheritance: ScrollText,
  criminal: ShieldAlert,
  civil: Scale,
  labor: BriefcaseBusiness,
  commercial: Store,
  intellectual: Fingerprint,
  administrative: Building2,
  execution: Gavel,
  committees: Landmark,
  medical: Stethoscope,
  traffic: CarFront,
  real_estate: Home,
};

function normalizeLegalLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

export function inferSpecialtyFromServiceLabel(
  label: string | null | undefined,
  sectionTitle?: string | null,
  sectionIcon?: PracticeAreaIconKey | null,
): SpecialtyKey | null {
  const value = normalizeLegalLabel(`${label ?? ""} ${sectionTitle ?? ""}`);

  if (value.includes("دستور") || value.includes("constitutional")) return "constitutional";
  if (/(جنائي|جنايه|جريمه|جرائم|criminal|crime)/.test(value)) return "criminal";
  if (/(شرعي|احوال|اسره|اسري|طلاق|نفقه|حضان|ميراث|ارث|تركات|sharia|family|inheritance)/.test(value)) return "sharia";
  if (/(تجاري|شرك|اعمال|افلاس|سجل تجاري|علامات|ملكيه فكريه|commercial|corporate|business|intellectual)/.test(value)) return "commercial";
  if (/(عمال|عمل|موظف|labor|labour|employment)/.test(value)) return "labor";
  if (/(اداري|حكوم|بلدي|ضريب|administrative|government|tax)/.test(value)) return "administrative";
  if (/(تمييز|نقض|cassation)/.test(value)) return "cassation";
  if (/(رياضي|sports)/.test(value)) return "sports";
  if (/(مدني|عقار|تعويض|تامين|مطالب|دين|مرور|طبي|civil|real estate|compensation|insurance|traffic|medical)/.test(value)) return "civil";

  return sectionIcon ? practiceAreaToSpecialtyMap[sectionIcon] ?? null : null;
}

export function getSpecialtyLabel(key: SpecialtyKey | null, isAr: boolean) {
  if (!key) return null;
  return isAr ? specialtyLabels[key].ar : specialtyLabels[key].en;
}
