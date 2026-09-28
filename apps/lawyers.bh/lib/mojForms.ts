/**
 * MoJ Forms catalog — official forms published by the Ministry of Justice,
 * Islamic Affairs and Endowments. Sourced from the client. Forms themselves
 * are Arabic-language PDFs; the original Arabic filename is the canonical
 * title. We expose an English summary of each category for non-Arabic users.
 *
 * Files live under /public/forms/moj/{category-slug}/{filename}.pdf and are
 * served as static assets. Filenames are URL-encoded at link time.
 */

export type MojForm = {
  /** Original Arabic filename (no path, no leading dash). Becomes the visible label. */
  ar: string;
  /** Short English label for non-Arabic readers. Optional — falls back to ar. */
  en?: string;
  /** Filename on disk inside the category folder. Includes ".pdf". */
  file: string;
};

export type MojFormCategory = {
  slug: string;
  title: { en: string; ar: string };
  forms: MojForm[];
};

const cleanLabel = (file: string): string =>
  file.replace(/^[-\s]+/, "").replace(/\.pdf$/i, "").trim();

// Helper that turns a file list into MojForm[] with auto-derived ar label.
const f = (files: ReadonlyArray<readonly [string, string?]>): MojForm[] =>
  files.map(([file, en]) => ({ file, ar: cleanLabel(file), en }));

