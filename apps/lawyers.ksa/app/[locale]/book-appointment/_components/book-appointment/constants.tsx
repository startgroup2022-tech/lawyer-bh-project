import {
  BotMessageSquare,
  MapPin,
  MessageCircle,
  Phone,
  Video,
} from "lucide-react";
import type { ConsultMethod, TimePeriod, VideoProvider } from "./types";

export const serviceOptions = {
  en: [
    "Legal Consultations",
    "Urgent Cases & Execution Courts",
    "Sharia Issues",
    "Criminal Issues",
    "Civil Issues",
    "Commercial Issues",
    "Administrative Issues",
    "Insurance Issues",
    "Real Estate Issues",
    "Inheritance & Personal Status",
    "Corporate & Business Issues",
    "Labor Issues",
    "Medical Errors Claims",
    "Compensation Issues",
    "Electronic Crimes",
    "Economic Crimes",
    "Legal Mediation",
    "Expert Appointment",
    "Arbitrator Appointment",
    "Private Execution",
    "Notary Services",
  ],
  ar: [
    "استشارات قانونية",
    "قضايا مستعجلة ومحاكم التنفيذ",
    "قضايا شرعية",
    "قضايا جنائية",
    "قضايا مدنية",
    "قضايا تجارية",
    "قضايا إدارية",
    "قضايا التأمين",
    "قضايا عقارية",
    "الإرث والأحوال الشخصية",
    "قضايا الشركات والأعمال",
    "قضايا العمل",
    "مطالبات الأخطاء الطبية",
    "قضايا التعويض",
    "الجرائم الإلكترونية",
    "الجرائم الاقتصادية",
    "الوساطة القانونية",
    "تعيين خبير",
    "تعيين محكم",
    "التنفيذ الخاص",
    "خدمات التوثيق",
  ],
};

export const consultMethods: ConsultMethod[] = [
  {
    code: "online",
    icon: BotMessageSquare,
    label: { en: "Virtual Legal Advice & Guidance", ar: "التوجيه والإرشاد القانوني الافتراضي" },
    fixedPrice: 0,
    fixedMinutes: 0,
    note: { en: "", ar: "" },
  },
  {
    code: "whatsapp",
    icon: MessageCircle,
    label: {
      en: "WhatsApp Consultation",
      ar: "استشارة عبر واتساب",
    },
    fixedPrice: 10,
    fixedMinutes: 15,
  },
  {
    code: "phone",
    icon: Phone,
    label: { en: "Voice Call", ar: "مكالمة صوتية" },
    fixedPrice: 10,
    fixedMinutes: 15,
  },
  {
    code: "video",
    icon: Video,
    label: { en: "Video Call", ar: "مكالمة فيديو" },
    fixedPrice: 15,
    fixedMinutes: 20,
  },
  {
    code: "office",
    icon: MapPin,
    label: { en: "Office Visit", ar: "زيارة المكتب" },
    fixedPrice: 25,
    fixedMinutes: 30,
  },
];

export const videoProviders: { value: VideoProvider; label: { en: string; ar: string } }[] = [
  { value: "google-meet", label: { en: "Google Meet", ar: "Google Meet" } },
  { value: "whatsapp", label: { en: "WhatsApp", ar: "واتساب" } },
];

export const ONLINE_CONSULT_METHOD_INDEX = 0;
export const VOICE_CONSULT_METHOD_INDEX = 2;

export const LAWYER_AUTHORIZATION_SERVICE_KEY = "lawyer_authorization";

export const bookingServiceCopy: Record<
  string,
  {
    title: { en: string; ar: string };
    desc: { en: string; ar: string };
  }
