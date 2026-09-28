// Locked Phase-1 list of Legal SOS scenarios. The Arabic side of each
// label is the canonical legal text. Pricing is in SAR.
// Tap charges support 3-decimal precision so we keep the conversion
// in cents as a separate helper).
//
// Slugs MUST match the `case_type` enum in lib/db/schema.ts.

import {
  Gavel,
  Search,
  Plane,
  ShieldAlert,
  FileWarning,
  type LucideIcon,
  MessageCircleQuestion,
  BadgeAlert,
} from "lucide-react";

export type SosCaseSlug =
  | "emergency_arrest"
  | "emergency_search"
  | "emergency_travel_ban"
  | "emergency_evidence"
  | "emergency_report"
  | "emergency_consultation";

export interface SosCaseType {
  slug: SosCaseSlug;
  /** Bilingual label, with Arabic source-of-truth. */
  label: { en: string; ar: string };
  /** Bilingual short helper line shown under the title. */
  helper: { en: string; ar: string };
  /** Initial response fee in Saudi riyals. */
  baseFee: number;
  /** Lucide icon component used on the case card. */
  icon: LucideIcon;
  /** Action category surfaced to dispatch (used in WhatsApp + email). */
  actionType: { en: string; ar: string };
}

export const SOS_CASE_TYPES: SosCaseType[] = [
  {
    slug: "emergency_arrest",
    label: {
      en: "Arrest, Detention & Investigations",
      ar: "القبض والتوقيف والتحقيقات",
    },
    helper: {
      en: "Arrest by police, detention, presence at a police station or Public Prosecution.",
      ar: "القبض، التوقيف، الحضور في مراكز الشرطة أو النيابة العامة.",
    },
    baseFee: 150,
    icon: BadgeAlert,
    actionType: { en: "Field presence", ar: "حضور ميداني" },
  },
  {
    slug: "emergency_search",
    label: {
      en: "Search & Seizure",
      ar: "تفتيش المساكن أو المقرات",
    },
    helper: {
      en: "Search of a residence, office or commercial premises.",
      ar: "تفتيش المسكن أو المكتب أو المقر التجاري.",
    },
    baseFee: 120,
    icon: Search,
    actionType: { en: "Field presence", ar: "حضور ميداني" },
  },
  {
    slug: "emergency_travel_ban",
    label: {
      en: "Travel Ban / Precautionary Attachment",
      ar: "المنع من السفر والحجز التحفظي",
    },
    helper: {
      en: "Sudden travel ban, precautionary attachment or seizure orders.",
      ar: "إجراءات المنع من السفر والحجز التحفظي المفاجئ.",
    },
    baseFee: 100,
    icon: Plane,
    actionType: { en: "Legal injunction", ar: "إجراء قضائي مستعجل" },
  },
  {
    slug: "emergency_evidence",
    label: {
      en: "Urgent Evidence Preservation",
      ar: "إثبات الحالة المستعجلة",
    },
    helper: {
      en: "Damage, eviction or on-site inspection requiring immediate proof.",
      ar: "تلفيات، طرد، معاينة أضرار تستلزم إثباتاً عاجلاً.",
    },
    baseFee: 100,
    icon: ShieldAlert,
    actionType: { en: "Site inspection", ar: "معاينة ميدانية" },
  },
  {
    slug: "emergency_report",
    label: {
      en: "Urgent Criminal Report",
      ar: "البلاغات الجنائية والشكاوى العاجلة",
    },
    helper: {
      en: "Filing or following up an urgent criminal complaint or report.",
      ar: "تقديم أو متابعة بلاغ جنائي أو شكوى عاجلة.",
    },
    baseFee: 100,
    icon: FileWarning,
    actionType: { en: "Filing & follow-up", ar: "تقديم ومتابعة" },
  },
  {
  slug: "emergency_consultation",
  label: {
    en: "Emergency Legal Consultation",
    ar: "استشارة قانونية طارئة",
  },
  helper: {
    en: "Immediate legal advice for urgent situations requiring fast guidance.",
    ar: "استشارة قانونية فورية للحالات الطارئة التي تتطلب توجيهاً سريعاً.",
  },
  baseFee: 30,
  icon: MessageCircleQuestion,
  actionType: { en: "Urgent consultation", ar: "استشارة عاجلة" },
},
];

export function getCaseTypeBySlug(slug: string): SosCaseType | undefined {
  return SOS_CASE_TYPES.find((c) => c.slug === slug);
}

/** Generate a short, human-readable case reference used in URLs and
 *  dispatch comms. Format: SOS-YYMMDD-XXXX where XXXX is alphanumeric. */
export function generateCaseRef(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SOS-${yy}${mm}${dd}-${suffix}`;
}
