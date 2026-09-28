// Frozen legacy provider wording captured on 2026-09-09. Do not edit signed legacy content.
// Bilingual "Legal Fees and Representation Agreement" template.
//
// Source: client-supplied "العقد معدل باللغتين-نهائي.docx" (final bilingual
// version). The fixed legal wording lives here verbatim; the dynamic fields
// (party details, scope, fee terms, date) are interpolated from the form.
//
// Both the on-screen preview (AgreementPreview.tsx) and the signed PDF
// (agreementPdf.ts) render from the SAME sections returned by
// `renderAgreement()`, so what the client sees is exactly what gets signed
// and hashed.

export const AGREEMENT_VERSION = "2026-05-23";

export const PLATFORM_COMMISSION_FIRST_YEAR_PERCENTAGE = 20;
export const LAWYER_COMMISSION_FIRST_YEAR_PERCENTAGE = 80;

export const PLATFORM_COMMISSION_AFTER_FIRST_YEAR_PERCENTAGE = 45;
export const LAWYER_COMMISSION_AFTER_FIRST_YEAR_PERCENTAGE = 55;

export const PROVIDER_ONBOARDING_AGREEMENT_POINTS = {
  en: [
    "The applicant authorizes Gulf International Collection to receive requests, respond to clients, book appointments, and collect payments on their behalf.",
    `The platform is entitled to a commission of ${PLATFORM_COMMISSION_FIRST_YEAR_PERCENTAGE}% on fees actually collected for services or work obtained through the platform during the first year from the lawyer's registration and account approval date, and ${PLATFORM_COMMISSION_AFTER_FIRST_YEAR_PERCENTAGE}% beginning from the second year and thereafter, unless otherwise agreed in writing.`,
    "The platform retains the right to delete any lawyer found unlicensed or prohibited from practice.",
    "Registration fees are administrative and non-refundable.",
    "The platform provides electronic payment services for client transactions.",
    "All disputes shall be resolved by arbitration in accordance with the laws of the Kingdom of Bahrain.",
  ],
  ar: [
    "يفوض مقدم الطلب شركة الخليج الدولية للتحصيل والاستشارات باستقبال الطلبات والرد على العملاء وحجز المواعيد وتحصيل المبالغ نيابة عنه.",
    `تستحق المنصة عمولة بنسبة ${PLATFORM_COMMISSION_FIRST_YEAR_PERCENTAGE}% من قيمة الأتعاب المحصلة فعليًا عن الخدمات أو الأعمال التي تتم من خلال المنصة خلال السنة الأولى من تاريخ تسجيل المحامي واعتماد حسابه، وتصبح العمولة ${PLATFORM_COMMISSION_AFTER_FIRST_YEAR_PERCENTAGE}% اعتبارًا من بداية السنة الثانية وما بعدها، ما لم يُتفق كتابيًا على خلاف ذلك.`,
    "تحتفظ المنصة بالحق في تعليق أي محامي يتبين عدم ترخيصه أو حظره من الممارسة.",
    "رسوم التسجيل إدارية وغير قابلة للاسترداد.",
    "توفر المنصة خدمات الدفع الإلكتروني لمعاملات العملاء.",
    "تحل جميع النزاعات عن طريق التحكيم وفقاً لقوانين مملكة البحرين.",
  ],
};

export type FeeBasis = "judgment" | "settlement" | "enforcement";

export interface AgreementParty {
  name: string;
  /** Lawyer: license/registration no. Client: ID / CR no. */
  idOrLicense?: string | null;
  nationality?: string | null; // client only
  address?: string | null;
  phone?: string | null;
  email: string;
}

export type AgreementFee =
  | { type: "fixed"; amountBhd: string; installment?: string | null }
  | { type: "contingency"; percent: string; basis: FeeBasis };

