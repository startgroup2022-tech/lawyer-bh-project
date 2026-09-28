export const FIXED_SERVICE_REQUEST_AMOUNT_BHD = 10;
export const FIXED_SERVICE_REQUEST_DURATION_MINUTES = 0;

export type ServiceStageKey =
  | "legal"
  | "comprehensive"
  | "lawyer_authorization"
  | "business"
  | "execution"
  | "notary";

export type ServiceStage = {
  key: ServiceStageKey;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  requiresConsultationMethod: boolean;
  fixedAmountBhd: number | null;
  officeOnly: boolean;
  providerTypes: readonly string[];
};

export const SERVICE_STAGE_CATALOG: readonly ServiceStage[] = [
  {
    key: "legal",
    name: {
      ar: "الاستشارات القانونية",
      en: "Legal Consultations",
    },
    description: {
      ar: "استشارات قانونية متخصصة من محامين ومستشارين مرخصين في جميع مجالات القانون.",
      en: "Specialized legal consultations from licensed lawyers and consultants across all areas of law.",
    },
    requiresConsultationMethod: true,
    fixedAmountBhd: null,
    officeOnly: false,
    providerTypes: ["lawyer", "consultant"],
  },
  {
    key: "comprehensive",
    name: {
      ar: "تمثيل قانوني ورفع دعاوى",
      en: "Legal Representation & Filing Lawsuits",
    },
    description: {
      ar: "تمثيل قانوني متكامل ومتابعة للقضايا والمحاكم حضورياً أو عن بُعد.",
      en: "Full legal representation and case follow-up before courts, in person or remotely.",
    },
    requiresConsultationMethod: false,
    fixedAmountBhd: FIXED_SERVICE_REQUEST_AMOUNT_BHD,
    officeOnly: false,
    providerTypes: ["lawyer", "consultant"],
  },
  {
    key: "lawyer_authorization",
    name: {
      ar: "توكيل محامي",
      en: "Appoint a Lawyer",
    },
    description: {
      ar: "اطلب توكيل محامي لمتابعة قضيتك أو تمثيلك قانونياً.",
      en: "Appoint a lawyer to follow up on your matter or represent you legally.",
    },
    requiresConsultationMethod: false,
    fixedAmountBhd: FIXED_SERVICE_REQUEST_AMOUNT_BHD,
    officeOnly: false,
    providerTypes: ["lawyer", "consultant"],
  },
  {
    key: "business",
    name: {
      ar: "تأسيس الشركات وخدمات دعم الأعمال",
      en: "Company Formation & Business Support",
    },
    description: {
      ar: "تسجيل الشركات والعلامات التجارية ودراسات الجدوى ودعم الأعمال في البحرين.",
      en: "Company registration, trademarks, feasibility studies, and business support in Bahrain.",
    },
    requiresConsultationMethod: false,
    fixedAmountBhd: FIXED_SERVICE_REQUEST_AMOUNT_BHD,
    officeOnly: true,
    providerTypes: [],
  },
  {
    key: "execution",
    name: {
      ar: "تحصيل الديون وتنفيذ الأحكام",
      en: "Judgment Enforcement & Debt Collection",
    },
    description: {
      ar: "خدمات التنفيذ بما في ذلك الإخلاء والحجز على الممتلكات وتنفيذ الأحكام القضائية.",
      en: "Enforcement services including eviction, attachment of assets, and enforcement of judgments.",
    },
    requiresConsultationMethod: false,
    fixedAmountBhd: FIXED_SERVICE_REQUEST_AMOUNT_BHD,
    officeOnly: false,
    providerTypes: ["private_executor"],
  },
  {
    key: "notary",
    name: {
      ar: "صياغة وتوثيق العقود",
      en: "Contract Drafting & Notarization",
    },
    description: {
      ar: "التوكيلات والمعاملات العقارية وعقود الشركات والتوثيق القانوني.",
      en: "Powers of attorney, real-estate transactions, company contracts, and legal notarization.",
    },
    requiresConsultationMethod: false,
    fixedAmountBhd: FIXED_SERVICE_REQUEST_AMOUNT_BHD,
    officeOnly: false,
    providerTypes: ["private_notary"],
  },
] as const;

const SERVICE_STAGE_BY_KEY = new Map(
  SERVICE_STAGE_CATALOG.map((service) => [service.key, service]),
);

export function normalizeServiceStageKey(
  value: unknown,
): ServiceStageKey | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const aliases: Record<string, ServiceStageKey> = {
    lawyerauthorization: "lawyer_authorization",
    lawyer_authorisation: "lawyer_authorization",
  };

  const candidate = aliases[normalized] ?? normalized;

  return SERVICE_STAGE_BY_KEY.has(candidate as ServiceStageKey)
    ? (candidate as ServiceStageKey)
    : null;
}

export function getServiceStage(
  value: unknown,
): ServiceStage | null {
  const key = normalizeServiceStageKey(value);
  return key ? SERVICE_STAGE_BY_KEY.get(key) ?? null : null;
}
