import type { MetadataRoute } from "next";

/* -------------------------------------------------------------------------- */
/*                               Site settings                                */
/* -------------------------------------------------------------------------- */

export const SITE_URL = "https://www.lawyers.bh" as const;
export const DEFAULT_LOCALE = "en" as const;

export const SEO_LOCALES = ["ar", "en"] as const;

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type SitemapEntry = MetadataRoute.Sitemap[number];

export type SeoLocale = (typeof SEO_LOCALES)[number];

export type SeoPageKey =
  | "home"
  | "about"
  | "directory"
  | "join"
  | "bookAppointment"
  | "policeDirectory"
  | "faq"
  | "contact"
  | "terms"
  | "refundPolicy";

export type SeoPagePath = "" | `/${string}`;

export type SeoPageConfig = {
  key: SeoPageKey;
  path: SeoPagePath;

  priority: NonNullable<SitemapEntry["priority"]>;

  changeFrequency: NonNullable<
    SitemapEntry["changeFrequency"]
  >;

  /**
   * تاريخ آخر تعديل حقيقي على محتوى الصفحة.
   *
   * مثال:
   * lastModified: "2026-07-23"
   *
   * اتركه فارغًا إذا لم يكن لديك تاريخ تعديل دقيق.
   */
  lastModified?: string;

  title: Record<SeoLocale, string>;
  description: Record<SeoLocale, string>;

  /**
   * تستخدم لتنظيم كلمات المحتوى.
   * Google لا يعتمد meta keywords كعامل ترتيب مباشر.
   */
  keywords: Record<SeoLocale, readonly string[]>;
};

/* -------------------------------------------------------------------------- */
/*                                  SEO pages                                 */
/* -------------------------------------------------------------------------- */