export const MOJ_FORM_CATEGORIES: MojFormCategory[] = [
  {
    slug: "case-registration",
    title: {
      en: "Case & Complaint Registration",
      ar: "استمارات تسجيل الدعاوى والشكاوى",
    },
    forms: f([
      ["-استمارة بيانات المتقاضين.pdf", "Litigants Data Form"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى دعوى مدنية.pdf", "Required Documents Checklist — Civil Case"],
      ["-احوال شخصية لغير المسلمين- قائمة المستندات الواجب استيفائها.pdf", "Required Documents — Personal Status (non-Muslim)"],
      ["-اثبات ملكية قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى.pdf", "Required Documents — Proof of Ownership"],
      ["-بدل فاقد لوثيقة عقارية قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى.pdf", "Required Documents — Lost Real-Estate Document Replacement"],
      ["-تاجير معدات وسيارات قائمة المستندات الواجب استيفائها.pdf", "Required Documents — Equipment & Vehicle Lease"],
      ["-تعين محكم- قائمة المستندات الواجب استيفائها.pdf", "Required Documents — Arbitrator Appointment"],
      ["-تقرير بالطعن أمام محكمة التمييز.pdf", "Cassation Court Appeal Report"],
      ["-دعوى ايجارية- قائمة المستندات الواجب استيفائها.pdf", "Required Documents — Rental Dispute"],
      ["-دعوى الدائن لافتتاح اجراءات الافلاس - مستندات.pdf", "Creditor's Bankruptcy Petition Documents"],
      ["-دعوى المدين لافتتاح اجراءات الافلاس.pdf", "Debtor's Bankruptcy Petition"],
      ["-دعوى تنفيذ حكم أجبني أو حكم تحكيم والطعن عليه - قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى.pdf", "Required Documents — Foreign / Arbitral Award Enforcement"],
      ["-طلب فرز عقار قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى.pdf", "Required Documents — Real-Estate Partition Request"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- اتصالات و كهرباء.pdf", "Required Documents — Telecom & Electricity"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- اضافة لقب.pdf", "Required Documents — Surname Addition"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- تامينات الاجتماعية.pdf", "Required Documents — Social Insurance"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- تعويض عن اصابات.pdf", "Required Documents — Injury Compensation"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- تعويض عن وفاة.pdf", "Required Documents — Death Compensation"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- دعوى تركة.pdf", "Required Documents — Estate Case"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- شهادة ميلاد.pdf", "Required Documents — Birth Certificate"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- عقد توريد.pdf", "Required Documents — Supply Contract"],
      ["-قائمة المستندات الواجب استيفائها عند تسجيل الدعاوى- عقد قرض.pdf", "Required Documents — Loan Contract"],
      ["-إعلان الحكم الغيابي.pdf", "Notice of Default Judgment"],
      ["-إعلان بالأمر الجنائي.pdf", "Notice of Criminal Order"],
      ["-إعلان حكم حضور إعتباري.pdf", "Notice of Constructive Appearance Judgment"],
    ]),
  },
  {
    slug: "execution",
    title: {
      en: "Execution",
      ar: "استمارات التنفيذ",
    },
    forms: f([
      ["اخطار المنفذ ضده بالوفاء بمحل السند التنفيذي.pdf", "Notice to Debtor for Fulfilment of Executive Bond"],
      ["استمار تخويل المنفذ الخاص.pdf", "Authorization Form for Private Executor"],
      ["استمارة افصاح الأفراد.pdf", "Disclosure Form — Individuals"],
      ["استمارة افصاح للشركات التجارية.pdf", "Disclosure Form — Commercial Companies"],
      ["استمارة إفصاح للمؤسسات الفردية والاشخاص الاعتبارية من غير الشركات التجارية.pdf", "Disclosure Form — Sole Establishments & Other Legal Persons"],
      ["استمارة تقديم طلب الحصول على ترخيص بمزاولة أعمال المنفذ الخاص.pdf", "Application — Private Executor License"],
    ]),
  },
  {
    slug: "notarization",
    title: {
      en: "Notarization",
      ar: "استمارات التوثيق",
    },
    forms: f([
      ["-استمارة أعرف عميلك.pdf", "Know Your Customer (KYC)"],
      ["-استمارة اعرف عميلك شخص (إعتباري,طبيعي).pdf", "KYC — Legal & Natural Person"],
      ["-استمارة اعرف عميلك شخص طبيعي.pdf", "KYC — Natural Person"],
      ["-استمارة طلب الحصول على ترخيص لمزاولة أعمال الموثق الخاص.pdf", "Application — Private Notary License"],
    ]),
  },
  {
    slug: "criminal-courts",
    title: {
      en: "Criminal Courts",
      ar: "استمارات المحاكم الجنائية",
    },
    forms: f([
      ["-النموذج الموحد لطلبات المحاكم الجنائية.pdf", "Unified Application Form — Criminal Courts"],
      ["-التقرير بالإستئناف - المعارضة.pdf", "Appeal / Opposition Report"],
      ["-استمارة تقدير اتعاب.pdf", "Fee Assessment Form"],
      ["-استمارة طلب لقاضي تنفيذ العقاب.pdf", "Application to Penalty-Execution Judge"],
      ["-إعلان الحكم الغيابي.pdf", "Notice of Default Judgment"],
      ["-إعلان بالأمر الجنائي.pdf", "Notice of Criminal Order"],
      ["-إعلان حكم حضور إعتباري.pdf", "Notice of Constructive Appearance Judgment"],
      ["-لائحة التظلم من حفظ الاوراق.pdf", "Grievance Petition — Case Filing"],
    ]),
  },
  {
    slug: "sharia-procedures",
    title: {
      en: "Sharia Procedures (Marriage & Divorce)",
      ar: "الإجراءات الشرعية (الزواج والطلاق)",
    },
    forms: f([
      ["-استمارة طلب إجراء عقد زواج (لغير البحرينيين)(سنية).pdf", "Marriage Contract Request — Non-Bahraini (Sunni)"],
      ["-استمارة طلب إجراء عقد زواج (لغير البحرينيين)(جعفرية).pdf", "Marriage Contract Request — Non-Bahraini (Jaafari)"],
      ["- استمارة شهادة اثبات الزواج فقط (جعفرية).pdf", "Marriage Certification (Jaafari)"],
      ["-استمارة شهادة اثبات الزواج فقط (سنية).pdf", "Marriage Certification (Sunni)"],
      ["-استمارة التصديق على عقود الزواج الصادرة من الخارج (سنيه).pdf", "Foreign Marriage Authentication (Sunni)"],
      ["-استمارة التصديق على عقود الزواج الصادرة من الخارج (جعفرية).pdf", "Foreign Marriage Authentication (Jaafari)"],
      ["-استمارة معادلة نكاح من الخارج(سنية).pdf", "Foreign Marriage Equivalence (Sunni)"],
      ["-استمارة معادلة نكاح من الخارج(جعفرية).pdf", "Foreign Marriage Equivalence (Jaafari)"],
      ["-استمارة تصريح بالزواج في الخارج للرجل (سنيه).pdf", "Permit to Marry Abroad — Male (Sunni)"],
      ["-استمارة تصريح بالزواج في الخارج للرجل (جعفرية).pdf", "Permit to Marry Abroad — Male (Jaafari)"],
      ["-استمارة تصريح بالزواج في الخارج للمرأة (سنية).pdf", "Permit to Marry Abroad — Female (Sunni)"],
      ["-استمارة تصريح بالزواج في الخارج للمرأة (جعفرية).pdf", "Permit to Marry Abroad — Female (Jaafari)"],
      ["-استمارة طلب وثيقة عقد بدل فاقد (سنية).pdf", "Lost Marriage Contract Replacement (Sunni)"],
      ["-استمارة طلب وثيقة عقد بدل فاقد (جعفرية).pdf", "Lost Marriage Contract Replacement (Jaafari)"],
      ["-استمارة شهادة اثبات الطلاق (سنية).pdf", "Divorce Certification (Sunni)"],
      ["-استمارة شهادة اثبات الطلاق (جعفرية).pdf", "Divorce Certification (Jaafari)"],
      ["-استمارة طلب اصدار وثيقة طلاق ( الجديدة) (سنية).pdf", "New Divorce Document Request (Sunni)"],
      ["-استمارة طلب اصدار وثيقة طلاق ( الجديدة) (جعفرية).pdf", "New Divorce Document Request (Jaafari)"],
      ["-استمارة طلب وثيقة طلاق بدل فاقد(سنية).pdf", "Lost Divorce Document Replacement (Sunni)"],
      ["-استمارة طلب وثيقة طلاق بدل فاقد(جعفرية).pdf", "Lost Divorce Document Replacement (Jaafari)"],
      ["-استمارة معادلة طلاق من الخارج (سنية).pdf", "Foreign Divorce Equivalence (Sunni)"],
      ["-استمارة معادلة طلاق من الخارج (جعفرية).pdf", "Foreign Divorce Equivalence (Jaafari)"],
      ["-استمارة طلب اصدار وثيقة اثبات رجعة(سنية).pdf", "Reconciliation Document Request (Sunni)"],
      ["-استمارة طلب اصدار وثيقة اثبات رجعة(جعفرية).pdf", "Reconciliation Document Request (Jaafari)"],
      ["-استمارة شهادة اثبات الترمل ووفاة الزوجة(سنية).pdf", "Widowhood / Spouse Death Certification (Sunni)"],
      ["-استمارة شهادة اثبات الترمل ووفاة الزوجة(جعفري).pdf", "Widowhood / Spouse Death Certification (Jaafari)"],
      ["-طبق الاصل (سنية).pdf", "Certified Copy (Sunni)"],
      ["-طبق الاصل (جعفرية).pdf", "Certified Copy (Jaafari)"],
    ]),
  },
  {
    slug: "sharia-research",
    title: {
      en: "Sharia Research (Inheritance, Endowments, Wills)",
      ar: "البحث الشرعي (الفرائض والهبات والوصايا والوقفيات)",
    },
    forms: f([
      ["-استمارة طلب فريضة شرعية (حصر الورثة).pdf", "Sharia Inheritance Request (Heirs Determination)"],
      ["-استمارة طلب مناسخة شرعية (دمج الفرائض والوثائق الشرعية).pdf", "Sharia Re-Distribution Request"],
      ["-استمارة طلب (هبة شرعية) - (تنازل في فريضة شرعية).pdf", "Sharia Gift / Inheritance Waiver Request"],
      ["-استمارة طلب وصية شرعية.pdf", "Sharia Will Request"],
      ["-استمارة طلب وقف شرعي.pdf", "Sharia Endowment Request"],
      ["-استمارة طلب عُمْرَى شرعية (هبة حق السكن في العقار).pdf", "Sharia 'Umra Request (Right of Residence Gift)"],
      ["-استمارة طبق الأصل (فريضة - هبة - تنازل - وصية - عُمْرَى - وقف).pdf", "Certified Copy — Inheritance/Gift/Waiver/Will/'Umra/Endowment"],
    ]),
  },
  {
    slug: "minor-funds",
    title: {
      en: "Minor's Funds Administration",
      ar: "أموال القاصرين",
    },
    forms: f([
      ["-خطوات فتح ملف في إدارة أموال القاصرين.pdf", "Steps to Open a File"],
      ["-دليل المستخدم لخدمات شؤون إدارة أموال القاصرين الإلكترونية.pdf", "User Guide — eServices"],
      ["-استمارة فتح ملف تركة.pdf", "Estate File Application"],
      ["-استمارة تحديث البيانات المعدلة.pdf", "Data Update Form"],
      ["-اقرار إخلاء مسؤولية إدارة أموال القاصرين.pdf", "Liability Waiver Declaration"],
    ]),
  },
  {
    slug: "registrar",
    title: {
      en: "General Registrar's Office",
      ar: "مكتب المسجل العام",
    },
    forms: f([
      ["general_registrar_services.pdf", "General Registrar Services Overview"],
      ["personal_bankruptcy_trustees.pdf", "Personal Bankruptcy Trustees"],
      ["-استمارة قيد المحامين.pdf", "Lawyer Registration Form"],
      ["-استمارة صلاحية للمحامين.pdf", "Lawyer Validity Form"],
      ["-استمارة تعميم الوزير رقم 4 لسنة 2019 - (تحديث البيانات).pdf", "Ministerial Circular No. 4/2019 (Data Update)"],
      ["-استمارة طلب القيد بجداول الخبراء أمناء التفليسة الاشخاص الاعتبارية.pdf", "Application — Bankruptcy Trustee Roll (Legal Person)"],
      ["-استمارة طلب قيد الوساطة في المنازعات المدنية والتجارية للاشخاص الطبيعيين.pdf", "Application — Civil & Commercial Mediation (Natural Person)"],
      ["-استمارة طلب قيد الوساطة في المنازعات المدنية والتجارية او الجنائية للاشخاص الاعتبارية.pdf", "Application — Civil/Commercial/Criminal Mediation (Legal Person)"],
      ["-استمارة طلب قيد الوسطاء في المسائل الشرعية - شخص طبيعي.pdf", "Application — Sharia Mediation Roll (Natural Person)"],
      ["-استمارة قيد الوسطاء - المسائل الجنائية.pdf", "Application — Criminal Mediation Roll"],
    ]),
  },
  {
    slug: "follow-up-unit",
    title: {
      en: "AML / Follow-up Unit",
      ar: "وحدة المتابعة (المسجل العام)",
    },
    forms: f([
      ["-استمارة الإفصاح.pdf", "Disclosure Form"],
      ["-استمارة اعتماد حساب مصرفي.pdf", "Bank Account Authorization"],
      ["-استمارة تحديث مكاتب المحامين.pdf", "Law Office Data Update"],
      ["-استمارة تعيين مسئول التزام.pdf", "Compliance Officer Designation"],
      ["-نموذج تقرير بشأن الإبلاغ عن العمليات المشبوهة أو غير العادية أو المحاولة في التعامل.pdf", "Suspicious Transaction Report"],
      ["-نموذج تقرير بشأن الإبلاغ عن العميل أو الموكل المدرج على القوائم.pdf", "Listed Client Report"],
      ["-نموذج تقرير بشأن إخطالر وحدة المتابعة عن العملاء أو الموكلين الغير مدرجين على القوائم.pdf", "Non-Listed Client Notification"],
      ["-نموذج متابعة.pdf", "Follow-up Form"],
    ]),
  },
  {
    slug: "expert",
    title: {
      en: "Expert",
      ar: "استمارات الخبرة",
    },
    forms: f([
      ["-نموذج عقد تقديم الخبرة.pdf", "Expert Engagement Contract Template"],
      ["-استمارة التحقق من الحيدة ونزاهة الخبير.pdf", "Expert Impartiality & Integrity Verification"],
    ]),
  },
  {
    slug: "arbitrators",
    title: {
      en: "Arbitrators Roll",
      ar: "جدول المحكمين",
    },
    forms: f([
      ["-استمارة طلب القيد في جدول المحكمين.pdf", "Application — Arbitrators Roll Registration"],
      ["-نموذج قضايا المحكمين.pdf", "Arbitrators Cases Template"],
    ]),
  },
  {
    slug: "accounts",
    title: {
      en: "Accounts Department",
      ar: "قسم الحسابات",
    },
    forms: f([
      ["-استمارة التحويلات البنكية (IBAN).pdf", "Bank Transfer Form (IBAN)"],
      ["-(Transfer to bank account form (IBAN.pdf", "Transfer to Bank Account Form (IBAN)"],
    ]),
  },
];

/** Build a public URL for a form file. */
export function formHref(category: MojFormCategory, form: MojForm): string {
  return `/forms/moj/${category.slug}/${encodeURIComponent(form.file)}`;
}

/** Total number of forms across all categories. */
export const TOTAL_MOJ_FORMS = MOJ_FORM_CATEGORIES.reduce(
  (sum, c) => sum + c.forms.length,
  0,
);