> = {
  legal: {
    title: { en: "Legal Consultations", ar: "الاستشارات القانونية" },
    desc: {
      en: "Specialized legal consultations from licensed lawyers and consultants across all areas of law.",
      ar: "استشارات قانونية متخصصة من محامين ومستشارين مرخصين في جميع مجالات القانون.",
    },
  },
  comprehensive: {
    title: { en: "Legal Representation & Filing Lawsuits", ar: "تمثيل قانوني ورفع دعاوى" },
  desc: {
  en: "Comprehensive legal representation and case management for court proceedings, both in person and remotely, ensuring your rights are protected with professionalism and reliability.",
  ar: "تمثيل قانوني متكامل ومتابعة للقضايا والمحاكم (حضورياً أو عن بُعد) لضمان حقوقك بكل مهنية وموثوقية.",
},
  },
  firms: {
    title: { en: "Directory of Accredited Lawyers and Law Firms", ar: "دليل المحامين والمكاتب المعتمدة" },
    desc: {
      en: "Access law firms and lawyers accredited by the Ministry of Justice.",
      ar: "الوصول إلى مكاتب محاماة ومحامين معتمدين من وزارة العدل.",
    },
  },
  lawyer_authorization: {
    title: { en: "Appoint a Lawyer", ar: "توكيل محامي" },
    desc: {
      en: "Request the appointment of a lawyer to follow up on your case or represent you legally.",
      ar: "اطلب توكيل محامي لمتابعة قضيتك أو تمثيلك قانونياً.",
    },
  },
  lawyerauthorization: {
    title: { en: "Appoint a Lawyer", ar: "توكيل محامي" },
    desc: {
      en: "Request the appointment of a lawyer to follow up on your case or represent you legally.",
      ar: "اطلب توكيل محامي لمتابعة قضيتك أو تمثيلك قانونياً.",
    },
  },
  lawyerAuthorization: {
    title: { en: "Appoint a Lawyer", ar: "توكيل محامي" },
    desc: {
      en: "Request the appointment of a lawyer to follow up on your case or represent you legally.",
      ar: "اطلب توكيل محامي لمتابعة قضيتك أو تمثيلك قانونياً.",
    },
  },
  business: {
    title: { en: "Company Formation & Business Services", ar: "تأسيس الشركات وخدمات دعم الأعمال" },
    desc: {
      en: "Company registration, trademark registration, feasibility studies, and business support services in Bahrain.",
      ar: "تسجيل الشركات والعلامات التجارية ودراسات الجدوى ودعم الأعمال في البحرين.",
    },
  },
  execution: {
    title: { en: "Debt Collection & Judgment Enforcement", ar: "تحصيل الديون وتنفيذ الأحكام" },
    desc: {
      en: "Enforcement services including eviction, seizure of property, and enforcement of court judgments.",
      ar: "خدمات التنفيذ بما في ذلك الإخلاء والحجز على الممتلكات وتنفيذ الأحكام القضائية.",
    },
  },
  notary: {
    title: { en: "Contract Drafting & Notarization", ar: "صياغة وتوثيق العقود" },
    desc: {
      en: "Powers of attorney, real estate transactions, company contracts, and legal notarization.",
      ar: "التوكيلات والمعاملات العقارية وعقود الشركات والتوثيق القانوني.",
    },
  },
  forms: {
    title: { en: "Ministry of Justice Forms", ar: "نماذج وزارة العدل" },
    desc: {
      en: "Browse and download official forms issued by the Ministry of Justice — execution, notarization, Sharia, criminal, and more.",
      ar: "تصفّح وحمّل النماذج الرسمية الصادرة عن وزارة العدل — التنفيذ والتوثيق والشرعي والجنائي وغيرها.",
    },
  },
};

export const serviceKeyToLabel: Record<string, { en: string; ar: string }> = Object.fromEntries(
  Object.entries(bookingServiceCopy).map(([key, copy]) => [key, copy.title]),
);

export const DEFAULT_SERVICE_CARD_KEY = "legal";

export const professionalOffice = {
  id: "gulf-international-collection-consulting",
  nameAr: "شركة الخليج الدولية للتحصيل والاستشارات ش.ذ.م.م",
  nameEn: "Gulf International Collection and Consulting W.L.L.",
  labelAr: "المكتب المحترف",
  labelEn: "Professional Office",
};

export const timePeriods: TimePeriod[] = [
  {
    value: "09:00-13:00",
    label: { en: "First Period", ar: "الفترة الأولى" },
    range: { en: "9:00 AM - 1:00 PM", ar: "9 صباحاً - 1 ظهراً" },
  },
  {
    value: "13:00-17:00",
    label: { en: "Second Period", ar: "الفترة الثانية" },
    range: { en: "1:00 PM - 5:00 PM", ar: "1 ظهراً - 5 عصراً" },
  },
  {
    value: "09:00-17:00",
    label: { en: "Third Period", ar: "الفترة الثالثة" },
    range: { en: "9:00 AM - 5:00 PM", ar: "9 صباحاً - 5 عصراً" },
  },
];