export const seoPages: readonly SeoPageConfig[] = [
  {
    key: "home",
    path: "",
    priority: 1,
    changeFrequency: "weekly",

    title: {
      ar: "محامون في البحرين | استشارات وخدمات قانونية",
      en: "Lawyers in Bahrain | Legal Consultations and Services",
    },

    description: {
      ar: "ابحث عن محامين ومقدمي خدمات قانونية في البحرين، واحجز استشارتك أو خدمتك القانونية بسهولة عبر منصة محامون البحرين.",
      en: "Find lawyers and legal service providers in Bahrain and book legal consultations and services easily through Lawyers.bh.",
    },

    keywords: {
      ar: [
        "محامون البحرين",
        "محامي في البحرين",
        "محامي بحريني",
        "استشارات قانونية البحرين",
        "خدمات قانونية البحرين",
        "مكتب محاماة البحرين",
        "توثيق البحرين",
        "محامي قضايا تجارية",
        "محامي قضايا عمالية",
        "محامي قضايا جنائية",
      ],

      en: [
        "Bahrain lawyers",
        "lawyer in Bahrain",
        "legal consultation Bahrain",
        "legal services Bahrain",
        "Bahrain law firm",
        "notary services Bahrain",
        "commercial lawyer Bahrain",
        "criminal lawyer Bahrain",
        "family lawyer Bahrain",
      ],
    },
  },

  {
    key: "about",
    path: "/about",
    priority: 0.7,
    changeFrequency: "monthly",

    title: {
      ar: "عن منصة محامون البحرين",
      en: "About Lawyers.bh",
    },

    description: {
      ar: "تعرف على منصة محامون البحرين ودورها في تسهيل الوصول إلى المحامين ومقدمي الخدمات القانونية في مملكة البحرين.",
      en: "Learn about Lawyers.bh and how the platform helps clients reach lawyers and legal service providers in Bahrain.",
    },

    keywords: {
      ar: [
        "عن محامون البحرين",
        "منصة قانونية البحرين",
        "خدمات المحامين في البحرين",
        "مقدمو خدمات قانونية البحرين",
      ],

      en: [
        "about Lawyers.bh",
        "Bahrain legal platform",
        "legal providers Bahrain",
        "lawyers platform Bahrain",
      ],
    },
  },

  {
    key: "directory",
    path: "/directory",
    priority: 0.9,
    changeFrequency: "weekly",

    title: {
      ar: "دليل المحامين ومقدمي الخدمات القانونية في البحرين",
      en: "Bahrain Lawyers and Legal Providers Directory",
    },

    description: {
      ar: "ابحث في دليل المحامين ومقدمي الخدمات القانونية في البحرين حسب التخصص ونوع الخدمة القانونية المطلوبة.",
      en: "Search Bahrain lawyers and legal service providers by specialty and the type of legal service you need.",
    },

    keywords: {
      ar: [
        "دليل المحامين البحرين",
        "أسماء المحامين في البحرين",
        "محامي استشارات قانونية",
        "محامي قضايا مدنية البحرين",
        "محامي قضايا تجارية البحرين",
        "محامي قضايا شرعية البحرين",
        "محامي قضايا عمالية البحرين",
      ],

      en: [
        "Bahrain lawyers directory",
        "lawyers list Bahrain",
        "find lawyer Bahrain",
        "civil lawyer Bahrain",
        "commercial lawyer Bahrain",
        "labor lawyer Bahrain",
        "sharia lawyer Bahrain",
      ],
    },
  },

  {
    key: "join",
    path: "/join",
    priority: 0.85,
    changeFrequency: "monthly",

    title: {
      ar: "انضم كمقدم خدمة قانونية | محامون البحرين",
      en: "Join as a Legal Service Provider | Lawyers.bh",
    },

    description: {
      ar: "سجل كمحامٍ أو مقدم خدمة قانونية في منصة محامون البحرين، وقدم خدماتك للعملاء بعد مراجعة واعتماد طلبك.",
      en: "Register as a lawyer or legal service provider on Lawyers.bh and offer your services after your application is reviewed and approved.",
    },

    keywords: {
      ar: [
        "تسجيل محامي البحرين",
        "انضم كمحامي",
        "تسجيل مقدم خدمة قانونية",
        "منصة محامين البحرين",
        "اشتراك محامي البحرين",
      ],

      en: [
        "join Lawyers.bh",
        "lawyer registration Bahrain",
        "legal provider registration Bahrain",
        "register as lawyer Bahrain",
      ],
    },
  },

  {
    key: "bookAppointment",
    path: "/book-appointment",
    priority: 0.95,
    changeFrequency: "weekly",

    title: {
      ar: "حجز استشارة قانونية في البحرين",
      en: "Book a Legal Consultation in Bahrain",
    },

    description: {
      ar: "احجز موعدًا لاستشارة أو خدمة قانونية مع محامٍ أو مقدم خدمة قانونية في البحرين حسب نوع طلبك والوقت المناسب لك.",
      en: "Book a legal consultation or service with a lawyer or legal service provider in Bahrain based on your request and preferred time.",
    },

    keywords: {
      ar: [
        "حجز موعد محامي البحرين",
        "حجز استشارة قانونية",
        "استشارة محامي البحرين",
        "طلب خدمة قانونية البحرين",
      ],

      en: [
        "book lawyer Bahrain",
        "book legal consultation Bahrain",
        "legal appointment Bahrain",
        "request legal service Bahrain",
      ],
    },
  },

  {
    key: "policeDirectory",
    path: "/police-directory",
    priority: 0.75,
    changeFrequency: "monthly",

    title: {
      ar: "دليل مراكز الشرطة في البحرين",
      en: "Bahrain Police Stations Directory",
    },

    description: {
      ar: "تصفح دليل مراكز الشرطة في البحرين للوصول إلى معلومات المراكز ومواقعها ضمن الخدمات القانونية والمساندة.",
      en: "Browse the Bahrain police stations directory to access station information and locations as part of legal support services.",
    },

    keywords: {
      ar: [
        "مراكز الشرطة البحرين",
        "دليل مراكز الشرطة",
        "مركز شرطة البحرين",
        "محامي حضور مركز الشرطة",
      ],

      en: [
        "Bahrain police stations",
        "police directory Bahrain",
        "police station Bahrain",
        "lawyer police station Bahrain",
      ],
    },
  },

  {
    key: "faq",
    path: "/faq",
    priority: 0.7,
    changeFrequency: "monthly",

    title: {
      ar: "الأسئلة الشائعة | محامون البحرين",
      en: "Frequently Asked Questions | Lawyers.bh",
    },

    description: {
      ar: "اطلع على إجابات الأسئلة الشائعة حول منصة محامون البحرين، وحجز الخدمات القانونية، والتسجيل، والدفع.",
      en: "Find answers to common questions about Lawyers.bh, booking legal services, provider registration, and payments.",
    },

    keywords: {
      ar: [
        "أسئلة محامون البحرين",
        "الأسئلة الشائعة القانونية",
        "أسئلة استشارات قانونية",
        "طريقة حجز محامي",
        "طريقة الانضمام كمحامي",
      ],

      en: [
        "Lawyers.bh FAQ",
        "legal services questions Bahrain",
        "lawyer booking questions",
        "legal consultation FAQ Bahrain",
      ],
    },
  },

  {
    key: "contact",
    path: "/contact",
    priority: 0.7,
    changeFrequency: "monthly",

    title: {
      ar: "تواصل معنا | محامون البحرين",
      en: "Contact Lawyers.bh",
    },

    description: {
      ar: "تواصل مع منصة محامون البحرين للاستفسار عن الخدمات القانونية أو تسجيل مقدمي الخدمات أو الحصول على الدعم.",
      en: "Contact Lawyers.bh for questions about legal services, provider registration, or platform support.",
    },

    keywords: {
      ar: [
        "تواصل محامون البحرين",
        "رقم محامون البحرين",
        "دعم منصة محامون البحرين",
        "استفسار قانوني البحرين",
      ],

      en: [
        "contact Lawyers.bh",
        "Lawyers.bh support",
        "legal services support Bahrain",
        "contact legal platform Bahrain",
      ],
    },
  },

  {
    key: "terms",
    path: "/terms",
    priority: 0.45,
    changeFrequency: "monthly",

    title: {
      ar: "الشروط والأحكام | محامون البحرين",
      en: "Terms and Conditions | Lawyers.bh",
    },

    description: {
      ar: "اقرأ الشروط والأحكام المنظمة لاستخدام منصة محامون البحرين والخدمات القانونية المتاحة من خلالها.",
      en: "Read the terms and conditions governing the use of Lawyers.bh and the legal services available through the platform.",
    },

    keywords: {
      ar: [
        "شروط محامون البحرين",
        "شروط استخدام المنصة",
        "أحكام الخدمات القانونية",
      ],

      en: [
        "Lawyers.bh terms",
        "terms of use legal platform",
        "legal services terms Bahrain",
      ],
    },
  },

  {
    key: "refundPolicy",
    path: "/refund-policy",
    priority: 0.45,
    changeFrequency: "monthly",

    title: {
      ar: "سياسة الاسترجاع والمدفوعات | محامون البحرين",
      en: "Refund and Payment Policy | Lawyers.bh",
    },

    description: {
      ar: "تعرف على سياسة الاسترجاع والمدفوعات المتعلقة بالخدمات القانونية المحجوزة عبر منصة محامون البحرين.",
      en: "Learn about the refund and payment policy for legal services booked through Lawyers.bh.",
    },

    keywords: {
      ar: [
        "سياسة استرجاع محامون البحرين",
        "استرجاع رسوم قانونية",
        "سياسة دفع الخدمات القانونية",
      ],

      en: [
        "Lawyers.bh refund policy",
        "legal services refund Bahrain",
        "payment policy Lawyers.bh",
      ],
    },
  },
];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

