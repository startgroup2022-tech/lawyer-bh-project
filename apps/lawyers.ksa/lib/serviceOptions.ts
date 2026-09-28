export type SubOption = {
  en: string;
  ar?: string;
};

export type SubSection = {
  title: { en: string; ar?: string };
  description?: { en: string; ar?: string };
  icon?: PracticeAreaIconKey;
  options: SubOption[];
};

export type ServiceConfig =
  | { kind: "flat"; options: SubOption[] }
  | { kind: "sectioned"; sections: SubSection[] };

import {
  practiceAreaCategories,
  type PracticeAreaIconKey,
} from "@/lib/practiceAreas";  
// Per the Editing.docx (Update 5):
// - Image 5 ("Editing: Upload this entire page instead of legal advice in
//   the pop-up") tells us the OLD "Legal Advice" card — now displayed as
//   "Comprehensive Legal Services" after the Stage A rename — should show
//   the Practice Areas list (criminal/civil/commercial/etc.) inside its
//   modal instead of free-form legal advice options. We map the existing
//   `practiceAreas` list into sub-options keyed by `legal` below.
const practiceAreaSections: SubSection[] = practiceAreaCategories.map((category) => ({
  title: {
    en: category.en,
    ar: category.ar,
  },
  description: {
    en: category.descEn,
    ar: category.descAr,
  },
  icon: category.icon,
  options: category.branches.map((branch) => ({
    en: branch.en,
    ar: branch.ar,
  })),
}));

