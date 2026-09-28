export interface ExecMemberBio {
  previousExperience?: { en: string[]; ar: string[] };
  yearsOfExperience?: { en: string; ar: string };
  previousEmployer?: { en: string; ar: string };
  /** Free-form experience list (used for the certified expert who has
   *  experience areas rather than a previous role). */
  experience?: { en: string[]; ar: string[] };
  tasks: { en: string[]; ar: string[] };
  /** Optional override label for the tasks list — defaults to
   *  "Current Tasks" / "المهام الحالية". For the Chairman & CEO we
   *  show "Duties and Responsibilities" instead. */
  tasksLabel?: { en: string; ar: string };
}

export interface ExecMember {
  title: { en: string; ar: string };
  /** Some entries (committees) have no named member. */
  name?: { en: string; ar: string };
  /** Render as a larger, full-width card with a bigger photo (e.g. the
   *  Chairman & CEO). */
  featured?: boolean;
  /** Path under /public to this member's photo, e.g.
   *  "/images/team/omar-nabih-shaker.jpg". When omitted, a silhouette
   *  placeholder is shown. To add a real photo: drop the file into
   *  apps/lawyers.bh/public/images/team/ and set this field (see the
   *  README in that folder). */
  photo?: string;
  /** Optional explicit URL fragment. Generated automatically from the English name when omitted. */
  slug?: string;
  /** Defaults to Person. Use Organization for companies or institutions. */
  schemaType?: "Person" | "Organization";
  bio?: ExecMemberBio;
}

export interface ExecSection {
  roman: string;
  heading: { en: string; ar: string };
  members: ExecMember[];
}