export interface AgreementData {
  reference: string;
  /** Gregorian date the agreement is concluded, e.g. "23 May 2026". */
  dateLabel: string;
  /** Weekday name, localised, e.g. "Saturday" / "السبت". */
  weekday?: { en: string; ar: string };
  lawyer: AgreementParty;
  client: AgreementParty;
  /** Article 2 — scope of the legal services. */
  subject: string;
  fee: AgreementFee;
}

export interface AgreementSection {
  id: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

const DASH = "—";
const v = (s?: string | null) => (s && s.trim() ? s.trim() : DASH);

const FEE_BASIS_LABEL: Record<FeeBasis, { en: string; ar: string }> = {
  judgment: {
    en: "the final judgment amount",
    ar: "المبلغ المحكوم به النهائي",
  },
  settlement: { en: "the written settlement amount", ar: "مبلغ الصلح المكتوب" },
  enforcement: {
    en: "the amount recovered through enforcement",
    ar: "المبلغ المتحصل فعليًا من التنفيذ",
  },
};

function feeParagraph(fee: AgreementFee): { en: string; ar: string } {
  if (fee.type === "fixed") {
    const inst = fee.installment?.trim()
      ? {
          en: `\nPayment instalments: ${fee.installment.trim()}.`,
          ar: `\nأقساط السداد: ${fee.installment.trim()}.`,
        }
      : { en: "", ar: "" };
    return {
      en:
        `The parties have selected Option A — Fixed Fee.\n` +
        `The total agreed fee is a fixed amount of ${v(fee.amountBhd)} Bahraini Dinars (BHD).` +
        inst.en +
        `\nThe agreed fees do not include court, administrative, expert, translation, or enforcement charges, which remain the responsibility of the Client unless otherwise agreed in writing.`,
      ar:
        `اتفق الطرفان على اختيار الخيار (أ) — الأتعاب الثابتة.\n` +
        `الأتعاب الإجمالية المتفق عليها مبلغ مقطوع قدره ${v(fee.amountBhd)} دينار بحريني.` +
        inst.ar +
        `\nلا تشمل الأتعاب المتفق عليها الرسوم القضائية أو الإدارية أو رسوم الخبراء أو الترجمة أو التنفيذ، وتبقى هذه على عاتق الطرف الثاني ما لم يُتفق على غير ذلك كتابةً.`,
    };
  }
  const basis = FEE_BASIS_LABEL[fee.basis];
  return {
    en:
      `The parties have selected Option B — Contingency / Success Fee.\n` +
      `The fee shall be ${v(fee.percent)}% of the net financial outcome realised for the Client, subject to a maximum of 25% of the realised amount, and only where this option is permissible under the applicable law.\n` +
      `The percentage shall be calculated on ${basis.en}, as selected.`,
    ar:
      `اتفق الطرفان على اختيار الخيار (ب) — الأتعاب النسبية.\n` +
      `تكون الأتعاب بنسبة ${v(fee.percent)}% من صافي النتيجة المالية المتحققة للموكل فعليًا، وبحد أقصى 25% من المبلغ المتحقق، وذلك فقط إذا كان هذا الخيار متوافقًا مع القانون النافذ.\n` +
      `وتحتسب النسبة على ${basis.ar}، بحسب الاختيار.`,
  };
}

/** Build the full ordered set of contract sections with the form data
 *  interpolated. Pure function — no I/O — so it's safe on both server
 *  (PDF, hashing) and client (preview). */
export function renderAgreement(data: AgreementData): AgreementSection[] {
  const { lawyer, client } = data;
  const fee = feeParagraph(data.fee);

  const partiesEn =
    `This Agreement was concluded on ${data.weekday?.en ?? ""} ${data.dateLabel}, between:\n\n` +
    `First Party (Lawyer / Law Firm)\n` +
    `Name: ${v(lawyer.name)}\n` +
    `Capacity: Licensed lawyer / law firm in the Kingdom of Bahrain.\n` +
    `License / Registration No.: ${v(lawyer.idOrLicense)}\n` +
    `Address: ${v(lawyer.address)}\n` +
    `Phone: ${v(lawyer.phone)}\n` +
    `Email: ${v(lawyer.email)}\n` +
    `Hereinafter referred to as the "First Party" or the "Lawyer".\n\n` +
    `Second Party (Client)\n` +
    `Name / Capacity: ${v(client.name)}\n` +
    `ID / Commercial Registration No.: ${v(client.idOrLicense)}\n` +
    `Nationality: ${v(client.nationality)}\n` +
    `Address: ${v(client.address)}\n` +
    `Phone: ${v(client.phone)}\n` +
    `Email: ${v(client.email)}\n` +
    `Hereinafter referred to as the "Second Party" or the "Client".\n\n` +
    `The parties acknowledge their full legal capacity to contract and confirm that this Agreement has been executed electronically through the Lawyers.bh platform. The electronic acknowledgements and signatures contained herein shall have legal effect to the extent they satisfy the legal requirements in the Kingdom of Bahrain.`;

  const partiesAr =
    `أُبرمت هذه الاتفاقية في يوم ${data.weekday?.ar ?? ""} الموافق ${data.dateLabel}، بين كلٍّ من:\n\n` +
    `أولًا: الطرف الأول (المحامي/المكتب)\n` +
    `الاسم: ${v(lawyer.name)}\n` +
    `الصفة: محامي/مكتب محاماة مرخص في مملكة البحرين.\n` +
    `رقم الترخيص/القيد: ${v(lawyer.idOrLicense)}\n` +
    `العنوان: ${v(lawyer.address)}\n` +
    `الهاتف: ${v(lawyer.phone)}\n` +
    `البريد الإلكتروني: ${v(lawyer.email)}\n` +
    `ويشار إليه في هذه الاتفاقية بـ "الطرف الأول" أو "المحامي".\n\n` +
    `ثانيًا: الطرف الثاني (الموكل)\n` +
    `الاسم/الصفة: ${v(client.name)}\n` +
    `رقم الهوية/السجل التجاري: ${v(client.idOrLicense)}\n` +
    `الجنسية: ${v(client.nationality)}\n` +
    `العنوان: ${v(client.address)}\n` +
    `الهاتف: ${v(client.phone)}\n` +
    `البريد الإلكتروني: ${v(client.email)}\n` +
    `ويشار إليه في هذه الاتفاقية بـ "الطرف الثاني" أو "الموكل".\n\n` +
    `وقد أقر الطرفان بأهليتهما القانونية الكاملة للتعاقد، وبأن هذه الاتفاقية أبرمت إلكترونيًا عبر منصة محامون البحرين، وتعد الإقرارات والتوقيعات الإلكترونية الواردة فيها منتجة لآثارها القانونية متى استوفت شروطها النظامية في مملكة البحرين.`;

  return [
    {
      id: "parties",
      titleEn: "Parties",
      titleAr: "أطراف الاتفاقية",
      bodyEn: partiesEn,
      bodyAr: partiesAr,
    },
    {
      id: "art1",
      titleEn: "Article 1: Preamble and Definitions",
      titleAr: "المادة 1: التمهيد والتعريفات",
      bodyEn:
        `The above preamble forms an integral part of this Agreement and shall be read together with it. For the purposes of this Agreement, the following terms shall have the meanings set out below unless the context otherwise requires:\n` +
        `Legal Services: Any services agreed by the parties, including consultation, review, drafting, representation, pleading, negotiation, submissions, memoranda, hearings, applications, enforcement, or any other legal service described herein.\n` +
        `Fees: The financial consideration due to the First Party for the agreed Legal Services.\n` +
        `Expenses: Court fees, expert fees, translation costs, enforcement costs, and any other official or administrative expenses.\n` +
        `Financial Outcome: Any amount awarded, collected, settled, or enforced in favour of the Client, as expressly stated in this Agreement.`,
      bodyAr:
        `يعد التمهيد أعلاه جزءًا لا يتجزأ من هذه الاتفاقية ومكملًا ومفسرًا لها، ويقصد بالألفاظ التالية المعاني المبينة قرين كل منها، ما لم يقتضِ السياق غير ذلك:\n` +
        `العمل القانوني: كل ما اتفق عليه الطرفان من استشارة، ومراجعة، وصياغة، وتمثيل، ومرافعة، وتفاوض، وصحف، ومذكرات، وجلسات، وطلبات، وتنفيذ، أو أي خدمة قانونية أخرى موصوفة في هذا العقد.\n` +
        `الأتعاب: المقابل المالي المستحق للطرف الأول نظير الأعمال القانونية المتفق عليها.\n` +
        `المصروفات: الرسوم القضائية، ورسوم الخبراء، والترجمة، والتنفيذ، وأي مصروفات رسمية أو إدارية أخرى.\n` +
        `النتيجة المالية: أي مبلغ يتم الحكم به أو تحصيله أو الصلح عليه أو تنفيذه لصالح الموكل، وفق ما يرد صراحة في هذا العقد.`,
    },
    {
      id: "art2",
      titleEn: "Article 2: Subject of the Contract",
      titleAr: "المادة 2: موضوع العقد",
      bodyEn: `The First Party shall represent the Second Party and carry out the following Legal Services:\n${v(data.subject)}\n\nThis Agreement shall not extend to any subsequent or separate work unless separately agreed in writing or electronically by both parties.`,
      bodyAr: `يتولى الطرف الأول تمثيل الطرف الثاني ومباشرة الأعمال القانونية الآتية:\n${v(data.subject)}\n\nولا يمتد هذا العقد إلى أي عمل لاحق أو مستقل إلا بموافقة مكتوبة أو إلكترونية مستقلة من الطرفين.`,
    },
    {
      id: "art3",
      titleEn: "Article 3: Fee Structure",
      titleAr: "المادة 3: طريقة تحديد الأتعاب",
      bodyEn: fee.en,
      bodyAr: fee.ar,
    },
    {
      id: "art4",
      titleEn: "Article 4: No Combination Unless Expressly Stated",
      titleAr: "المادة 4: منع الجمع بين أكثر من طريقة إلا بالنص",
      bodyEn: `Contingency fees may not be combined with any fixed fee or additional charge for the same stage unless expressly permitted by the applicable law and stated in a separate appendix signed by both parties. If fixed fees or instalments are selected, additional separate and clearly stated expenses may be agreed, which shall not form part of the fees.`,
      bodyAr: `لا يجوز الجمع بين الأتعاب النسبية وأي مبلغ مقطوع أو رسوم إضافية عن ذات المرحلة، إلا إذا أجاز القانون النافذ ذلك صراحة وجرى النص عليه في ملحق مستقل وموقع من الطرفين. أما إذا اختيرت الأتعاب الثابتة أو الأقساط، فيجوز الاتفاق على مصروفات إضافية منفصلة وواضحة لا تدخل في صلب الأتعاب.`,
    },
    {
      id: "art5",
      titleEn: "Article 5: Fees and Expenses",
      titleAr: "المادة 5: الرسوم والمصروفات",
      bodyEn: `The agreed fees do not include court, administrative, expert, translation, enforcement, or other official charges, which shall remain the responsibility of the Client unless otherwise agreed in writing. The Client undertakes to pay such expenses when due or upon request by the Lawyer or the competent authority.`,
      bodyAr: `لا تشمل الأتعاب المتفق عليها الرسوم القضائية أو الإدارية أو رسوم الخبراء أو الترجمة أو التنفيذ أو أي مصروفات تفرضها الجهات الرسمية، وتبقى هذه على عاتق الطرف الثاني ما لم يتفق الطرفان كتابةً على غير ذلك، ويتعهد الطرف الثاني بسداد هذه المصروفات عند استحقاقها أو عند طلبها من الطرف الأول أو الجهة المختصة.`,
    },
    {
      id: "art6",
      titleEn: "Article 6: Lawyer's Obligations",
      titleAr: "المادة 6: التزامات الطرف الأول",
      bodyEn: `The Lawyer shall: exercise due professional care in accordance with professional standards and applicable rules; carry out only the services agreed under this Agreement; inform the Client of material developments by approved electronic means; and maintain professional confidentiality and disclose information only as required by law.`,
      bodyAr: `يلتزم الطرف الأول بما يلي: بذل العناية المهنية اللازمة وفق أصول المهنة والقواعد المنظمة لها؛ ومباشرة الأعمال المتفق عليها ضمن نطاق هذه الاتفاقية؛ وإبلاغ الطرف الثاني بالمستجدات الجوهرية بوسيلة إلكترونية معتمدة؛ والمحافظة على السرية المهنية وعدم إفشاء المعلومات إلا وفق مقتضى القانون.`,
    },
    {
      id: "art7",
      titleEn: "Article 7: Client's Obligations",
      titleAr: "المادة 7: التزامات الطرف الثاني",
      bodyEn: `The Client shall: execute the power of attorney, representation authorisation, or any required electronic acknowledgement; provide complete and accurate documents and information in a timely manner; pay the fees on their due dates and pay expenses when requested; and notify the Lawyer immediately of any development, correspondence, or document related to the matter. The Client shall bear the consequences of any delay in providing information or documents if such delay causes harm to the conduct of the case or procedure.`,
      bodyAr: `يلتزم الطرف الثاني بما يلي: التوقيع على الوكالة أو تفويض التمثيل أو أي إقرار مطلوب؛ وتقديم المستندات والبيانات صحيحة وكاملة وفي الوقت المناسب؛ وسداد الأتعاب والرسوم والمصروفات في مواعيدها المحددة أو عند طلبها؛ وإخطار الطرف الأول فورًا بأي تطور أو مراسلة أو مستند متعلق بالموضوع، وعدم اتخاذ أي إجراءات دون علم الطرف الأول. ويتحمل الموكل آثار التأخير في تقديم المعلومات أو المستندات أو سداد الرسوم أو الأتعاب إذا ترتب على ذلك ضرر في مباشرة الدعوى أو الإجراء.`,
    },
    {
      id: "art8",
      titleEn: "Article 8: Entitlement upon Settlement, Waiver, or Termination",
      titleAr: "المادة 8: الاستحقاق في حالة الصلح أو التنازل أو الإنهاء",
      bodyEn: `If the dispute ends by settlement, waiver, release, compromise, or final judgment in favour of the Client, the fees shall be due according to the selected method in Article 3. If the Client terminates the Agreement after work has commenced without lawful justification, the Lawyer shall be entitled to fees for work performed, subject to the rights accrued under this Agreement. Where contingency fees are selected, they become due upon realisation of the agreed financial outcome, actual recovery, or written settlement, as selected.`,
      bodyAr: `إذا انتهى النزاع صلحًا أو تنازلًا أو إبراءً أو تسويةً أو بحكم نهائي لصالح الموكل، تستحق الأتعاب وفق الطريقة المختارة في المادة 3. وإذا أنهى الطرف الثاني الاتفاق بعد مباشرة العمل دون سبب مشروع، يستحق المحامي الأتعاب عن العمل المنجز، مع مراعاة ما ينص عليه هذا العقد من حقوق مستحقة. وفي حال اختيرت الأتعاب النسبية، تستحق عند تحقق النتيجة المالية المتفق عليها أو عند التحصيل الفعلي أو الصلح المكتوب، بحسب النص المختار.`,
    },
    {
      id: "art9",
      titleEn: "Article 9: Additional Work",
      titleAr: "المادة 9: الأعمال الإضافية",
      bodyEn: `Any appeal, cassation, review petition, enforcement, subsequent claim, separate action, or new proceeding shall not be automatically covered by this Agreement unless expressly specified in the selection field or in a separate electronic appendix. Additional fees for such work may be agreed under a new fee structure or the same one, as selected by the parties.`,
      bodyAr: `أي استئناف أو تمييز أو طلب إعادة نظر أو تنفيذ أو مطالبة لاحقة أو دعوى منفصلة أو إجراء جديد لا يكون مشمولًا تلقائيًا بهذه الاتفاقية، ما لم يُحدَّد ذلك صراحة في خانة الاختيار أو في ملحق إلكتروني مستقل. ويجوز الاتفاق على أتعاب إضافية لتلك الأعمال وفق طريقة تحديد جديدة أو نفس الطريقة السابقة، بحسب ما يختاره الطرفان.`,
    },
    {
      id: "art10",
      titleEn: "Article 10: Confidentiality and Data Protection",
      titleAr: "المادة 10: السرية وحماية البيانات",
      bodyEn: `The First Party shall keep all data and documents of the Second Party confidential and use them only to the extent necessary to perform this Agreement. The Second Party shall not publish or circulate correspondence, memoranda, or advice except to the extent permitted by law or with the First Party's consent, unless disclosure is legally required. The Second Party acknowledges that it has no objection to sharing documents with the electronic platform, which guarantees the confidentiality of information and data.`,
      bodyAr: `يلتزم الطرف الأول بالحفاظ على سرية جميع بيانات ومستندات الطرف الثاني، وعدم استخدامها إلا في حدود تنفيذ هذه الاتفاقية. كما يلتزم الطرف الثاني بعدم نشر أو تداول المراسلات أو المذكرات أو الاستشارات إلا في الحدود التي يجيزها القانون أو بموافقة الطرف الأول، ما لم يكن الإفصاح واجبًا قانونًا. ويقر الطرف الثاني بعدم ممانعته مشاركة المستندات مع المنصة الإلكترونية مع ضمانها لسرية المعلومات والبيانات.`,
    },
    {
      id: "art11",
      titleEn: "Article 11: Notices and Electronic Authentication",
      titleAr: "المادة 11: الإشعارات والاعتماد الإلكتروني",
      bodyEn: `All notices and communications shall be valid if sent to the email address, phone number, or other contact method designated in the electronic form. The parties' approval through the platform, electronic signature, or digital confirmation shall constitute final and binding acceptance of this Agreement, provided the electronic system requirements in Bahrain are satisfied. If either party changes any contact method, they must inform the other party immediately using an approved method.`,
      bodyAr: `تكون جميع الإشعارات والمراسلات صحيحة ونافذة إذا أُرسلت إلى البريد الإلكتروني أو رقم الهاتف أو وسيلة التواصل المعتمدة في النموذج الإلكتروني. ويُعد اعتماد الطرفين من خلال المنصة أو التوقيع الإلكتروني أو التأكيد الرقمي قبولًا نهائيًا وملزمًا لهذه الاتفاقية، ما دامت مستوفية لشروط النظام الإلكتروني في البحرين. وفي حال قام أي من الطرفين بتغيير وسيلة التواصل، فعليه إبلاغ الطرف الآخر فورًا بوسيلة معتمدة.`,
    },
    {
      id: "art12",
      titleEn: "Article 12: Governing Law and Jurisdiction",
      titleAr: "المادة 12: القانون الواجب التطبيق والاختصاص",
      bodyEn: `This Agreement shall be governed by and construed in accordance with the laws and regulations of the Kingdom of Bahrain, without prejudice to the rules governing the legal profession and electronic agreements. The courts of the Kingdom of Bahrain shall have jurisdiction over any dispute arising hereunder, unless the parties agree to a lawful alternative dispute resolution mechanism.`,
      bodyAr: `تخضع هذه الاتفاقية وتُفسر وفق قوانين ولوائح مملكة البحرين، وبما لا يتعارض مع الأنظمة المنظمة لمهنة المحاماة والاتفاقات الإلكترونية. وتختص محاكم مملكة البحرين بنظر أي نزاع ينشأ عنها، ما لم يتفق الطرفان على تسوية بديلة جائزة قانونًا.`,
    },
    {
      id: "art13",
      titleEn: "Article 13: Acceptance and Copies",
      titleAr: "المادة 13: القبول والنسخ",
      bodyEn: `This Agreement is executed electronically in one original copy retained on the Lawyers.bh platform, and any electronic approval or digital signature thereon shall constitute a valid acceptance. The parties acknowledge that they have read this Agreement, understood its contents, accepted all its terms, and that the data entered in the electronic form forms an integral part of it.`,
      bodyAr: `حررت هذه الاتفاقية إلكترونيًا من نسخة أصلية واحدة محفوظة في منصة محامون البحرين، ويعد كل اعتماد إلكتروني أو توقيع رقمي عليها موافقة نافذة. ويقر الطرفان بأنهما قرآها وفهما محتواها وقبلا جميع شروطها، وأن البيانات المدخلة في النموذج الإلكتروني تعتبر جزءًا لا يتجزأ منها.`,
    },
    {
      id: "art14",
      titleEn: "Article 14: Electronic Signature Consent Declaration",
      titleAr: "المادة 14: إفادة الموافقة على التوقيع الإلكتروني",
      bodyEn:
        `I, the undersigned, hereby acknowledge and consent, with full legal capacity, to the following:\n` +
        `I have reviewed this Legal Fees Agreement and all its clauses and fully understand its contents.\n` +
        `I agree to conclude and sign this Agreement electronically through the Lawyers.bh platform.\n` +
        `Entering my data, completing the required fields, and pressing "I Agree" / "Sign" (or using an OTP or similar electronic authentication method) constitutes a valid electronic signature issued by me of my free will.\n` +
        `This electronic signature is binding and legally effective, and admissible in evidence provided my identity and intention to be bound by the Agreement are established.\n` +
        `I consent to the retention of an electronic copy of the Agreement and the signature/authentication log within the platform, and to a copy being sent to my email.\n` +
        `I acknowledge that this consent does not diminish the validity of the Agreement, my obligations thereunder, or any other means of proof recognised by law.`,
      bodyAr:
        `أقر أنا الموقع أدناه، بكامل أهليتي القانونية، وأوافق على ما يلي:\n` +
        `أنني اطلعت على اتفاقية أتعاب المحاماة وجميع بنودها، وفهمت مضمونها فهمًا كاملًا.\n` +
        `أنني أوافق على إبرام هذه الاتفاقية وتوقيعها إلكترونيًا عبر منصة محامون البحرين.\n` +
        `أن إدخال بياناتي، واستكمال الحقول المطلوبة، والضغط على زر (أوافق) أو (توقيع) أو ما يماثلهما، أو استخدام رمز تحقق أو وسيلة اعتماد إلكترونية مشابهة، يُعد توقيعًا إلكترونيًا صحيحًا صادرًا عني بإرادتي الحرة.\n` +
        `أن هذا التوقيع الإلكتروني ملزم لي ومنتج لآثاره القانونية، ويُعتد به في الإثبات متى ثبتت هويتي وقصدي في الالتزام بالعقد.\n` +
        `أنني أوافق على حفظ نسخة إلكترونية من الاتفاقية وسجل التوقيع والاعتماد داخل المنصة، ويجوز إرسال نسخة منها إلى بريدي الإلكتروني.\n` +
        `أنني أقر بأن هذه الموافقة لا تنتقص من حجية العقد، ولا من التزاماتي المترتبة عليه، ولا من أي وسائل إثبات أخرى يقرها القانون.`,
    },
  ];
}

/** Flatten the rendered sections to a single deterministic string for
 *  SHA-256 hashing — proves which exact wording the client signed. */
export function agreementPlainText(sections: AgreementSection[]): string {
  return sections
    .map((s) => `${s.titleEn}\n${s.bodyEn}\n${s.titleAr}\n${s.bodyAr}`)
    .join("\n\n");
}
