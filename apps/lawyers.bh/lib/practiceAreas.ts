// Practice areas and government partners — sourced from the canonical
// GICC platform copy (lawyers.ksa / altujar.bh WordPress export).
export type PracticeAreaIconKey =
  | "family"
  | "inheritance"
  | "criminal"
  | "civil"
  | "labor"
  | "commercial"
  | "intellectual"
  | "administrative"
  | "execution"
  | "committees"
  | "medical"
  | "traffic"
  | "real_estate";
export type PracticeAreaBranch = {
  key: string;
  en: string;
  ar: string;
};

export type PracticeAreaCategory = {
  key: string;
  icon: PracticeAreaIconKey;
  en: string;
  ar: string;
  descEn: string;
  descAr: string;
  branches: PracticeAreaBranch[];
};

export const practiceAreaCategories: PracticeAreaCategory[] = [
{
  icon: "family",
  key: "family_personal_status",
  en: "Family & Personal Status Cases",
  ar: "قضايا الأسرة والأحوال الشخصية",
  descEn:
    "Covers marriage, divorce, khul‘, annulment, alimony, custody, visitation, guardianship, lineage, and mutual rights between spouses.",
  descAr:
    "يختص بقضايا الزواج والخلع وفسخ الزواج والنفقة والحضانة والزيارة والحقوق المتبادلة بين الزوجين.",
  branches: [
    { key: "custody", en: "Custody", ar: "حضانة" },
    { key: "alimony", en: "Alimony", ar: "نفقة" },
    { key: "divorce", en: "Divorce", ar: "طلاق" },
    { key: "marriage_proof", en: "Proof of Marriage", ar: "إثبات زواج" },
    { key: "marriage_annulment", en: "Marriage Annulment", ar: "فسخ الزواج" },
    { key: "khula", en: "Khula", ar: "خلع" },
    { key: "marital_rights", en: "Marital Rights", ar: "حقوق زوجية" },
    { key: "child_visitation", en: "Child Visitation", ar: "زيارة محضون" },
    { key: "nursing_or_custody_fee", en: "Breastfeeding or Custody Wages", ar: "أجرة إرضاع أو أجرة حضانة" },
    { key: "maintenance_support", en: "Dependency Support", ar: "إعالة" },
    { key: "marriage_prevention", en: "Adhl(Prevention of Marriage)", ar: 'عضل "منع الفتاة من الزواج"' },
    { key: "disobedience", en: "Nushuz(Marital Discord)", ar: 'نشوز "امتناع الزوجة عن أداء حقوق الزوجية أو الخروج من بيت الزوجية"' },
    { key: "gift_revocation", en: "Gift(Hibah) Revocation", ar: "الهبة أو الرجوع عنها" },
    { key: "documents_handover", en: "Document Handover", ar: "تسليم المستندات" },
    { key: "lineage_proof_denial", en: "Proof/Denial of Lineage", ar: "إثبات أو نفي نسب" },
    { key: "guardianship_restriction", en: "Interdiction (Hajr)", ar: "الحجر ورفع الحجر" },
    { key: "guardianship", en: "Guardianship", ar: "الولاية" },
    { key: "guardian_accountability", en: "Guardian Accountability", ar: "محاسبة ولي" },
  ],
},
 {
  icon: "inheritance",
  key: "inheritance_estates",
  en: "Inheritance & Estates Cases",
  ar: "قضايا إرث وتركات",
  descEn:
    "Covers inheritance division, estate settlement, heirs determination, wills, endowments, and related estate disputes.",
  descAr:
    "يختص بقضايا قسمة الإرث والتركات، حصر الورثة، تنفيذ الوصية والوقف، والمنازعات المتعلقة بالتركة.",
  branches: [
    {
      key: "amicable_estate_division",
      en: "Amicable Estate Division",
      ar: "قسمة تركات رضائية",
    },
    {
      key: "forced_estate_division",
      en: "Forced Estate Division",
      ar: "قسمة تركات إجبارية",
    },
    {
      key: "real_estate_inheritance_division",
      en: "Real Estate Inheritance Division",
      ar: "قسمة تركات عقارية",
    },
    {
      key: "corporate_inheritance_division",
      en: "Corporate Inheritance Division",
      ar: "قسمة تركات شركات",
    },
    {
      key: "financial_rights_of_deceased",
      en: "Divion of Inherited Financial Rights",
      ar: "قسمة حقوق مالية للمورث",
    },
    {
      key: "heir_determination",
      en: "Heir Determination ",
      ar: "حصر ورثة",
    },
    {
      key: "estate_inventory",
      en: "Estate Inventory",
      ar: "حصر تركة",
    },
    {
      key: "waiver_of_inheritance_share",
      en: "Waiver of Share in Esate",
      ar: "تنازل عن نصيب في التركة",
    },
    {
      key: "heirs_agent_accounting",
      en: "Heirs’ Agent Accountability",
      ar: "محاسبة وكيل ورثة",
    },
    {
      key: "proof_or_invalidation_of_will_or_endowment",
      en: "Proof/Annulment of Waqf/Will",
      ar: "إثبات الوقف أو الوصية أو إبطالهما",
    },
    {
      key: "proof_or_delivery_of_entitlement",
      en: "Proof or Entitlement",
      ar: "إثبات استحقاق أو تسليمه",
    },
    {
      key: "endowment_trustee_accounting_or_removal",
      en: "Nazir Accountability/Remval",
      ar: "محاسبة الناظر أو عزله",
    },
    {
      key: "endowments",
      en: "Endowments (Awqaf)",
      ar: "الأوقاف",
    },
  ],
},
{
  icon: "criminal",
  key: "criminal_cases",
  en: "Criminal Cases",
  ar: "قضايا جنائية",
  descEn:
    "Covers all criminal matters, including cybercrimes, theft, homicide, harassment, assault, fraud, forgery, bribery, extortion, money laundering, defamation, and related criminal complaints.",
  descAr:
    "يختص بكافة القضايا الجنائية ابتداءً بقضايا السب والشتم والقذف والنصب والاحتيال مروراً بجرائم الابتزاز والسرقة والاعتداء وصولاً إلى قضايا القتل",
  branches: [
    {
      key: "cybercrimes",
      en: "Cybercrimes",
      ar: "الجرائم المعلوماتية",
    },
    {
      key: "theft",
      en: "Theft",
      ar: "سرقة",
    },
    {
      key: "homicide",
      en: "Homicide",
      ar: "قتل",
    },
    {
      key: "harassment",
      en: "Harassment",
      ar: "تحرش",
    },
    {
      key: "insult_defamation",
      en: "Insult and Verbal Abuse",
      ar: "سب وشتم",
    },
    {
      key: "assault_harm",
      en: "Assault and Harm to Others",
      ar: "اعتداء وإيذاء الغير",
    },
    {
      key: "prohibited_substances",
      en: "Use or Consumption of Prohibited Substances",
      ar: "شرب وتعاطي الممنوعات",
    },
    {
      key: "impersonation",
      en: "Impersonation",
      ar: "انتحال الشخصية",
    },
    {
      key: "forgery",
      en: "Forgery",
      ar: "تزوير",
    },
    {
      key: "bribery",
      en: "Bribery",
      ar: "رشوة",
    },
    {
      key: "threats_extortion",
      en: "Threats and Extortion",
      ar: "تهديد وابتزاز",
    },
    {
      key: "money_laundering",
      en: "Money Laundering",
      ar: "غسيل أموال",
    },
    {
      key: "harboring_or_concealment",
      en: "Harboring or Concealing Another Person",
      ar: "تستر على الغير",
    },
    {
      key: "breach_of_trust",
      en: "Breach of Trust",
      ar: "خيانة أمانة",
    },
    {
      key: "malicious_complaints",
      en: "Malicious Complaints",
      ar: "شكاوى كيدية",
    },
    {
      key: "commercial_fraud",
      en: "Commercial Fraud",
      ar: "غش تجاري",
    },
    {
      key: "commercial_concealment",
      en: "Commercial Concealment",
      ar: "تستر تجاري",
    },
    {
      key: "fraud_scam",
      en: "Fraud and Scam",
      ar: "نصب واحتيال",
    },
    {
      key: "defamation",
      en: "Defamation",
      ar: "تشهير",
    },
    {
      key: "reputation_damage_rehabilitation",
      en: "Reputation Damage and Rehabilitation",
      ar: "تشويه السمعة ورد الاعتبار",
    },
    {
      key: "kidnapping",
      en: "Kidnapping",
      ar: "خطف",
    },
  ],
},
  {
  icon: "civil",
  key: "civil_general_rights",
  en: "Civil & General Rights Cases",
  ar: "قضايا حقوق عامة",
  descEn:
    "Covers civil and general rights disputes, including loans, sale and purchase disputes, violations by a legal agent, proof of ownership, financial claims, urgent lawsuits, rental delays, refusal to vacate properties, and related matters.",
  descAr:
    "يختص بقضايا الحقوق العامة والمدنية، مثل القروض، البيع والشراء، مخالفات الوكيل الشرعي، إثبات الملكية، المطالبات المالية، والدعاوى المستعجلة، وما يتصل بها من منازعات السداد والعقار والإخلاء.",
  branches: [
    {
      key: "loans",
      en: "Loans",
      ar: "قرض",
    },
    {
      key: "sale_purchase",
      en: "Sale and Purchase",
      ar: "بيع وشراء",
    },
    {
      key: "legal_agent_violations",
      en: "Legal Agent Violations",
      ar: "مخالفات الوكيل الشرعي",
    },
    {
      key: "proof_of_ownership",
      en: "Proof of Ownership",
      ar: "إثبات ملكية",
    },
    {
      key: "financial_claims",
      en: "Financial Claims",
      ar: "مطالبات مالية",
    },
    {
      key: "urgent_lawsuits",
      en: "Urgent Lawsuits",
      ar: "الدعاوى المستعجلة",
    },
  ],
},
{
  icon: "labor",
  key: "labor_employment",
  en: "Labor & Employment Cases",
  ar: "قضايا العمل",
  descEn:
    "Covers labor and employment disputes, including employment contracts, wages, allowances, working hours, overtime, leave, work injuries, disciplinary penalties, unfair dismissal, resignation, end-of-service benefits, compensation, and the rights and duties of both employees and employers.",
  descAr:
    "يختص بقضايا عقود العمل والأجور وإصابات العمل والتعويض عنها، والمنازعات المترتبة على الفصل من العمل، والاستقالة، ومكافأة نهاية الخدمة، والجزاءات التأديبية، وحقوق وواجبات العامل وصاحب العمل.",
  branches: [
    {
      key: "termination_of_employment",
      en: "Termination of Employment Relationship",
      ar: "إنهاء العلاقة العمالية",
    },
    {
      key: "unfair_dismissal",
      en: "Unfair Dismissal",
      ar: "فصل تعسفي",
    },
    {
      key: "resignation",
      en: "Resignation",
      ar: "استقالة",
    },
    {
      key: "disciplinary_penalties",
      en: "Disciplinary Penalties",
      ar: "العقوبات التأديبية",
    },
    {
      key: "end_of_service_benefits",
      en: "End-of-Service Benefits",
      ar: "مكافأة نهاية خدمة",
    },
    {
      key: "documents_certificates_experience",
      en: "Documents, Certificates, and Experience Certificate",
      ar: "المستندات والوثائق وشهادة خبرة",
    },
    {
      key: "wages_salaries_allowances",
      en: "Wages, Salaries, and Allowances",
      ar: "الأجور والرواتب والبدلات",
    },
    {
      key: "working_hours_overtime",
      en: "Official Working Hours and Overtime",
      ar: "ساعات العمل الرسمية والعمل الإضافي",
    },
    {
      key: "leaves",
      en: "Leaves",
      ar: "إجازات",
    },
    {
      key: "work_injuries",
      en: "Work Injuries",
      ar: "إصابات العمل",
    },
    {
      key: "healthcare_medical_insurance",
      en: "Healthcare and Medical Insurance",
      ar: "الرعاية الصحية والتأمين الطبي",
    },
    {
      key: "employment_contracts",
      en: "Employment Contracts",
      ar: "عقود العمل",
    },
    {
      key: "employee_rights_duties",
      en: "Employee Rights and Duties",
      ar: "حقوق وواجبات العامل",
    },
    {
      key: "employer_rights_duties",
      en: "Employer Rights and Duties",
      ar: "حقوق وواجبات صاحب العمل",
    },
    {
      key: "compensation",
      en: "Compensation",
      ar: "التعويضات",
    },
  ],
},
{
  icon: "commercial",
  key: "commercial_cases",
  en: "Commercial Cases",
  ar: "قضايا تجارية",
  descEn:
    "Covers commercial transactions, partnership disputes, sale and purchase, contracting, installments, import and export, transport, commercial agencies, brokerage, commercial contracts, e-commerce, commercial regulations, bankruptcy, and related compensation claims.",
  descAr:
    "يختص بقضايا المعاملات التجارية والمنافسة ومنع الاحتكار والتجارة الإلكترونية والأسواق المالية والأسهم والمنازعات بين الشركاء والإفلاس وشطب وتصفية السجل التجاري.",
  branches: [
    {
      key: "proof_of_partnership",
      en: "Proof of Partnership",
      ar: "إثبات شراكة",
    },
    {
      key: "partner_disputes",
      en: "Partner Disputes",
      ar: "نزاعات شركاء",
    },
    {
  key: "partner_exit",
  en: "Partner Exit",
  ar: "مخارجة الشركاء",
},
{
  key: "legal_liquidation",
  en: "Legal Liquidation",
  ar: "التصفية القانونية",
},
    {
      key: "sale_purchase",
      en: "Sale and Purchase",
      ar: "بيع وشراء",
    },
    {
      key: "contracting",
      en: "Contracting",
      ar: "مقاولات",
    },
    {
      key: "installments",
      en: "Installments",
      ar: "تقسيط",
    },
    {
      key: "import_export",
      en: "Import and Export",
      ar: "استيراد وتصدير",
    },
    {
      key: "transport",
      en: "Transport",
      ar: "نقل",
    },
    {
      key: "commercial_agency",
      en: "Commercial Agency",
      ar: "وكالة تجارية",
    },
    {
      key: "brokerage",
      en: "Brokerage",
      ar: "سمسرة",
    },
    {
      key: "operation_contracts",
      en: "Operation Contracts",
      ar: "عقود التشغيل",
    },
    {
      key: "service_contracts",
      en: "Service Contracts",
      ar: "عقود الخدمات",
    },
    {
      key: "commercial_contracts",
      en: "Commercial Contracts",
      ar: "العقود التجارية",
    },
    {
      key: "penalty_clauses",
      en: "Penalty Clauses",
      ar: "الشروط الجزائية",
    },
    {
      key: "warranty_compensation",
      en: "Warranty and Compensation",
      ar: "الضمان والتعويض",
    },
    {
      key: "ecommerce",
      en: "E-Commerce",
      ar: "التجارة الإلكترونية",
    },
    {
      key: "commercial_regulations",
      en: "Commercial Regulations",
      ar: "الأنظمة التجارية",
    },
    {
      key: "bankruptcy",
      en: "Bankruptcy",
      ar: "الإفلاس",
    },
  ],
},
  {
  icon: "intellectual",
  key: "intellectual_property",
  en: "Intellectual Property Cases",
  ar: "قضايا الملكية الفكرية",
  descEn:
    "Covers intellectual property matters, including trademarks, trademark objections, copyrights, publishing and distribution rights, patents, trade secrets, and related infringement claims.",
  descAr:
    "يختص بقضايا الملكية الفكرية، مثل العلامات التجارية، والاعتراض على العلامات التجارية، وحقوق المؤلف، والنشر والتوزيع، وبراءات الاختراع، والأسرار التجارية، وما يتعلق بها من مطالبات وانتهاكات.",
  branches: [
    {
      key: "trademarks",
      en: "Trademarks",
      ar: "العلامات التجارية",
    },
    {
      key: "trademark_objection",
      en: "Trademark Objection",
      ar: "اعتراض على علامة تجارية",
    },
    {
      key: "copyrights",
      en: "Copyrights",
      ar: "حقوق المؤلف",
    },
    {
      key: "publishing_distribution",
      en: "Publishing and Distribution",
      ar: "النشر والتوزيع",
    },
    {
      key: "patents",
      en: "Patents",
      ar: "براءات الاختراع",
    },
  ],
},
{
  icon: "administrative",
  key: "administrative_cases",
  en: "Administrative Cases",
  ar: "قضايا إدارية",
  descEn:
    "Covers administrative law matters, including challenges against administrative decisions, compensation claims against government entities, government employment disputes, administrative contracts, government fines, and disciplinary cases involving public employees.",
  descAr:
    "يختص بقضايا إلغاء القرارات الإدارية والطعن في صحتها، وقضايا التعويض ضد الجهات الحكومية، والغرامات الحكومية، والعقود الإدارية، والقضايا التأديبية ضد موظفي الدولة.",
  branches: [
    {
      key: "government_employment",
      en: "Government Employment",
      ar: "الوظائف الحكومية",
    },
    {
      key: "government_fines",
      en: "Government Fines",
      ar: "الغرامات الحكومية",
    },
    {
      key: "administrative_decisions",
      en: "Administrative Decisions",
      ar: "القرارات الإدارية",
    },
    {
      key: "administrative_contracts",
      en: "Administrative Contracts",
      ar: "عقود إدارية",
    },
    {
      key: "administrative_judiciary",
      en: "Administrative Judiciary",
      ar: "القضاء الإداري",
    },
  ],
},
{
  icon: "execution",
  key: "execution_cases",
  en: "Enforcement Cases",
  ar: "قضايا التنفيذ",
  descEn:
    "Covers enforcement procedures, including the enforcement of judicial judgments, instruments, cheques, service suspension requests, asset seizure, and arrest warrants.",
  descAr:
    "يختص بقضايا وإجراءات التنفيذ، مثل تنفيذ الأحكام القضائية، وتنفيذ السندات والشيكات، وإيقاف الخدمات، وحجز الأموال، وأوامر القبض.",
  branches: [
    {
      key: "judgment_enforcement",
      en: "Enforcement of Judicial Judgments",
      ar: "تنفيذ الأحكام القضائية",
    },
    {
      key: "instruments_cheques_enforcement",
      en: "Enforcement of Instruments and Cheques",
      ar: "تنفيذ السندات والشيكات",
    },
    {
      key: "service_suspension",
      en: "Service Suspension",
      ar: "إيقاف الخدمات",
    },
    {
      key: "asset_seizure",
      en: "Asset Seizure",
      ar: "حجز الأموال",
    },
  ],
},

{
  icon: "committees",
  key: "quasi_judicial_committees",
  en: "Quasi-Judicial Committees Cases",
  ar: "قضايا اللجان شبه القضائية",
  descEn:
    "Covers disputes and violations handled by quasi-judicial committees, including securities, banking, financing, credit information, media, insurance, tax, customs, trademarks, copyrights, and patents committees.",
  descAr:
    "تختص بالفصل في المنازعات والمخالفات التي توكلها إليها الأنظمة أو اللوائح، مثل لجان الأوراق المالية، والمنازعات المصرفية والتمويلية، واللجان الضريبية والجمركية، ولجان العلامات التجارية وحقوق المؤلف وبراءات الاختراع.",
  branches: [
    {
      key: "securities_disputes_committee",
      en: "Committee for the Resolution of Securities Disputes",
      ar: "لجان الفصل في منازعات الأوراق المالية",
    },
    {
      key: "securities_appeal_committee",
      en: "Appeal Committee for Securities Disputes",
      ar: "لجنة الاستئناف في منازعات الأوراق المالية",
    },
    {
      key: "banking_disputes_violations_committee",
      en: "Banking Disputes and Violations Committees",
      ar: "لجان المنازعات والمخالفات المصرفية",
    },
    {
      key: "banking_disputes_violations_appeal_committee",
      en: "Appeal Committee for Banking Disputes and Violations",
      ar: "اللجنة الاستئنافية للمنازعات والمخالفات المصرفية",
    },
    {
      key: "financing_disputes_violations_committee",
      en: "Committee for Financing Violations and Disputes",
      ar: "لجنة الفصل في المخالفات والمنازعات التمويلية",
    },
    {
      key: "financing_disputes_violations_appeal_committee",
      en: "Appeal Committee for Financing Violations and Disputes",
      ar: "اللجنة الاستئنافية للفصل في المخالفات والمنازعات التمويلية",
    },
    {
      key: "credit_information_violations_committee",
      en: "Committee for Credit Information Law Violations",
      ar: "لجنة النظر في مخالفات نظام المعلومات الائتمانية",
    },
    {
      key: "banking_control_violations_committee",
      en: "Committee for Banking Control Law Violations",
      ar: "لجنة الفصل في مخالفات نظام مراقبة البنوك",
    },
    {
      key: "printing_publishing_violations_primary_committee",
      en: "Primary Committee for Printing and Publishing Law Violations",
      ar: "اللجنة الابتدائية لنظر مخالفات أحكام نظام المطبوعات والنشر",
    },
    {
      key: "audiovisual_media_violations_primary_committee",
      en: "Primary Committee for Audiovisual Media Law Violations",
      ar: "اللجنة الابتدائية لنظر مخالفات أحكام نظام الإعلام المرئي والمسموع",
    },
    {
      key: "media_authority_appeal_committee",
      en: "Appeal Committee of the General Authority for Media Regulation",
      ar: "اللجنة الاستئنافية للجان الهيئة العامة لتنظيم الإعلام",
    },
    {
      key: "insurance_disputes_violations_primary_committees",
      en: "Primary Committees for Insurance Disputes and Violations",
      ar: "اللجان الابتدائية للفصل في المنازعات والمخالفات التأمينية",
    },
    {
      key: "insurance_disputes_violations_appeal_committee",
      en: "Appeal Committee for Insurance Disputes and Violations",
      ar: "اللجنة الاستئنافية للفصل في المنازعات والمخالفات التأمينية",
    },
    {
      key: "tax_disputes_violations_committee",
      en: "Committee for Tax Violations and Disputes",
      ar: "لجنة الفصل في المخالفات والمنازعات الضريبية",
    },
    {
      key: "tax_disputes_violations_appeal_committee",
      en: "Appeal Committee for Tax Violations and Disputes",
      ar: "اللجنة الاستئنافية للمخالفات والمنازعات الضريبية",
    },
    {
      key: "customs_disputes_violations_committee",
      en: "Committee for Customs Violations and Disputes",
      ar: "لجنة الفصل في المخالفات والمنازعات الجمركية",
    },
    {
      key: "customs_disputes_violations_appeal_committee",
      en: "Appeal Committee for Customs Violations and Disputes",
      ar: "اللجنة الاستئنافية للمخالفات والمنازعات الجمركية",
    },
    {
      key: "trademark_grievances_committee",
      en: "Committee for Trademark Grievances",
      ar: "لجنة النظر في تظلمات العلامات التجارية",
    },
    {
      key: "copyright_violations_committee",
      en: "Committee for Copyright Law Violations",
      ar: "لجنة النظر في مخالفات نظام حماية حقوق المؤلف",
    },
    {
      key: "patent_claims_committee",
      en: "Committee for Patent Claims",
      ar: "لجنة النظر في دعاوى براءات الاختراع",
    },
  ],
},

{
  icon: "medical",
  key: "medical_errors",
  en: "Medical Errors Cases",
  ar: "قضايا الأخطاء الطبية",
  descEn:
    "Covers legal matters related to medical errors and healthcare liability, including complaints against healthcare facilities, violations of healthcare professional practice regulations, and compensation claims for medical malpractice.",
  descAr:
    "يختص بالقضايا المتعلقة بالمسؤولية القانونية الناشئة عن الأخطاء الطبية، مثل الشكاوى ضد المنشآت الصحية، ومخالفات نظام مزاولة المهن الصحية، والمطالبة بالتعويض عن الأضرار الناتجة عن الأخطاء الطبية.",
  branches: [
    {
      key: "medical_errors",
      en: "Medical Errors",
      ar: "الأخطاء الطبية",
    },
    {
      key: "complaint_against_healthcare_facility",
      en: "Complaint Against a Healthcare Facility",
      ar: "شكوى ضد منشأة صحية",
    },
    {
      key: "healthcare_profession_practice_violation",
      en: "Violation of Healthcare Professional Practice Regulations",
      ar: "مخالفة نظام مزاولة المهن الصحية",
    },
    {
      key: "medical_malpractice_compensation",
      en: "Compensation for Medical Malpractice",
      ar: "التعويض عن الأخطاء الطبية",
    },
  ],
},

{
  icon: "traffic",
  key: "traffic_cases",
  en: "Traffic Cases",
  ar: "قضايا مرورية",
  descEn:
    "Covers traffic-related legal matters, including traffic law violations, road accidents, vehicle insurance disputes, compensation claims, and related procedures.",
  descAr:
    "يختص بالقضايا المتعلقة بنظام المرور والحوادث المرورية وتأمين المركبات، وما يترتب عليها من مخالفات وتعويضات ومطالبات وإجراءات قانونية.",
  branches: [
    {
      key: "traffic_violations",
      en: "Traffic Law Violations",
      ar: "مخالفات نظام المرور",
    },
    {
      key: "traffic_accidents",
      en: "Traffic Accidents",
      ar: "الحوادث المرورية",
    },
    {
      key: "vehicle_insurance",
      en: "Vehicle Insurance",
      ar: "تأمين المركبات",
    },
  ],
},
{
  icon: "real_estate",
  key: "real_estate_cases",
  en: "Real Estate Cases",
  ar: "قضايا عقارية",
  descEn:
    "Covers real estate legal matters, including proof of property ownership, property eviction, sale and purchase of real estate, rental disputes, real estate brokerage, property boundary overlaps, lease termination, compensation for property use, and recovery of property possession.",
  descAr:
    "يختص بالقضايا المتعلقة بالمعاملات والمنازعات العقارية، مثل إثبات ملكية العقار، وإخلاء العقار، وبيع وشراء العقارات، وأجرة العقار، والوساطة العقارية، وتداخل العقارات، وفسخ عقود الإيجار، والتعويض عن الانتفاع بالعقار، واسترداد حيازة العقار.",
  branches: [
    {
      key: "proof_of_property_ownership",
      en: "Proof of Property Ownership",
      ar: "إثبات ملكية عقار",
    },
    {
      key: "property_eviction",
      en: "Property Eviction",
      ar: "إخلاء عقار",
    },
    {
      key: "real_estate_sale_purchase",
      en: "Real Estate Sale and Purchase",
      ar: "بيع وشراء عقار",
    },
    {
      key: "property_rent",
      en: "Property Rent",
      ar: "أجرة عقار",
    },
    {
      key: "real_estate_brokerage",
      en: "Real Estate Brokerage",
      ar: "وساطة عقارية",
    },
    {
      key: "property_overlap",
      en: "Property Boundary Overlap",
      ar: "تداخل عقارات",
    },
    {
      key: "lease_termination",
      en: "Lease Termination",
      ar: "فسخ عقد إيجار",
    },
    {
      key: "compensation_for_property_use",
      en: "Compensation for Property Use",
      ar: "تعويض انتفاع من عقار",
    },
    {
      key: "recovery_of_property_possession",
      en: "Recovery of Property Possession",
      ar: "استرداد حيازة عقار",
    },
  ],
},
];