export const execSections: ExecSection[] = [
  {
    roman: "I",
    heading: { en: "Executive Management", ar: "الإدارة التنفيذية" },
    members: [
      {
        title: { en: "Chairman & CEO", ar: "رئيس مجلس الإدارة والرئيس التنفيذي" },
        name: { en: "Omar Nabih Shaker", ar: "عمر نبيه شاكر" },
        // Chairman & CEO — shown as a large, full-width featured card.
        featured: true,
        photo: "/images/team/omar-nabih-shaker.jpg",
        bio: {
          tasksLabel: {
            en: "Duties and Responsibilities",
            ar: "المهام والمسؤوليات",
          },
          tasks: {
            en: [
              "General leadership and strategic supervision of the platform.",
              "Adoption of executive decisions and policies.",
              "Business development and institutional expansion.",
              "Supervision of all departments, committees and executive teams.",
            ],
            ar: [
              "الإدارة  العامة والإشراف الاستراتيجي على المنصة.",
              "اعتماد القرارات والسياسات التنفيذية.",
              "تطوير الأعمال والتوسع المؤسسي.",
              "الإشراف على جميع الإدارات واللجان والفرق التنفيذية.",
            ],
          },
        },
      },
    ],
  },
  {
    roman: "II",
    heading: { en: "Deputy CEOs", ar: "نواب الرئيس التنفيذي" },
    members: [
      {
        title: {
          en: "Executive Vice President — Senior Legal Advisory & Expertise",
          ar: "نائب الرئيس التنفيذي للاستشارات القانونية العليا والخبرات",
        },
        name: { en: "Abdullah Al-Batti", ar: "عبدالله البطي" },
        featured: true,
        photo: "/images/team/albatii.jpeg",
        bio: {
          previousExperience: {
            en: [
              "Cassation Court–Licensed Attorney - Legal Consultant",
              "Former judge.",
              "President of the Supreme Civil Court.",
              "President of the Supreme Criminal Court.",
              "Deputy of the Court of Cassation.",
            ],
            ar: [
              "محامي مجاز امام محاكم التمييز - مستشار قانوني",
              "قاضٍ سابق.",
              "رئيس المحكمة المدنية العليا سابقًا",
              "رئيس المحكمة الجنائية العليا سابقًا",
              "نائب محكمة التمييز سابقًا",
            ],
          },
          yearsOfExperience: { en: "Over 35 years", ar: "أكثر من 35 سنة" },
          previousEmployer: {
            en: "Judicial Authority - Ministry of Justice, Islamic Affairs and Endowments — Kingdom of Bahrain",
            ar: "السلطة القضائية - وزارة العدل والشؤون الإسلامية والأوقاف — مملكة البحرين",
          },
          tasks: {
            en: [
              "Supervising senior legal consultancy.",
              "Reviewing major cases.",
              "Providing strategic legal opinion.",
              "Enhancing the quality of legal performance.",
            ],
            ar: [
              "الإشراف على الاستشارات القانونية العليا.",
              "مراجعة القضايا الكبرى",
              "تقديم الرأي القانوني الاستراتيجي.",
              "تعزيز جودة الأداء القانوني.",
            ],
          },
        },
      },
      {
        title: {
          en: "Executive Vice President — Legal Affairs & Enforcement",
          ar: " نائب الرئيس التنفيذي للشؤون القانونية والتنفيذ",
        },
        name: { en: "Rashid Ateeq", ar: "راشد عتيق" },
        featured: true,
        photo: "/images/team/rashed-ateeq.jpeg",
        bio: {
          previousExperience: {
            en: [
              "Cassation Court–Licensed Attorney - Legal Consultant - Private Execution Agent",
              "Former Head of Execution Court Procedures.",
              "Specialised experience in judicial execution and judicial procedures.",
            ],
            ar: [
              "محامي مجاز امام محاكم التمييز - منفذ خاص - مستشار قانوني",
              "رئيس سابق لإجراءات محكمة التنفيذ.",
              "خبرة متخصصة في التنفيذ القضائي والإجراءات القضائية.",
            ],
          },
          yearsOfExperience: { en: "Over 28 years", ar: "أكثر من 28 سنة" },
          previousEmployer: {
            en: "Ministry of Justice, Islamic Affairs and Endowments — Kingdom of Bahrain",
            ar: "وزارة العدل والشؤون الإسلامية والأوقاف — مملكة البحرين",
          },
          tasks: {
            en: [
              "Supervising the execution case files.",
              "Follow-up on judicial and enforcement procedures.",
              "Monitoring enforcement work.",
              "Supporting the platform's legal compliance.",
            ],
            ar: [
              "الإشراف على ملفات التنفيذ.",
              "متابعة الإجراءات القضائية والتنفيذية.",
              "مراقبة أعمال التنفيذ.",
              "دعم الالتزام القانوني للمنصة.",
            ],
          },
        },
      },
	  {
        title: {
          en: "Executive Vice President — Notarisation & Justice Services",
          ar: "نائب الرئيس التنفيذي للتوثيق والخدمات العدلية",
        },
        name: { en: "Khalid Al-Zayani", ar: "خالد الزياني" },
        featured: true,
        photo: "/images/team/khalid-al-zayani.png",
        bio: {
          previousExperience: {
            en: [
              "Cassation Court–Licensed Attorney - private notary -  Legal Consultant - Arbitrator",
              "Former Colonel in the Legal Affairs Department.",
            ],
            ar: [
              "محامي مجاز امام محاكم التمييز - موثق خاص - مستشار قانوني - محكم",
              "عقيد سابق في إدارة الشؤون القانونية.",
            ],
          },
          yearsOfExperience: { en: "More than 30 years", ar: "أكثر من 30 سنة" },
          previousEmployer: {
            en: "Ministry of Interior — Legal Affairs Department, Kingdom of Bahrain",
            ar: "إدارة الشؤون القانونية  — وزارة الداخلية، مملكة البحرين",
          },
          tasks: {
            en: [
              "Supervising notarisation and contracts.",
              "Reviewing official legal procedures.",
              "Regulatory compliance oversight.",
              "Development of justice services.",
            ],
            ar: [
              "الإشراف على التوثيق والعقود.",
              "مراجعة الإجراءات القانونية الرسمية.",
              "ضبط الالتزام التنظيمي.",
              "تطوير الخدمات العدلية.",
            ],
          },
        },
      },
    ],
  },
  {
    roman: "III",
    heading: {
      en: "Legal & Strategic Management",
      ar: "الإدارة القانونية والاستراتيجية",
    },
    members: [
      {
        title: {
          en: "Legal Advisor to the CEO & Director of the Legal Research and Follow-up Department",
          ar: "المستشار القانوني للرئيس التنفيذي ومدير إدارة البحث والمتابعة ",
        },
        name: { en: "Mohammed Al-Khudair", ar: "محمد الخضير" },
        featured: true,
        photo: "/images/team/mohmad.png",
        bio: {
          previousExperience: {
            en: [
              "Practising lawyer.",
              "Specialist in legal and commercial research.",
              "Developing legal policies and procedures.",
            ],
            ar: [
              "محامي مشتغل.",
              "متخصص في البحث القانوني والتجاري.",
              "تطوير السياسات والإجراءات القانونية.",
            ],
          },
           previousEmployer: {
            en: "Legal Research Assisant - NIHR",
            ar: "مساعد باحث قانوني - المؤسسة الوطنية لحقوق الإنسان",
          },
          yearsOfExperience: { en: "More than 7 years", ar: "أكثر من 7 سنوات" },
          tasks: {
            en: [
              "Providing direct advice to the CEO.",
              "Leading the Legal Research Department.",
              "Following up on legal performance.",
              "Developing internal systems and policies.",
            ],
            ar: [
              "تقديم الاستشارة المباشرة للرئيس التنفيذي.",
              "إدارة الأبحاث القانونية.",
              "متابعة الأداء القانوني.",
              "تطوير الأنظمة والسياسات الداخلية.",
            ],
          },
        },
      },
       {
        title: {
          en: "Legal Advisor to the CEO",
          ar: "المستشار القانوني للرئيس التنفيذي",
        },
        name: { en: "Yasmeen Ahmed", ar: "ياسمين احمد" },
        featured: true,
        photo: "/images/team/YasmeenـAhmed.png",
        bio: {
          previousExperience: {
            en: [
              "Providing legal advice across various areas of law.",
              "Drafting and reviewing contracts and agreements.",
              "Representing clients before courts and judicial authorities.",
"Preparing statements of claim, legal memoranda, and appeal briefs.",
"Following up on litigation and enforcement procedures.",
"Establishing companies and providing legal advisory services to businesses.",
"Attendance at Police Stations",
"Follow-up on Complaints Before the Public Prosecution",
            ],
            ar: [
              ".تقديم الاستشارات القانونية في مختلف فروع القانون",
              "صياغة ومراجعة العقود والاتفاقيات.",
              "تمثيل الموكلين أمام المحاكم والجهات القضائية.",
              "إعداد صحف الدعاوى والمذكرات القانونية ولوائح الاستئناف.",
              "متابعة إجراءات التقاضي والتنفيذ.",
              "تأسيس الشركات وتقديم الاستشارات القانونية للشركات",
                            "حضور مراكز الشرطة",
              "متابعة البلاغات بالنيابة العامة"
            ],
          },
           previousEmployer: {
            en: "The Law Office of Lawyer Sheikh Ali bin Mohammed Al Khalifa",
            ar: "مكتب المحامي /الشيخ علي بن محمد ال خليفة",
          },
          yearsOfExperience: { en: "More than 6 years", ar: "أكثر من 6 سنوات" },
          tasks: {
            en: [
              "Providing direct advice to the CEO.",
              "Leading the Legal Research Department.",
              "Following up on legal performance.",
              "Developing internal systems and policies.",
              "Attendance at Police Stations",
"Follow-up on Complaints Before the Public Prosecution",
            ],
            ar: [
              "تقديم الاستشارة المباشرة للرئيس التنفيذي.",
              "إدارة الأبحاث القانونية.",
              "متابعة الأداء القانوني.",
              "تطوير الأنظمة والسياسات الداخلية.",
            ],
          },
        },
      },
       {
        title: {
          en: "Legal Advisor to the CEO",
          ar: "المستشار القانوني للرئيس التنفيذي",
        },
        name: { en: "Mohammed Flamarzi", ar: "محمد فلامرزي" },
        featured: true,
        photo: "/images/team/MohammedFlamarzi.png",
        bio: {
          previousExperience: {
            en: [
              "Providing legal advice across various areas of law.",
              "Drafting and reviewing contracts and agreements.",
              "Representing clients before courts and judicial authorities.",
"Preparing statements of claim, legal memoranda, and appeal briefs.",
"Following up on litigation and enforcement procedures.",
"Establishing companies and providing legal advisory services to businesses.",
"Attendance at Police Stations",
"Follow-up on Complaints Before the Public Prosecution",
            ],
            ar: [
              ".تقديم الاستشارات القانونية في مختلف فروع القانون",
              "صياغة ومراجعة العقود والاتفاقيات.",
              "تمثيل الموكلين أمام المحاكم والجهات القضائية.",
              "إعداد صحف الدعاوى والمذكرات القانونية ولوائح الاستئناف.",
              "متابعة إجراءات التقاضي والتنفيذ.",
              "تأسيس الشركات وتقديم الاستشارات القانونية للشركات",
              "حضور مراكز الشرطة",
              "متابعة البلاغات بالنيابة العامة"
            ],
          },
           previousEmployer: {
  en: "The Law Office of Lawyer Yousif Zainal",
  ar: "مكتب المحامي / يوسف زينل",
},
          yearsOfExperience: { en: "More than 6 years", ar: "أكثر من 6 سنوات" },
          tasks: {
            en: [
              "Providing direct advice to the CEO.",
              "Leading the Legal Research Department.",
              "Following up on legal performance.",
              "Developing internal systems and policies.",
            ],
            ar: [
              "تقديم الاستشارة المباشرة للرئيس التنفيذي.",
              "إدارة الأبحاث القانونية.",
              "متابعة الأداء القانوني.",
              "تطوير الأنظمة والسياسات الداخلية.",
            ],
          },
        },
      },
    ],
  },
  {
    roman: "IV",
    heading: { en: "Technical Operator", ar: "المشغل التقني" },
    members: [
      {
        schemaType: "Organization",
        title: { en: "Platform Technical Operator", ar: "المشغل التقني للمنصة" },
        name: { en: "GULF INTERNATIONAL Company", ar: "شركة الخليج الدولية" },
        bio: {
          tasks: {
            en: [
              "Platform and systems development.",
              "Data management.",
              "Cybersecurity.",
              "Continuous technical updates.",
            ],
            ar: [
              "تطوير المنصة والأنظمة.",
              "إدارة البيانات.",
              "الأمن السيبراني.",
              "التحديثات التقنية المستمرة.",
            ],
          },
        },
      },
    ],
  },
  {
    roman: "V",
    heading: {
      en: "Regulatory & Supervisory Committees",
      ar: "اللجان التنظيمية والإشرافية",
    },
    members: [
      {
        title: {
          en: "Governance, Quality and Follow-up Committee",
          ar: "لجنة الحوكمة والجودة والمتابعة",
        },
        bio: {
          tasks: {
            en: [
              "Following up on overall performance.",
              "Internal quality review.",
              "Reporting to senior management.",
            ],
            ar: [
              "متابعة الأداء العام.",
              "المراجعة الداخلية للجودة.",
              "رفع التقارير إلى الإدارة العليا.",
            ],
          },
        },
      },
      {
        title: {
          en: "Complaints and Grievances Committee",
          ar: "لجنة الشكاوى والتظلمات",
        },
        bio: {
          tasks: {
            en: [
              "Receiving complaints.",
              "Initial investigation and review.",
              "Proposing solutions and procedures.",
            ],
            ar: [
              "استقبال الشكاوى.",
              "التحقيق والمراجعة الأولية.",
              "اقتراح الحلول والإجراءات.",
            ],
          },
        },
      },
      {
        title: {
          en: "Case Management and Distribution Committee",
          ar: "لجنة إدارة وتوزيع القضايا",
        },
        bio: {
          tasksLabel: {
            en: "Operational Control",
            ar: "الضبط التشغيلي",
          },
          tasks: {
            en: [
              "Distribution of cases and requests.",
              "Follow-up on delivery and outcomes.",
              "Operational control across teams.",
            ],
            ar: [
              "توزيع القضايا والطلبات.",
              "متابعة الإنجاز والنتائج.",
              "الضبط التشغيلي عبر الفرق.",
            ],
          },
        },
      },
    ],
  },
];

export type NamedExecMember = ExecMember & {
  name: { en: string; ar: string };
};

/**
 * Creates a stable URL fragment from the explicit slug or English name.
 * Add `slug` only when you need to preserve a specific URL permanently.
 */
export function getMemberSlug(member: ExecMember): string {
  const value = member.slug ?? member.name?.en ?? "";

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns every named member that should be represented as a Person in SEO.
 * Unnamed committees and entries marked as Organization are excluded.
 */
export function getTeamPeople(): NamedExecMember[] {
  return execSections.flatMap((section) =>
    section.members.filter(
      (member): member is NamedExecMember =>
        Boolean(member.name) && member.schemaType !== "Organization",
    ),
  );
}
