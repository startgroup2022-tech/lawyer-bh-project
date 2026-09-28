import { describe, expect, it } from "vitest";
import { execSections } from "./team-data";

describe("Legal & Strategic Management profiles", () => {
  it("publishes Eman Al Natai's complete bilingual profile", () => {
    const section = execSections.find((item) => item.roman === "III");
    const member = section?.members.find((item) => item.name?.en === "Eman Al Natai");

    expect(member).toMatchObject({
      title: {
        en: "Legal Advisor to the CEO",
        ar: "المستشار القانوني للرئيس التنفيذي",
      },
      name: { en: "Eman Al Natai", ar: "إيمان النطعي" },
      featured: true,
      photo: "/images/team/eman-al-natai.png",
      bio: {
        yearsOfExperience: { en: "More than 5 years", ar: "أكثر من 5 سنوات" },
        previousEmployer: {
          en: "Law Office of Attorney Fatima Khalifa & Partners",
          ar: "مكتب المحامية / فاطمة خليفة وشركاؤها",
        },
      },
    });

    expect(member?.bio?.previousExperience?.en).toEqual([
      "Providing legal advice across various areas of law.",
      "Drafting and reviewing contracts and agreements.",
      "Representing clients before courts and judicial authorities.",
      "Preparing statements of claim, legal memoranda, and appeal briefs.",
      "Following up on litigation and enforcement procedures.",
      "Establishing companies and providing legal advisory services to businesses.",
      "Attending police stations.",
      "Following up on complaints before the Public Prosecution.",
    ]);
    expect(member?.bio?.previousExperience?.ar).toEqual([
      "تقديم الاستشارات القانونية في مختلف فروع القانون.",
      "صياغة ومراجعة العقود والاتفاقيات.",
      "تمثيل الموكلين أمام المحاكم والجهات القضائية.",
      "إعداد صحف الدعاوى والمذكرات القانونية ولوائح الاستئناف.",
      "متابعة إجراءات التقاضي والتنفيذ.",
      "تأسيس الشركات وتقديم الاستشارات القانونية للشركات.",
      "حضور مراكز الشرطة.",
      "متابعة البلاغات بالنيابة العامة.",
    ]);
    expect(member?.bio?.tasks.en).toEqual([
      "Supervising enforcement files.",
      "Following up on judicial and enforcement procedures.",
      "Monitoring enforcement work.",
      "Providing direct advice to the CEO.",
      "Managing legal research.",
      "Monitoring legal performance.",
      "Developing internal systems and policies.",
    ]);
    expect(member?.bio?.tasks.ar).toEqual([
      "الإشراف على ملفات التنفيذ.",
      "متابعة الإجراءات القضائية والتنفيذية.",
      "مراقبة أعمال التنفيذ.",
      "تقديم الاستشارة المباشرة للرئيس التنفيذي.",
      "إدارة الأبحاث القانونية.",
      "متابعة الأداء القانوني.",
      "تطوير الأنظمة والسياسات الداخلية.",
    ]);
  });

  it("publishes Dana Tariq immediately after Eman Al Natai", () => {
    const section = execSections.find((item) => item.roman === "III");
    const emanIndex = section?.members.findIndex((item) => item.name?.en === "Eman Al Natai") ?? -1;
    const dana = section?.members[emanIndex + 1];

    expect(emanIndex).toBeGreaterThanOrEqual(0);
    expect(dana).toMatchObject({
      title: {
        en: "Legal Advisor to the CEO",
        ar: "المستشار القانوني للرئيس التنفيذي",
      },
      name: { en: "Dana Tariq", ar: "دانة طارق" },
      featured: true,
      photo: "/images/team/dana-tariq.png",
      bio: {
        yearsOfExperience: { en: "More than 4 years", ar: "أكثر من 4 سنوات" },
        previousEmployer: {
          en: "Law Office of Attorney Zahraa Hassan",
          ar: "مكتب المحامية / زهراء حسن",
        },
      },
    });
    expect(dana?.bio?.previousExperience).toEqual({
      en: [
        "Providing legal advice across various areas of law.",
        "Drafting and reviewing contracts and agreements.",
        "Representing clients before courts and judicial authorities.",
        "Preparing statements of claim, legal memoranda, and appeal briefs.",
        "Following up on litigation and enforcement procedures.",
        "Establishing companies and providing legal advisory services to businesses.",
        "Attending police stations.",
        "Following up on complaints before the Public Prosecution.",
      ],
      ar: [
        "تقديم الاستشارات القانونية في مختلف فروع القانون.",
        "صياغة ومراجعة العقود والاتفاقيات.",
        "تمثيل الموكلين أمام المحاكم والجهات القضائية.",
        "إعداد صحف الدعاوى والمذكرات القانونية ولوائح الاستئناف.",
        "متابعة إجراءات التقاضي والتنفيذ.",
        "تأسيس الشركات وتقديم الاستشارات القانونية للشركات.",
        "حضور مراكز الشرطة.",
        "متابعة البلاغات بالنيابة العامة.",
      ],
    });
    expect(dana?.bio?.tasks).toEqual({
      en: [
        "Supervising enforcement files.",
        "Following up on judicial and enforcement procedures.",
        "Monitoring enforcement work.",
        "Providing direct advice to the CEO.",
        "Managing legal research.",
        "Monitoring legal performance.",
        "Developing internal systems and policies.",
      ],
      ar: [
        "الإشراف على ملفات التنفيذ.",
        "متابعة الإجراءات القضائية والتنفيذية.",
        "مراقبة أعمال التنفيذ.",
        "تقديم الاستشارة المباشرة للرئيس التنفيذي.",
        "إدارة الأبحاث القانونية.",
        "متابعة الأداء القانوني.",
        "تطوير الأنظمة والسياسات الداخلية.",
      ],
    });
  });

  it("publishes Sharifa Alhelaw immediately after Dana Tariq", () => {
    const section = execSections.find((item) => item.roman === "III");
    const danaIndex = section?.members.findIndex((item) => item.name?.en === "Dana Tariq") ?? -1;
    const dana = section?.members[danaIndex];
    const sharifa = section?.members[danaIndex + 1];

    expect(danaIndex).toBeGreaterThanOrEqual(0);
    expect(sharifa).toMatchObject({
      title: {
        en: "Legal Advisor to the CEO",
        ar: "المستشار القانوني للرئيس التنفيذي",
      },
      name: { en: "Sharifa Alhelaw", ar: "شريفة الحلو" },
      featured: true,
      photo: "/images/team/sharifa-alhelaw.png",
      bio: {
        yearsOfExperience: { en: "More than 4 years", ar: "أكثر من 4 سنوات" },
        previousEmployer: {
          en: "Law Office of Attorney Mr. Diaa Khalaf",
          ar: "مكتب المحامي / السيد ضياء خلف",
        },
      },
    });
    expect(sharifa?.bio?.previousExperience).toEqual(dana?.bio?.previousExperience);
    expect(sharifa?.bio?.tasks).toEqual(dana?.bio?.tasks);
  });
});

