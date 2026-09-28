// Legal SOS service catalog (mobile-local, mirrors lawyers.bh's
// canonical 5 field-dispatch types and adds Emergency Consultation
// as the remote entry-level option).
//
// Slugs match the case_type enum naming convention on the backend
// so we can sync later without renames.

import type { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";

export type CaseSlug =
  | "emergency_consultation"
  | "emergency_arrest"
  | "emergency_search"
  | "emergency_travel_ban"
  | "emergency_evidence"
  | "emergency_report"
  | "emergency_consultation";
/** Remote = phone/video consultation. Field = advocate dispatched to scene. */
export type Fulfillment = "remote" | "field";

export interface CaseType {
  slug: CaseSlug;
  fulfillment: Fulfillment;
  label: { en: string; ar: string };
  helper: { en: string; ar: string };
  /** Initial Response Fee in BHD (whole BHD, three-decimal precision allowed). */
  baseFeeBhd: number;
  /** Only set for remote consultations. */
  durationMinutes?: number;
  /** Lucide-ish icon resolved via Ionicons in screens. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Card accent colour — gold for remote, sos red for field. */
  accent: string;
  /** Bilingual one-word action label (used in dispatch + WhatsApp). */
  actionType: { en: string; ar: string };
}

export const CASE_TYPES: CaseType[] = [
  {
    slug: "emergency_consultation",
    fulfillment: "remote",
    label: {
      en: "Emergency Consultation",
      ar: "استشارة طارئة",
    },
    helper: {
      en: "A 15-minute fast legal call with an available lawyer.",
      ar: "خدمة قانونية سريعة لمدة 15 دقيقة مع محامي متاح.",
    },
    baseFeeBhd: 25,
    durationMinutes: 15,
    icon: "call-outline",
    accent: colors.gold,
    actionType: {
      en: "Phone consultation",
      ar: "استشارة هاتفية",
    },
  },
  {
    slug: "emergency_arrest",
    fulfillment: "field",
    label: {
      en: "Arrest, Detention & Investigations",
      ar: "القبض والتوقيف والتحقيقات",
    },
    helper: {
      en: "Arrest by police, detention, presence at police station or Public Prosecution.",
      ar: "القبض، التوقيف، الحضور في مراكز الشرطة أو النيابة العامة.",
    },
    baseFeeBhd: 150,
    icon: "shield-outline",
    accent: colors.sos,
    actionType: { en: "Field presence", ar: "حضور ميداني" },
  },
  {
    slug: "emergency_search",
    fulfillment: "field",
    label: {
      en: "Search & Seizure",
      ar: "تفتيش المساكن أو المقرات",
    },
    helper: {
      en: "Search of a residence, office or commercial premises.",
      ar: "تفتيش المسكن أو المكتب أو المقر التجاري.",
    },
    baseFeeBhd: 200,
    icon: "search-outline",
    accent: colors.sos,
    actionType: { en: "Field presence", ar: "حضور ميداني" },
  },
  {
    slug: "emergency_travel_ban",
    fulfillment: "field",
    label: {
      en: "Travel Ban / Precautionary Attachment",
      ar: "المنع من السفر والحجز التحفظي",
    },
    helper: {
      en: "Sudden travel ban, precautionary attachment or seizure orders.",
      ar: "إجراءات المنع من السفر والحجز التحفظي المفاجئ.",
    },
    baseFeeBhd: 300,
    icon: "airplane-outline",
    accent: colors.sos,
    actionType: { en: "Legal injunction", ar: "إجراء قضائي مستعجل" },
  },
  {
    slug: "emergency_evidence",
    fulfillment: "field",
    label: {
      en: "Urgent Evidence Preservation",
      ar: "إثبات الحالة المستعجلة",
    },
    helper: {
      en: "Damage, eviction or on-site inspection requiring immediate proof.",
      ar: "تلفيات، طرد، معاينة أضرار تستلزم إثباتاً عاجلاً.",
    },
    baseFeeBhd: 400,
    icon: "alert-circle-outline",
    accent: colors.sos,
    actionType: { en: "Site inspection", ar: "معاينة ميدانية" },
  },
  {
    slug: "emergency_report",
    fulfillment: "field",
    label: {
      en: "Urgent Criminal Report",
      ar: "البلاغات الجنائية والشكاوى العاجلة",
    },
    helper: {
      en: "Filing or following up an urgent criminal complaint or report.",
      ar: "تقديم أو متابعة بلاغ جنائي أو شكوى عاجلة.",
    },
    baseFeeBhd: 150,
    icon: "document-text-outline",
    accent: colors.sos,
    actionType: { en: "Filing & follow-up", ar: "تقديم ومتابعة" },
  },
];

export function getCaseType(slug: CaseSlug | string): CaseType | null {
  return CASE_TYPES.find((c) => c.slug === slug) ?? null;
}

export function formatFee(bhd: number): string {
  // Whole BHD if integer, else 3-decimal precision.
  return Number.isInteger(bhd) ? `BHD ${bhd}` : `BHD ${bhd.toFixed(3)}`;
}