export interface GovernmentPartner {
  key: string;
  en: string;
  ar: string;
  acronym?: string;
  url?: string;
  /**
   * Path to the official authority logo under /public/images/government/.
   * When set, ClearanceServices renders the logo in place of the generic
   * Building2 icon. When undefined, the generic icon is used as a fallback
   * — so dropping in a file at /public/images/government/<filename> is the
   * only step needed once you have the official artwork.
   * See /public/images/government/README.md for the canonical source URLs.
   */
  logo?: string;
}

// Canonical ministry roster — sourced from the client-supplied
// "الشعارات و الوازارات" docx. Order follows the doc verbatim so the
// site matches the official handout. All logos are transparent WebP
// under /public/images/government/ except the Interior logo, which
// retains its navy panel because that's part of its brand identity.
export const governmentPartners: GovernmentPartner[] = [
  {
    key: "moi",
    en: "Ministry of Interior",
    ar: "وزارة الداخلية",
    logo: "/images/government/moi.webp",
    url: "https://www.interior.gov.bh",
  },
  {
    key: "npra",
    en: "Nationality, Passports & Residence Affairs",
    ar: "شؤون الجنسية والجوازات والإقامة",
    logo: "/images/government/npra.webp",
    url: "https://www.npra.gov.bh",
  },
  {
    key: "mofa",
    en: "Ministry of Foreign Affairs",
    ar: "وزارة الخارجية",
    logo: "/images/government/mofa.webp",
    url: "https://www.mofa.gov.bh",
  },
  {
    key: "mofne",
    en: "Ministry of Finance and National Economy",
    ar: "وزارة المالية والاقتصاد الوطني",
    logo: "/images/government/mofne.webp",
    url: "https://www.mofne.gov.bh",
  },
  {
    key: "moe",
    en: "Ministry of Education",
    ar: "وزارة التربية والتعليم",
    logo: "/images/government/moe.webp",
    url: "https://moe.gov.bh",
  },
  {
    key: "moh",
    en: "Ministry of Health",
    ar: "وزارة الصحة",
    logo: "/images/government/moh.webp",
    url: "https://www.moh.gov.bh",
  },
  {
    key: "mow",
    en: "Ministry of Works",
    ar: "وزارة الأشغال",
    logo: "/images/government/mow.webp",
    url: "https://www.works.gov.bh",
  },
  {
    key: "mohup",
    en: "Ministry of Housing and Urban Planning",
    ar: "وزارة الإسكان والتخطيط العمراني",
    logo: "/images/government/mohup.webp",
    url: "https://www.housing.gov.bh",
  },
  {
    key: "moic",
    en: "Ministry of Industry and Commerce",
    ar: "وزارة الصناعة والتجارة",
    logo: "/images/government/moic.webp",
    url: "https://www.moic.gov.bh",
  },
  {
    key: "mol",
    en: "Ministry of Labour",
    ar: "وزارة العمل",
    logo: "/images/government/mol.webp",
    url: "https://www.mol.gov.bh",
  },
  {
    key: "moj",
    en: "Ministry of Justice, Islamic Affairs and Endowments",
    ar: "وزارة العدل والشؤون الإسلامية والأوقاف",
    logo: "/images/government/moj.webp",
    url: "https://www.moj.gov.bh",
  },
  {
    key: "mosd",
    en: "Ministry of Social Development",
    ar: "وزارة التنمية الاجتماعية",
    logo: "/images/government/mosd.webp",
    url: "https://www.social.gov.bh",
  },
  {
    key: "mot",
    en: "Ministry of Tourism",
    ar: "وزارة السياحة",
    logo: "/images/government/mot.webp",
    url: "https://www.bahrain.com",
  },
  {
    key: "moca",
    en: "Ministry of Cabinet Affairs",
    ar: "وزارة شؤون مجلس الوزراء",
    logo: "/images/government/moca.webp",
  },
  {
    key: "mosha",
    en: "Ministry of Shura Council and House of Representatives Affairs",
    ar: "وزارة شؤون مجلسي الشورى والنواب",
    logo: "/images/government/mosha.webp",
    url: "https://mopa.gov.bh",
  },
  {
    key: "moya",
    en: "Ministry of Youth Affairs",
    ar: "وزارة شؤون الشباب",
    logo: "/images/government/moya.webp",
    url: "https://www.mya.gov.bh",
  },
  {
    key: "moinfo",
    en: "Ministry of Information",
    ar: "وزارة الإعلام",
    logo: "/images/government/moinfo.webp",
    url: "https://www.mia.gov.bh",
  },
  {
    key: "mosusd",
    en: "Ministry of Sustainable Development",
    ar: "وزارة التنمية المستدامة",
    logo: "/images/government/mosusd.webp",
    url: "https://sdgs.gov.bh",
  },
];