describe("Technical Management profiles", () => {
  it("publishes Habib Mohammed's complete bilingual profile in section IV", () => {
    const section = execSections.find((item) => item.roman === "IV");
    const member = section?.members.find((item) => item.name?.en === "Habib Mohammed");

    expect(section?.heading).toEqual({
      en: "Technical Management",
      ar: "الإدارة التقنية",
    });
    expect(member).toMatchObject({
      title: {
        en: "Director of Technical Management",
        ar: "مدير الإدارة التقنية",
      },
      name: { en: "Habib Mohammed", ar: "حبيب محمد" },
      featured: true,
      photo: "/images/team/habib-mohammed.png",
      bio: {
        yearsOfExperience: { en: "More than 6 years", ar: "أكثر من 6 سنوات" },
      },
    });
    expect(member?.bio?.previousEmployer).toBeUndefined();
    expect(member?.bio?.previousExperience).toEqual({
      en: [
        "Experience in designing and developing cross-platform mobile applications.",
        "Developing and managing websites and digital platforms.",
        "Designing user interfaces and improving user experience.",
        "Analysing requirements and translating business needs into technical solutions.",
        "Building and managing databases, APIs, and system integrations.",
        "Integrating systems with payment services and external services.",
        "Managing servers, cloud infrastructure, deployments, and updates.",
        "Applying cybersecurity, data protection, and access-control practices.",
        "Testing systems, assuring quality, and improving performance and stability.",
        "Managing technical projects, teams, and vendors.",
        "Providing maintenance and technical support and diagnosing and resolving incidents.",
        "Developing and automating internal processes and systems.",
      ],
      ar: [
        "خبرة في تصميم وتطوير تطبيقات الهواتف متعددة المنصات.",
        "تطوير وإدارة المواقع الإلكترونية والمنصات الرقمية.",
        "تصميم واجهات المستخدم وتحسين تجربة المستخدم.",
        "تحليل المتطلبات وتحويل احتياجات الأعمال إلى حلول تقنية.",
        "بناء وإدارة قواعد البيانات والواجهات البرمجية والتكاملات.",
        "ربط الأنظمة بخدمات الدفع والخدمات الخارجية.",
        "إدارة الخوادم والبنية السحابية والنشر والتحديثات.",
        "تطبيق ممارسات الأمن السيبراني وحماية البيانات وإدارة الصلاحيات.",
        "اختبار الأنظمة وضمان الجودة وتحسين الأداء والاستقرار.",
        "إدارة المشاريع والفرق والموردين التقنيين.",
        "الصيانة والدعم الفني وتشخيص الأعطال ومعالجتها.",
        "تطوير وأتمتة الإجراءات والأنظمة الداخلية.",
      ],
    });
    expect(member?.bio?.tasks).toEqual({
      en: [
        "Designing and developing mobile applications, digital platforms, and websites.",
        "Managing technical infrastructure, servers, and cloud services.",
        "Managing databases, data protection, and backups.",
        "Overseeing cybersecurity, access controls, and technical risk management.",
        "Developing internal systems and integrations with external systems, payment services, and APIs.",
        "Managing technical projects, implementation, quality assurance, and testing.",
        "Improving user experience, interfaces, performance, and stability.",
        "Managing updates, maintenance, technical support, and incident resolution.",
        "Managing technology vendors, partners, and external services.",
        "Preparing technical plans and policies and ensuring business continuity.",
        "Evaluating and adopting new technologies and developing digital solutions.",
        "Providing technical reports and advice to executive management.",
      ],
      ar: [
        "تصميم وتطوير تطبيقات الهواتف والمنصات والمواقع الإلكترونية.",
        "إدارة البنية التحتية التقنية والخوادم والخدمات السحابية.",
        "إدارة قواعد البيانات وحماية البيانات والنسخ الاحتياطي.",
        "الإشراف على الأمن السيبراني وإدارة الصلاحيات والمخاطر التقنية.",
        "تطوير الأنظمة الداخلية والتكامل مع الأنظمة وخدمات الدفع والواجهات البرمجية.",
        "إدارة المشاريع التقنية ومتابعة التنفيذ وضمان الجودة والاختبارات.",
        "تحسين تجربة المستخدم والواجهات والأداء والاستقرار.",
        "إدارة التحديثات والصيانة والدعم الفني ومعالجة الأعطال.",
        "إدارة الموردين والشركاء والخدمات التقنية الخارجية.",
        "إعداد الخطط والسياسات التقنية وضمان استمرارية الأعمال.",
        "تقييم واعتماد التقنيات الجديدة وتطوير الحلول الرقمية.",
        "تقديم التقارير والاستشارات التقنية للإدارة التنفيذية.",
      ],
    });
  });
});

describe("Technical Operator profiles", () => {
  it("keeps the existing operator and publishes CODEZY as a second bilingual organisation", () => {
    const section = execSections.find((item) => item.roman === "V");
    const existingOperator = section?.members.find(
      (item) => item.name?.en === "GULF INTERNATIONAL Company",
    );
    const codezy = section?.members.find(
      (item) => item.name?.en === "CODEZY FOR TECH SOLUTIONS",
    );

    expect(existingOperator).toMatchObject({
      schemaType: "Organization",
      photo: "/images/team/gicc-logo.png",
    });
    expect(codezy).toEqual({
      schemaType: "Organization",
      title: {
        en: "Platform Technical Operator",
        ar: "المشغل التقني للمنصة",
      },
      name: {
        en: "CODEZY FOR TECH SOLUTIONS",
        ar: "كودزي لحلول التقنية",
      },
      photo: "/images/team/codezy-logo.png",
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
    });
  });
});