export function isSeoLocale(locale: string): locale is SeoLocale {
  return SEO_LOCALES.includes(locale as SeoLocale);
}

export function normalizeSeoLocale(locale: string): SeoLocale {
  return isSeoLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function getSeoPage(pageKey: SeoPageKey): SeoPageConfig {
  const page = seoPages.find((item) => item.key === pageKey);

  if (!page) {
    throw new Error(`SEO page config not found: ${pageKey}`);
  }

  return page;
}

export function getLocalizedSeo(
  pageKey: SeoPageKey,
  locale: string,
) {
  const page = getSeoPage(pageKey);
  const normalizedLocale = normalizeSeoLocale(locale);

  return {
    page,
    locale: normalizedLocale,
    title: page.title[normalizedLocale],
    description: page.description[normalizedLocale],
    keywords: [...page.keywords[normalizedLocale]],
  };
}

export function getLocalizedPageUrl(
  pageKey: SeoPageKey,
  locale: string,
): string {
  const page = getSeoPage(pageKey);
  const normalizedLocale = normalizeSeoLocale(locale);

  return `${SITE_URL}/${normalizedLocale}${page.path}`;
}

export function getPageLanguageAlternates(
  pageKey: SeoPageKey,
): Record<SeoLocale | "x-default", string> {
  const page = getSeoPage(pageKey);

  return {
    ar: `${SITE_URL}/ar${page.path}`,
    en: `${SITE_URL}/en${page.path}`,
    "x-default": `${SITE_URL}/${DEFAULT_LOCALE}${page.path}`,
  };
}