export const serviceOptionsByKey: Record<string, ServiceConfig> = {
  business: {
    kind: "flat",
    options: [
      {
        en: "Service for issuing and extending a visit visa to the Kingdom of Bahrain for businessmen and investors",
        ar: "خدمة إصدار وتمديد تأشيرة الزيارة إلى مملكة البحرين لرجال الأعمال والمستثمرين",
      },
      {
        en: "Registration of companies and commercial agencies",
        ar: "تسجيل الشركات والوكالات التجارية",
      },
      {
        en: "Registration of trademarks, designs and patents",
        ar: "تسجيل العلامات التجارية والتصاميم وبراءات الاختراع",
      },
      {
        en: "Preparing economic feasibility studies",
        ar: "إعداد دراسات الجدوى الاقتصادية",
      },
      {
        en: "Preparing, drafting and concluding contracts and agreements",
        ar: "إعداد وصياغة وإبرام العقود والاتفاقيات",
      },
      {
        en: "Property and real estate management",
        ar: "إدارة الممتلكات والعقارات",
      },
    ],
  },
  execution: {
    kind: "flat",
    options: [
      { en: "Eviction", ar: "الإخلاء" },
      { en: "Expulsion", ar: "الطرد" },
      { en: "Seizure of movable property", ar: "الحجز على المنقولات" },
      { en: "Seizure of vehicles", ar: "الحجز على المركبات" },
      { en: "Seizure of real estate", ar: "الحجز العقاري" },
      {
        en: "Removal of a wall, building, or plants",
        ar: "إزالة جدار أو بناء أو زراعة",
      },
    ],
  },
  // "Comprehensive Legal Services" card (key: legal).
  // Per Editing.docx image 5: this card's modal should show the Practice
  // Areas catalogue rather than the previous free-form legal advice
  // options. We re-use the canonical `practiceAreas` list so that the
  // categories shown here stay in sync with /practice-areas.
 legal: {
  kind: "sectioned",
  sections: practiceAreaSections,
},
  // "Legal Services & Remote/In-Person Litigation" card.
  // Stage A renamed this card from "Comprehensive Legal Services" → the
  // current label. Update 5 (per the Editing.docx) supplies the seven
  // sub-services below for this card.
  comprehensive: {
    kind: "flat",
    options: [
      {
        en: "Conflict study and evaluation — including proactive legal assessment, legal situation analysis and conflict examination.",
        ar: "دراسة النزاع وتقييمه — بما في ذلك التقييم القانوني الاستباقي وتحليل الوضع القانوني وفحص النزاع.",
      },
      {
        en: "Review of evidence and documents, with legal scrutiny before taking any action.",
        ar: "مراجعة الأدلة والمستندات مع التدقيق القانوني قبل اتخاذ أي إجراء.",
      },
      {
        en: "Preparation and drafting of memoranda and regulations, including appellate regulations and reply memoranda.",
        ar: "إعداد وصياغة المذكرات واللوائح، بما في ذلك لوائح الاستئناف ومذكرات الرد.",
      },
      {
        en: "Preparation of complaints and administrative reports, in clear and professional formulation.",
        ar: "إعداد الشكاوى والمحاضر الإدارية بصياغة واضحة ومهنية.",
      },
      {
        en: "Preparation of judicial requests according to the approved wording.",
        ar: "إعداد الطلبات القضائية وفق الصياغة المعتمدة.",
      },
      {
        en: "Preparation of legal warnings and notices in a formal and accurate manner.",
        ar: "إعداد الإنذارات والإخطارات القانونية بشكل رسمي ودقيق.",
      },
      {
        en: "Audit and legal review to ensure wording integrity and systemic consistency.",
        ar: "التدقيق والمراجعة القانونية لضمان سلامة الصياغة والاتساق النظامي.",
      },
    ],
  },
  notary: {
    kind: "sectioned",
    sections: [
      {
        title: {
          en: "Lawyer Appointments and Debt Acknowledgment Transactions",
          ar: "تعيين المحامين ومعاملات إقرار الدين",
        },
        options: [
          {
            en: "Special Power of Attorney for Lawyers",
            ar: "وكالة خاصة للمحامين",
          },
          {
            en: "Declaration of Waiver of Judgment",
            ar: "إقرار التنازل عن الحكم",
          },
          {
            en: "Declaration of Waiver of Lawsuit",
            ar: "إقرار التنازل عن الدعوى",
          },
          {
            en: "Declaration of Employee's Waiver of Rights",
            ar: "إقرار تنازل الموظف عن الحقوق",
          },
          { en: "Settlement Agreement", ar: "اتفاقية تسوية" },
          {
            en: "Declaration of Cancellation of Notarized Power of Attorney",
            ar: "إقرار إلغاء وكالة موثقة",
          },
          { en: "Declaration of Debt", ar: "إقرار بالدين" },
          { en: "Debt Agreement", ar: "اتفاقية الدين" },
          { en: "Debt Settlement Agreement", ar: "اتفاقية تسوية الدين" },
          { en: "Notarized Declaration of Release", ar: "إقرار إبراء موثق" },
        ],
      },
      {
        title: { en: "Commercial Transactions", ar: "المعاملات التجارية" },
        options: [
          {
            en: "Limited Liability Company Contract",
            ar: "عقد شركة ذات مسؤولية محدودة",
          },
          { en: "General Partnership Contract", ar: "عقد شركة تضامن" },
          { en: "Limited Partnership Contract", ar: "عقد شركة توصية بسيطة" },
          {
            en: "Silent Partnership Contract – Certification",
            ar: "عقد شركة محاصة — توثيق",
          },
          {
            en: "Public Joint Stock Company Contract",
            ar: "عقد شركة مساهمة عامة",
          },
          {
            en: "Closed Joint Stock Company Contract",
            ar: "عقد شركة مساهمة مقفلة",
          },
          {
            en: "Amendment of Articles of Association (All company types)",
            ar: "تعديل عقد التأسيس (جميع أنواع الشركات)",
          },
          {
            en: "Amendment Contracts for Non-Joint-Stock Companies (Change of legal form)",
            ar: "عقود تعديل الشركات غير المساهمة (تغيير الشكل القانوني)",
          },
          {
            en: "Amendment of Joint Stock Company Contract",
            ar: "تعديل عقد شركة المساهمة",
          },
          { en: "Share Sale Contract", ar: "عقد بيع حصص" },
          { en: "Share Transfer Declaration", ar: "إقرار نقل حصص" },
          {
            en: "Share Pledge Contract (Enforceable Format)",
            ar: "عقد رهن حصص (صيغة قابلة للتنفيذ)",
          },
          { en: "Company Cancellation Contract", ar: "عقد إلغاء شركة" },
          { en: "Commercial Shop Sale Contracts", ar: "عقود بيع محل تجاري" },
          {
            en: "Commercial Shop Transfer Declaration",
            ar: "إقرار نقل محل تجاري",
          },
          {
            en: "Commercial Shop Pledge Contract (Enforceable Format)",
            ar: "عقد رهن محل تجاري (صيغة قابلة للتنفيذ)",
          },
          {
            en: "Power of Attorney for Company Formation",
            ar: "وكالة تأسيس شركة",
          },
          {
            en: "Power of Attorney for Company Management",
            ar: "وكالة إدارة شركة",
          },
          {
            en: "Power of Attorney for Issuing and Managing an Individual Commercial Registration",
            ar: "وكالة إصدار وإدارة سجل تجاري فردي",
          },
          {
            en: "Power of Attorney for Managing a Commercial Shop",
            ar: "وكالة إدارة محل تجاري",
          },
        ],
      },
      {
        title: { en: "Real Estate Transactions", ar: "المعاملات العقارية" },
        options: [
          { en: "Certified Lease Contract", ar: "عقد إيجار موثق" },
          { en: "Real Estate Sale Contract", ar: "عقد بيع عقار" },
          {
            en: "State-Owned Corner Property Sale Contract",
            ar: "عقد بيع عقار ركني مملوك للدولة",
          },
          { en: "Certified Apartment Sale Contract", ar: "عقد بيع شقة موثق" },
          {
            en: "Real Estate Sale Contract with a Real Estate Broker",
            ar: "عقد بيع عقار عبر وسيط عقاري",
          },
          {
            en: "Power of Attorney for Selling a Property or Apartment",
            ar: "وكالة بيع عقار أو شقة",
          },
          {
            en: "Irrevocable Power of Attorney for Selling a Property or Apartment",
            ar: "وكالة بيع عقار أو شقة غير قابلة للعزل",
          },
          {
            en: "Power of Attorney for Mortgaging a Property",
            ar: "وكالة رهن عقار",
          },
          {
            en: "Declaration of Change in Property Status",
            ar: "إقرار تغيير حالة العقار",
          },
          {
            en: "Official Declaration for Releasing a Mortgage Deed",
            ar: "إقرار رسمي بفك الرهن",
          },
          {
            en: "Contract for Cancellation of a Property Sale Agreement",
            ar: "عقد إلغاء اتفاقية بيع عقار",
          },
          {
            en: "Official Contract for Releasing a Mortgage Deed",
            ar: "عقد رسمي بفك الرهن",
          },
          {
            en: "Declaration of Absence of an Active Owners' Association",
            ar: "إقرار عدم وجود اتحاد ملاك فعّال",
          },
          {
            en: "Property Partition Contract Without Adjustment",
            ar: "عقد قسمة عقار بدون تعديل",
          },
          {
            en: "Property Partition Contract With Adjustment",
            ar: "عقد قسمة عقار مع تعديل",
          },
          { en: "Property Exchange Contract", ar: "عقد مبادلة عقارية" },
          {
            en: "Participation Contract for Addition and Renovation",
            ar: "عقد مشاركة للإضافة والتجديد",
          },
          {
            en: "Declaration of Waiver of Common Areas",
            ar: "إقرار التنازل عن المرافق المشتركة",
          },
        ],
      },
      {
        title: {
          en: "Transactions for Non-Muslims",
          ar: "معاملات غير المسلمين",
        },
        options: [
          {
            en: "Marriage certificate for non-Muslims",
            ar: "عقد زواج لغير المسلمين",
          },
          {
            en: "Divorce certificate for non-Muslims",
            ar: "عقد طلاق لغير المسلمين",
          },
          {
            en: "Real estate gift deed for non-Muslims",
            ar: "عقد هبة عقارية لغير المسلمين",
          },
          {
            en: "Declaration of marriage for non-Muslims",
            ar: "إقرار زواج لغير المسلمين",
          },
          {
            en: "Power of attorney for marriage contract",
            ar: "وكالة لعقد الزواج",
          },
          { en: "Wills attested", ar: "توثيق الوصايا" },
          {
            en: "Marriage certificates issued by churches and places of worship attested to",
            ar: "توثيق عقود الزواج الصادرة عن الكنائس ودور العبادة",
          },
          {
            en: "Declaration of celibacy (for non-Muslims)",
            ar: "إقرار العزوبية (لغير المسلمين)",
          },
        ],
      },
      {
        title: {
          en: "Powers of Attorney and Notarized Contracts",
          ar: "الوكالات والعقود الموثقة",
        },
        options: [
          {
            en: "General Power of Attorney for Disposition and Management",
            ar: "وكالة عامة بالتصرف والإدارة",
          },
          {
            en: "General Power of Attorney for Disposition and Management (Related to Inheritance)",
            ar: "وكالة عامة بالتصرف والإدارة (متعلقة بالميراث)",
          },
          { en: "Power of Attorney for Selling a Ship", ar: "وكالة بيع سفينة" },
          { en: "Ship Sale Contract", ar: "عقد بيع سفينة" },
          { en: "Official Ship Mortgage Contract", ar: "عقد رهن سفينة رسمي" },
          {
            en: "Power of Attorney to Drive and Sell a Vehicle",
            ar: "وكالة قيادة وبيع مركبة",
          },
          {
            en: "Power of Attorney to Purchase a Vehicle",
            ar: "وكالة شراء مركبة",
          },
          {
            en: "Power of Attorney to Purchase Special / Unique Vehicle Plate Numbers",
            ar: "وكالة شراء أرقام لوحات مركبات مميزة",
          },
          {
            en: "Power of Attorney to Receive Payments and Dues",
            ar: "وكالة استلام مبالغ ومستحقات",
          },
          { en: "Power of Attorney for Selling Shares", ar: "وكالة بيع أسهم" },
          { en: "Share Certificate Mortgage Contract", ar: "عقد رهن شهادة أسهم" },
        ],
      },
      {
        title: {
          en: "Certified Declaration Contracts",
          ar: "عقود الإقرارات الموثقة",
        },
        options: [
          { en: "Salary certificate", ar: "شهادة راتب" },
          { en: "Certificate of qualifications", ar: "شهادة المؤهلات" },
          { en: "Declaration of unemployment", ar: "إقرار البطالة" },
          {
            en: "Declaration of no objection to transferring sponsorship of a child",
            ar: "إقرار عدم ممانعة بنقل كفالة الطفل",
          },
          { en: "Declaration of receipt of funds", ar: "إقرار استلام أموال" },
          {
            en: "Verification of translator's signature",
            ar: "التحقق من توقيع المترجم",
          },
          {
            en: "Overseas scholarship contract",
            ar: "عقد بعثة دراسية خارجية",
          },
          {
            en: "Power of attorney for university students",
            ar: "وكالة لطلاب الجامعات",
          },
          { en: "Employment contract", ar: "عقد عمل" },
          { en: "Proof of date", ar: "إثبات تاريخ" },
        ],
      },
    ],
  },
};

export function getOptionLabel(opt: SubOption, isAr: boolean): string {
  return isAr && opt.ar ? opt.ar : opt.en;
}

export function getSectionTitle(s: SubSection, isAr: boolean): string {
  return isAr && s.title.ar ? s.title.ar : s.title.en;
}

export function getSectionDescription(s: SubSection, isAr: boolean): string {
  return isAr && s.description?.ar ? s.description.ar : s.description?.en ?? "";
}


export function slugFor(cardKey: string, opt: SubOption): string {
  const tail = opt.en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${cardKey}-${tail}`;
}

export function findOptionBySlug(
  slug: string,
): { opt: SubOption; cardKey: string } | undefined {
  for (const [cardKey, config] of Object.entries(serviceOptionsByKey)) {
    const opts =
      config.kind === "flat"
        ? config.options
        : config.sections.flatMap((s) => s.options);
    for (const opt of opts) {
      if (slugFor(cardKey, opt) === slug) return { opt, cardKey };
    }
  }
  return undefined;
}
