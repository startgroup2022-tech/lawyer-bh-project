-- Structured, database-owned preliminary guidance for every legal case exposed
-- to YourGPT. The catalogue is keyed by the stable legal case key so the same
-- approved guidance can be reused by every country table.

CREATE TABLE IF NOT EXISTS public.legal_case_guidance (
  legal_case_key text PRIMARY KEY,
  guidance_ar text NOT NULL,
  guidance_en text NOT NULL,
  documents_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents_en jsonb NOT NULL DEFAULT '[]'::jsonb,
  clarifying_question_ar text,
  clarifying_question_en text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_case_guidance_documents_ar_array_check
    CHECK (jsonb_typeof(documents_ar) = 'array'),
  CONSTRAINT legal_case_guidance_documents_en_array_check
    CHECK (jsonb_typeof(documents_en) = 'array')
);

CREATE INDEX IF NOT EXISTS legal_case_guidance_active_idx
  ON public.legal_case_guidance (is_active);

INSERT INTO public.legal_case_guidance (
  legal_case_key,
  guidance_ar,
  guidance_en,
  documents_ar,
  documents_en,
  clarifying_question_ar,
  clarifying_question_en
)
VALUES
  (
    'criminal_arrest_bail',
    'دوّن جهة التوقيف ووقت القبض ورقم البلاغ أو القضية، واطلب مراجعة محامي بصورة عاجلة. لا توقّع على أقوال أو مستندات لا تفهم مضمونها.',
    'Record the detaining authority, arrest time, and report or case number, and seek an urgent lawyer review. Do not sign statements or documents you do not understand.',
    '["رقم البلاغ أو القضية","أي استدعاء أو أمر صادر","البطاقة الشخصية","بيانات جهة التوقيف"]'::jsonb,
    '["Report or case number","Any summons or issued order","Identity card","Detaining authority details"]'::jsonb,
    'هل الشخص موقوف حالياً أم استلم استدعاء فقط؟',
    'Is the person currently detained, or have they only received a summons?'
  ),
  (
    'criminal_investigation',
    'رتّب تسلسلاً زمنياً دقيقاً للوقائع واحتفظ بكل ما يثبتها، واعرف الجهة التي تباشر التحقيق ورقم الملف. لا تحذف رسائل أو تسجيلات مرتبطة بالموضوع.',
    'Prepare an accurate timeline and preserve all supporting evidence, including the investigating authority and file number. Do not delete related messages or recordings.',
    '["رقم البلاغ أو القضية","الاستدعاء","المراسلات والتسجيلات","بيانات الشهود"]'::jsonb,
    '["Report or case number","Summons","Messages and recordings","Witness details"]'::jsonb,
    'هل أنت مقدّم البلاغ أم مشتكى عليك؟',
    'Are you the complainant or the person reported against?'
  ),
  (
    'criminal_cybercrime',
    'احفظ الأدلة الرقمية بصورتها الأصلية مع اسم الحساب والرابط والتاريخ والوقت، وخذ لقطات كاملة لا تقصّ السياق. لا تحذف المحادثة أو تدفع أي مبلغ إضافي للمبتز.',
    'Preserve digital evidence in its original form with account names, links, dates, and times, and keep full-context screenshots. Do not delete the conversation or make additional payments to an extortionist.',
    '["لقطات شاشة كاملة","روابط وأسماء الحسابات","سجل التحويلات","بيانات الجهاز أو المنصة"]'::jsonb,
    '["Full screenshots","Account names and links","Transfer records","Device or platform details"]'::jsonb,
    'هل الموضوع ابتزاز أم تهديد أم اختراق أم سب وقذف؟',
    'Does the matter involve extortion, threats, hacking, or online defamation?'
  ),
  (
    'criminal_fraud',
    'اجمع تفاصيل العرض أو الاتفاق والتحويلات والمحادثات، واكتب متى وكيف اكتشفت الاحتيال. لا ترسل مبالغ أو بيانات إضافية قبل مراجعة الموضوع.',
    'Collect the offer or agreement details, transfers, and communications, and record when and how the suspected fraud was discovered. Do not send more money or information before review.',
    '["إيصالات التحويل","العقد أو الإعلان","المحادثات","بيانات الطرف الآخر"]'::jsonb,
    '["Transfer receipts","Contract or advertisement","Communications","Other party details"]'::jsonb,
    'هل تم تحويل مبلغ، وما الوسيلة المستخدمة في التحويل؟',
    'Was money transferred, and which transfer method was used?'
  ),
  (
    'criminal_cheque',
    'احتفظ بالشيك وحالة إرجاعه من البنك والمستند الذي يوضح سبب إصداره. لا تعدّل أي بيانات على الشيك أو تتخلص من أصله.',
    'Preserve the cheque, the bank return status, and documents showing why it was issued. Do not alter the cheque or dispose of the original.',
    '["أصل الشيك أو صورته","إفادة البنك","العقد أو الفاتورة","المراسلات"]'::jsonb,
    '["Original cheque or copy","Bank return advice","Contract or invoice","Communications"]'::jsonb,
    'هل أنت محرر الشيك أم المستفيد منه؟',
    'Are you the cheque issuer or the beneficiary?'
  ),
  (
    'criminal_assault',
    'وثّق الإصابات والتهديدات والزمان والمكان، واحفظ بيانات الشهود وأي بلاغ أو تقرير طبي. تجنب التواصل التصعيدي أو مواجهة الطرف الآخر.',
    'Document injuries, threats, time, and location, and preserve witness details and any police or medical report. Avoid escalation or confronting the other party.',
    '["التقرير الطبي","رقم البلاغ","صور الإصابات","بيانات الشهود"]'::jsonb,
    '["Medical report","Report number","Injury photographs","Witness details"]'::jsonb,
    'هل تم تقديم بلاغ أو إصدار تقرير طبي؟',
    'Has a police report been filed or a medical report issued?'
  ),
  (
    'civil_compensation',
    'اربط الضرر بالواقعة من خلال مستندات واضحة، واحفظ ما يثبت الخسارة أو العلاج أو الإصلاح. لا توقّع تسوية أو مخالصة قبل مراجعة آثارها.',
    'Link the loss to the incident with clear evidence and preserve proof of treatment, repair, or financial loss. Do not sign a settlement or release before reviewing its effect.',
    '["إثبات الواقعة","تقارير طبية أو فنية","فواتير وإيصالات","مراسلات الطرف الآخر"]'::jsonb,
    '["Incident evidence","Medical or technical reports","Invoices and receipts","Other party communications"]'::jsonb,
    'ما نوع الضرر، وهل يمكن إثبات قيمته بالمستندات؟',
    'What type of loss occurred, and can its value be documented?'
  ),
  (
    'civil_contracts',
    'حدّد الالتزام الذي لم يُنفذ وتاريخ الإخلال، واجمع النسخة الموقعة وجميع التعديلات والإشعارات. لا تعدّل النسخ الأصلية أو تعتمد على اتفاق شفهي غير موثق.',
    'Identify the unperformed obligation and breach date, and collect the signed agreement, amendments, and notices. Do not alter originals or rely on an undocumented oral arrangement.',
    '["العقد الموقع","الملاحق والتعديلات","إثبات الدفع أو التنفيذ","الإنذارات والمراسلات"]'::jsonb,
    '["Signed contract","Annexes and amendments","Payment or performance evidence","Notices and communications"]'::jsonb,
    'ما الالتزام الذي أخل به الطرف الآخر؟',
    'Which obligation did the other party fail to perform?'
  ),
  (
    'civil_debt_collection',
    'اجمع كل ما يثبت أصل الدين وقيمته واستحقاقه، ورتّب المدفوعات والمطالبات السابقة زمنياً. لا تسلّم أصل السند أو توقّع تسوية غير واضحة.',
    'Collect evidence of the debt, amount, and due status, and arrange payments and prior demands chronologically. Do not surrender the original instrument or sign an unclear settlement.',
    '["العقد أو إقرار الدين","الفواتير","التحويلات والإيصالات","المطالبات والمراسلات"]'::jsonb,
    '["Contract or debt acknowledgment","Invoices","Transfers and receipts","Demands and communications"]'::jsonb,
    'هل يوجد عقد أو إقرار مكتوب يثبت الدين؟',
    'Is there a contract or written acknowledgment proving the debt?'
  ),
  (
    'civil_property',
    'حدّد العقار ووجه النزاع بدقة، واجمع مستندات الملكية والخرائط والعقود وما يثبت الحيازة. لا تجرِ تصرفاً جديداً في العقار قبل مراجعة وضعه القانوني.',
    'Identify the property and exact dispute, and collect title documents, plans, contracts, and possession evidence. Do not make a new disposition of the property before legal review.',
    '["وثيقة الملكية","الخريطة أو بيانات العقار","العقود","إثبات الحيازة والمراسلات"]'::jsonb,
    '["Title deed","Property plan or details","Contracts","Possession evidence and communications"]'::jsonb,
    'هل النزاع على الملكية أم الحيازة أم حدود العقار؟',
    'Is the dispute about title, possession, or property boundaries?'
  ),
  (
    'civil_rent',
    'احتفظ بعقد الإيجار وسجل الدفعات والإشعارات وصور حالة العقار، وحدّد المبالغ والفترات محل النزاع. لا تتخذ إجراء إخلاء أو قطع خدمات من نفسك.',
    'Preserve the lease, payment history, notices, and property condition photographs, and identify the disputed amounts and periods. Do not carry out self-help eviction or service interruption.',
    '["عقد الإيجار","إيصالات الأجرة","الإشعارات","صور حالة العقار"]'::jsonb,
    '["Lease agreement","Rent receipts","Notices","Property condition photographs"]'::jsonb,
    'هل أنت المؤجر أم المستأجر، وما المشكلة الأساسية؟',
    'Are you the landlord or tenant, and what is the main issue?'
  ),
  (
    'civil_execution',
    'تحقق من وجود حكم نهائي أو سند قابل للتنفيذ، وجهّز نسخة واضحة وبيانات المدين والأموال المعروفة. لا تبدأ مسار التنفيذ قبل تحديد السند والمبلغ المتبقي بدقة.',
    'Confirm that there is a final judgment or enforceable instrument, and prepare a clear copy plus known debtor and asset details. Do not start enforcement before identifying the instrument and outstanding amount.',
    '["الحكم أو السند التنفيذي","ما يثبت الإعلان","بيان المبلغ المتبقي","بيانات المدين والأموال"]'::jsonb,
    '["Judgment or enforceable instrument","Service evidence","Outstanding amount statement","Debtor and asset details"]'::jsonb,
    'هل لديك حكم نهائي أو سند تنفيذي؟',
    'Do you have a final judgment or enforceable instrument?'
  ),
  (
    'sharia_divorce',
    'رتّب معلومات الزواج والأبناء والطلبات المالية وأي قضايا قائمة، وجهّز المستندات المرتبطة بها. لا توقّع تنازلاً أو اتفاقاً نهائياً قبل مراجعة جميع آثاره.',
    'Organize the marriage, children, financial requests, and any existing case details, and prepare the related documents. Do not sign a final waiver or agreement before reviewing all consequences.',
    '["عقد الزواج","هويات الطرفين","شهادات ميلاد الأبناء","المستندات المالية والأحكام السابقة"]'::jsonb,
    '["Marriage certificate","Party identification","Children birth certificates","Financial records and prior judgments"]'::jsonb,
    'هل توجد قضية قائمة أو اتفاق سابق بين الطرفين؟',
    'Is there an existing case or prior agreement between the parties?'
  ),
  (
    'sharia_marriage_dissolution',
    'حدّد سبب طلب الفسخ والوقائع التي تدعمه، واجمع ما يثبتها من مراسلات أو تقارير أو مستندات. تجنب توقيع تنازل قبل تحديد الحقوق المرتبطة بالطلب.',
    'Identify the basis for seeking dissolution and collect communications, reports, or documents supporting it. Avoid signing a waiver before identifying the rights affected.',
    '["عقد الزواج","المراسلات","التقارير ذات الصلة","أي بلاغات أو أحكام سابقة"]'::jsonb,
    '["Marriage certificate","Communications","Relevant reports","Any prior reports or judgments"]'::jsonb,
    'ما السبب الأساسي المطلوب الاستناد إليه في الفسخ؟',
    'What is the main basis for the requested dissolution?'
  ),
  (
    'sharia_khula',
    'جهّز عقد الزواج وتفاصيل أي عروض تسوية والحقوق المالية والأبناء، وحدّد ما تم الاتفاق عليه وما بقي محل نزاع. لا توافق على تنازل شامل قبل مراجعته.',
    'Prepare the marriage certificate, settlement proposals, financial rights, and children details, and identify what is agreed and disputed. Do not accept a broad waiver before review.',
    '["عقد الزواج","عروض أو اتفاقات التسوية","مستندات الحقوق المالية","مستندات الأبناء"]'::jsonb,
    '["Marriage certificate","Settlement offers or agreements","Financial rights documents","Children documents"]'::jsonb,
    'هل الخلع متفق عليه أم يوجد خلاف على المقابل أو الحقوق؟',
    'Is the khula agreed, or is there a dispute over consideration or rights?'
  ),
  (
    'sharia_custody',
    'اجمع أوامر الحضانة والزيارة إن وجدت، ومستندات السكن والتعليم والصحة التي توضح مصلحة الطفل. لا تخالف أمراً قضائياً قائماً أو تستخدم الطفل في النزاع.',
    'Collect any custody or visitation orders and residence, education, and health records relevant to the child. Do not breach an existing court order or involve the child in the dispute.',
    '["شهادات ميلاد الأبناء","أحكام الحضانة أو الزيارة","مستندات المدرسة والصحة","إثبات السكن والمراسلات"]'::jsonb,
    '["Children birth certificates","Custody or visitation orders","School and health records","Residence evidence and communications"]'::jsonb,
    'هل يوجد حكم حالي للحضانة أو الزيارة؟',
    'Is there a current custody or visitation order?'
  ),
  (
    'sharia_alimony',
    'حدّد المستفيدين من النفقة والفترة والمصاريف المطلوبة، واجمع ما يثبت الاحتياجات والدخل والدفعات السابقة. لا تعتمد على تقديرات غير مدعومة بمستندات.',
    'Identify the maintenance beneficiaries, period, and expenses claimed, and collect evidence of needs, income, and prior payments. Do not rely on unsupported estimates.',
    '["عقد الزواج أو الطلاق","شهادات ميلاد الأبناء","إثبات المصروفات","إثبات الدخل والدفعات السابقة"]'::jsonb,
    '["Marriage or divorce document","Children birth certificates","Expense evidence","Income and prior payment evidence"]'::jsonb,
    'هل توجد نفقة مقررة سابقاً أم أن هذا طلب جديد؟',
    'Is maintenance already ordered, or is this a new request?'
  ),
  (
    'sharia_inheritance',
    'ابدأ بحصر الورثة والأصول والديون والوصايا، واجمع المستندات قبل أي توزيع. لا تتصرف في أموال التركة أو توزعها قبل اكتمال الحصر والمراجعة.',
    'Begin by identifying heirs, assets, debts, and wills, and collect documents before any distribution. Do not dispose of or distribute estate assets before the inventory and review are complete.',
    '["شهادة الوفاة","الفريضة الشرعية أو حصر الورثة","مستندات الأصول","بيانات الديون والوصايا"]'::jsonb,
    '["Death certificate","Heir determination document","Asset documents","Debt and will details"]'::jsonb,
    'هل صدرت فريضة شرعية أو حصر للورثة؟',
    'Has an heir determination document been issued?'
  ),
  (
    'commercial_company_formation',
    'حدّد النشاط والشركاء ونسب الملكية والإدارة ورأس المال قبل اختيار الشكل القانوني، وجهّز بيانات جميع المؤسسين. لا توقّع عقد تأسيس أو تدفع التزامات قبل مراجعة الصلاحيات والبنود.',
    'Define the activity, partners, ownership, management, and capital before selecting the legal form, and prepare all founder details. Do not sign formation documents or incur obligations before reviewing authority and terms.',
    '["بيانات الشركاء","النشاط المقترح","نسب الملكية ورأس المال","الأسماء التجارية والموافقات المطلوبة"]'::jsonb,
    '["Partner details","Proposed activity","Ownership and capital","Trade names and required approvals"]'::jsonb,
    'ما النشاط وعدد الشركاء ونسب الملكية المقترحة؟',
    'What are the activity, number of partners, and proposed ownership shares?'
  ),
  (
    'commercial_partner_disputes',
    'حدّد القرار أو التصرف محل النزاع وأثره على الشركة، واحتفظ بسجلات الشركاء والحسابات والمحاضر والمراسلات. لا تنقل أصولاً أو تحذف سجلات الشركة أثناء النزاع.',
    'Identify the disputed decision or conduct and its effect on the company, and preserve ownership, accounting, minutes, and communications records. Do not transfer assets or delete company records during the dispute.',
    '["عقد التأسيس والسجل التجاري","سجل الشركاء والحصص","محاضر الاجتماعات","الحسابات والمراسلات"]'::jsonb,
    '["Memorandum and commercial registration","Partner and share records","Meeting minutes","Accounts and communications"]'::jsonb,
    'هل النزاع على الإدارة أم الأرباح أم الحصص أم قرار معين؟',
    'Is the dispute about management, profits, shares, or a specific decision?'
  ),
  (
    'commercial_contracts',
    'حدّد هل المطلوب صياغة العقد أم مراجعته أم معالجة إخلال قائم، واجمع المسودات والملاحق والمراسلات التجارية. لا توقّع بنوداً غامضة في الدفع أو المسؤولية أو الإنهاء.',
    'Identify whether the need is drafting, review, or an existing breach, and collect drafts, annexes, and business communications. Do not sign unclear payment, liability, or termination terms.',
    '["مسودة أو نسخة العقد","الملاحق","العروض والمراسلات","إثباتات الدفع أو التنفيذ"]'::jsonb,
    '["Draft or signed contract","Annexes","Offers and communications","Payment or performance evidence"]'::jsonb,
    'هل المطلوب صياغة عقد جديد أم معالجة نزاع قائم؟',
    'Is the request to draft a new contract or address an existing dispute?'
  ),
  (
    'commercial_bankruptcy',
    'اجمع صورة حديثة للأصول والالتزامات والتدفقات النقدية والدائنين والدعاوى، واطلب مراجعة عاجلة قبل أي تصرف جوهري. لا تنقل أصولاً أو تفضّل دائناً دون مشورة متخصصة.',
    'Prepare a current picture of assets, liabilities, cash flow, creditors, and proceedings, and seek urgent review before major transactions. Do not transfer assets or prefer a creditor without specialist advice.',
    '["القوائم المالية","قائمة الدائنين والمدينين","بيانات الأصول والالتزامات","الدعاوى وإجراءات التنفيذ"]'::jsonb,
    '["Financial statements","Creditor and debtor lists","Asset and liability details","Claims and enforcement proceedings"]'::jsonb,
    'هل المشكلة تعثر مؤقت أم توقف فعلي عن سداد الديون؟',
    'Is the issue temporary financial distress or an actual inability to pay debts?'
  ),
  (
    'commercial_agencies',
    'راجع عقد الوكالة ونطاقها ومدتها وحصريتها وتسجيلها وإجراءات الإنهاء، واجمع بيانات المبيعات والمراسلات. لا تنه العلاقة أو تعيّن بديلاً قبل مراجعة القيود التعاقدية.',
    'Review the agency agreement, scope, term, exclusivity, registration, and termination process, and collect sales and communication records. Do not terminate or appoint a replacement before reviewing contractual restrictions.',
    '["عقد الوكالة","شهادة التسجيل إن وجدت","بيانات المبيعات","إشعارات الإنهاء والمراسلات"]'::jsonb,
    '["Agency agreement","Registration certificate if any","Sales records","Termination notices and communications"]'::jsonb,
    'هل الوكالة مسجلة أو حصرية، وهل صدر إشعار بإنهائها؟',
    'Is the agency registered or exclusive, and has a termination notice been issued?'
  ),
  (
    'commercial_ecommerce',
    'احفظ سجل الطلب والدفع والتسليم وشروط المنصة والمحادثات بصيغتها الأصلية، وحدّد الحسابات والروابط والتواريخ. لا تحذف السجل الرقمي أو تعدّل محتواه.',
    'Preserve order, payment, delivery, platform terms, and communications in original form, including accounts, links, and dates. Do not delete or alter the digital record.',
    '["تفاصيل الطلب","إثبات الدفع","سياسات وشروط المنصة","المراسلات وسجل التسليم"]'::jsonb,
    '["Order details","Payment evidence","Platform policies and terms","Communications and delivery record"]'::jsonb,
    'هل أنت المشتري أم البائع أم مشغل المنصة، وما المشكلة؟',
    'Are you the buyer, seller, or platform operator, and what is the issue?'
  ),
  (
    'labor_unpaid_wages',
    'رتّب الأشهر والمبالغ غير المدفوعة وقارنها بالعقد وكشوف الحساب والحضور، واحتفظ بالمطالبات المرسلة لصاحب العمل. لا توقّع مخالصة قبل التحقق من كامل المستحقات.',
    'List the unpaid months and amounts and compare them with the contract, bank records, and attendance, and preserve demands sent to the employer. Do not sign a release before verifying all entitlements.',
    '["عقد العمل","كشوف البنك أو الرواتب","سجل الحضور","المطالبات والمراسلات"]'::jsonb,
    '["Employment contract","Bank or payroll records","Attendance record","Demands and communications"]'::jsonb,
    'هل علاقة العمل مستمرة، وكم شهراً من الأجور غير مدفوع؟',
    'Is employment ongoing, and how many months of wages are unpaid?'
  ),
  (
    'labor_unfair_dismissal',
    'دوّن تاريخ الإنهاء وسببه وطريقة إبلاغك، واجمع عقد العمل وإشعار الفصل وسجل الأداء والرواتب. لا توقّع استقالة أو مخالصة بأثر رجعي.',
    'Record the termination date, stated reason, and how notice was given, and collect the employment contract, termination notice, performance, and salary records. Do not sign a backdated resignation or release.',
    '["عقد العمل","إشعار الفصل","المراسلات مع الموارد البشرية","كشوف الرواتب والحضور"]'::jsonb,
    '["Employment contract","Termination notice","HR communications","Payroll and attendance records"]'::jsonb,
    'متى تم الفصل، وهل استلمت إشعاراً مكتوباً بالسبب؟',
    'When were you dismissed, and did you receive written notice of the reason?'
  ),
  (
    'labor_end_of_service',
    'جهّز تاريخ بداية ونهاية العمل وآخر أجر وطريقة انتهاء العلاقة، وقارن أي احتساب بالمبالغ المدفوعة فعلاً. لا تعتمد على احتساب شفهي أو توقّع استلام كامل دون تدقيق.',
    'Prepare employment start and end dates, last salary, and how employment ended, and compare any calculation with actual payments. Do not rely on an oral calculation or sign full receipt without checking.',
    '["عقد العمل","آخر كشوف راتب","الاستقالة أو إشعار الإنهاء","كشف المستحقات والمدفوعات"]'::jsonb,
    '["Employment contract","Latest payslips","Resignation or termination notice","Entitlement and payment statement"]'::jsonb,
    'ما تاريخا بداية ونهاية العمل، وكيف انتهت العلاقة؟',
    'What are the employment start and end dates, and how did employment end?'
  ),
  (
    'labor_work_injury',
    'وثّق الإصابة ومكانها ووقتها وعلاقتها بالعمل، واحتفظ بالتقارير الطبية وإبلاغ صاحب العمل والشهود. لا تؤخر العلاج أو توثيق الواقعة.',
    'Document the injury, place, time, and connection to work, and preserve medical reports, employer notification, and witness details. Do not delay treatment or incident documentation.',
    '["التقارير الطبية","بلاغ أو تقرير الحادث","إشعار صاحب العمل","بيانات الشهود والإجازات المرضية"]'::jsonb,
    '["Medical reports","Incident report","Employer notification","Witness details and sick leave"]'::jsonb,
    'هل وقعت الإصابة أثناء العمل، وهل تم إبلاغ صاحب العمل؟',
    'Did the injury occur during work, and was the employer notified?'
  ),
  (
    'labor_contracts',
    'راجع المسمى والراتب والمدة والتجربة والإنهاء والالتزامات قبل التوقيع، واحتفظ بكل نسخة أو تعديل. لا تعتمد على وعود وظيفية غير مدونة.',
    'Review title, salary, term, probation, termination, and obligations before signing, and preserve every version and amendment. Do not rely on undocumented employment promises.',
    '["عقد أو عرض العمل","التعديلات","سياسات العمل","كشوف الرواتب والمراسلات"]'::jsonb,
    '["Employment contract or offer","Amendments","Workplace policies","Payslips and communications"]'::jsonb,
    'هل المطلوب مراجعة عقد جديد أم حل نزاع في عقد قائم؟',
    'Is the request to review a new contract or resolve a dispute under an existing one?'
  ),
  (
    'administrative_decision_challenge',
    'احصل على نسخة القرار وأسبابه وما يثبت تاريخ إبلاغك به، ورتّب الطلبات والتظلمات والمراسلات السابقة. اطلب مراجعة عاجلة لأن المواعيد الإجرائية قد تكون مؤثرة.',
    'Obtain the decision, reasons, and proof of the notification date, and organize prior applications, grievances, and communications. Seek urgent review because procedural time limits may matter.',
    '["القرار الإداري","إثبات تاريخ الإبلاغ","الطلبات والتظلمات","مراسلات الجهة"]'::jsonb,
    '["Administrative decision","Proof of notification date","Applications and grievances","Authority communications"]'::jsonb,
    'ما تاريخ إبلاغك بالقرار، وهل قدمت تظلماً؟',
    'When were you notified of the decision, and was a grievance submitted?'
  ),
  (
    'administrative_license_permit',
    'اجمع طلب الترخيص والاشتراطات والرسوم وأي قرار رفض أو تعليق ومراسلات الجهة، وحدّد المرحلة الحالية. لا تواصل نشاطاً يتجاوز نطاق الترخيص القائم.',
    'Collect the licence application, requirements, fees, any rejection or suspension decision, and authority communications, and identify the current stage. Do not operate beyond the existing licence scope.',
    '["طلب أو شهادة الترخيص","الاشتراطات","قرار الرفض أو التعليق","إيصالات الرسوم والمراسلات"]'::jsonb,
    '["Licence application or certificate","Requirements","Rejection or suspension decision","Fee receipts and communications"]'::jsonb,
    'هل الطلب جديد أم تم رفض الترخيص أو تعليقه؟',
    'Is this a new application, or was the licence rejected or suspended?'
  ),
  (
    'administrative_tenders',
    'احتفظ بوثائق المناقصة وعرضك والضمانات ونتيجة التقييم وقرار الترسية والمراسلات، وسجّل التواريخ بدقة. لا تعدّل مستندات العرض بعد تقديمها.',
    'Preserve the tender documents, bid, guarantees, evaluation result, award decision, and communications, and record dates accurately. Do not alter bid documents after submission.',
    '["كراسة المناقصة","العرض المقدم","الضمانات","نتيجة التقييم وقرار الترسية"]'::jsonb,
    '["Tender documents","Submitted bid","Guarantees","Evaluation result and award decision"]'::jsonb,
    'هل النزاع قبل الترسية أم بعدها، وما القرار محل الاعتراض؟',
    'Is the dispute before or after award, and which decision is challenged?'
  ),
  (
    'administrative_disciplinary',
    'اجمع قرار الجزاء والتحقيقات والإخطارات وردودك واللوائح المطبقة، وأثبت تاريخ استلام كل مستند. لا توقّع إفادة لا تعكس أقوالك بدقة.',
    'Collect the disciplinary decision, investigation records, notices, responses, and applicable rules, and record receipt dates. Do not sign a statement that does not accurately reflect your evidence.',
    '["قرار الجزاء","إخطار التحقيق","محاضر وأقوال التحقيق","اللوائح والمراسلات"]'::jsonb,
    '["Disciplinary decision","Investigation notice","Investigation records and statements","Rules and communications"]'::jsonb,
    'ما الجهة التي أصدرت الجزاء، ومتى تم إبلاغك به؟',
    'Which authority issued the penalty, and when were you notified?'
  ),
  (
    'constitutional_challenge',
    'حدّد النص القانوني محل الدفع وعلاقته المباشرة بالنزاع القائم، وجهّز ملف القضية والقرارات السابقة. لا تعتمد على اعتراض عام دون بيان أثر النص على القضية.',
    'Identify the challenged provision and its direct connection to the existing dispute, and prepare the case file and prior decisions. Do not rely on a general objection without explaining the provision impact.',
    '["ملف القضية الأصلية","النص القانوني محل الدفع","الأحكام والقرارات السابقة","المذكرات المقدمة"]'::jsonb,
    '["Underlying case file","Challenged legal provision","Prior judgments and decisions","Filed submissions"]'::jsonb,
    'هل توجد قضية منظورة حالياً، وما النص المطلوب الطعن عليه؟',
    'Is there a current case, and which provision is to be challenged?'
  ),
  (
    'constitutional_interpretation',
    'حدّد النص الدستوري والسؤال التفسيري والأثر العملي المطلوب، واجمع القرار أو النزاع الذي أثار المسألة. لا تفصل النص عن سياقه والوقائع المرتبطة به.',
    'Identify the constitutional text, interpretive question, and practical effect sought, and collect the decision or dispute that raised the issue. Do not separate the text from its context and facts.',
    '["النص محل التفسير","القرار أو النزاع المرتبط","المذكرات القانونية","الأحكام ذات الصلة"]'::jsonb,
    '["Text requiring interpretation","Related decision or dispute","Legal submissions","Relevant judgments"]'::jsonb,
    'ما السؤال المحدد المطلوب تفسيره، وما أثره على موضوعك؟',
    'What specific interpretive question is raised, and how does it affect your matter?'
  ),
  (
    'constitutional_rights',
    'حدّد التصرف أو القرار الذي مسّ الحق والجهة الصادر عنها والضرر المباشر، واجمع الأدلة والإجراءات السابقة. لا تكتف بوصف عام للحق دون ربطه بواقعة محددة.',
    'Identify the conduct or decision affecting the right, the issuing authority, and direct impact, and collect evidence and prior proceedings. Do not rely on a general rights statement without linking it to specific facts.',
    '["القرار أو التصرف محل الشكوى","إثبات الضرر","مراسلات الجهة","ملف أي قضية قائمة"]'::jsonb,
    '["Challenged decision or conduct","Evidence of impact","Authority communications","Any existing case file"]'::jsonb,
    'ما الجهة أو القرار الذي مسّ الحق، وهل توجد قضية قائمة؟',
    'Which authority or decision affected the right, and is there an existing case?'
  ),
  (
    'cassation_civil',
    'احصل فوراً على نسخة الحكم المدني وأسبابه وملف المراحل السابقة، وسجّل تاريخ إعلانك بالحكم. لا تؤخر مراجعة محامي لأن الطعن مرتبط بمواعيد وإجراءات دقيقة.',
    'Obtain the civil judgment, reasons, and prior-stage file immediately, and record the service date. Do not delay lawyer review because cassation is subject to precise procedural requirements and time limits.',
    '["الحكم المطعون فيه","إثبات تاريخ الإعلان","صحف الدعوى والمذكرات","أحكام المراحل السابقة"]'::jsonb,
    '["Challenged judgment","Proof of service date","Pleadings and submissions","Earlier-stage judgments"]'::jsonb,
    'متى صدر الحكم ومتى تم إعلانك به؟',
    'When was the judgment issued, and when was it served on you?'
  ),
  (
    'cassation_criminal',
    'احصل فوراً على الحكم الجنائي وأسبابه ومحاضر ومذكرات المراحل السابقة، وسجّل تاريخ صدوره وإعلانك به. اطلب مراجعة عاجلة ولا تعتمد على إعادة سرد الوقائع وحدها.',
    'Obtain the criminal judgment, reasons, and prior records and submissions immediately, and record issuance and service dates. Seek urgent review and do not rely only on retelling the facts.',
    '["الحكم الجنائي","إثبات الإعلان","محاضر الجلسات والتحقيق","المذكرات والأحكام السابقة"]'::jsonb,
    '["Criminal judgment","Proof of service","Hearing and investigation records","Submissions and prior judgments"]'::jsonb,
    'هل الحكم حضوري أم غيابي، ومتى علمت به؟',
    'Was the judgment issued in your presence or in absentia, and when did you learn of it?'
  ),
  (
    'cassation_sharia',
    'اجمع حكم الأحوال الشخصية وأسبابه وأحكام المراحل السابقة والمستندات التي كانت أمام المحكمة، وسجّل تاريخ الإعلان. لا تؤخر المراجعة القانونية للطعن.',
    'Collect the family judgment, reasons, earlier-stage judgments, and documents presented to the court, and record the service date. Do not delay legal review of the appeal.',
    '["الحكم الشرعي","إثبات الإعلان","الأحكام السابقة","المذكرات والمستندات المقدمة"]'::jsonb,
    '["Family judgment","Proof of service","Prior judgments","Filed submissions and documents"]'::jsonb,
    'ما موضوع الحكم، ومتى تم إعلانك به؟',
    'What is the judgment about, and when was it served on you?'
  ),
  (
    'cassation_commercial',
    'اجمع الحكم التجاري وأسبابه والعقود والمحاسبات والمذكرات التي ناقشتها المحاكم السابقة، وسجّل تاريخ الإعلان. لا تضف أو تعدّل مستندات أصلية بعد صدور الحكم.',
    'Collect the commercial judgment, reasons, contracts, accounts, and submissions considered in earlier stages, and record the service date. Do not add to or alter original records after judgment.',
    '["الحكم التجاري","إثبات الإعلان","العقود والحسابات","المذكرات والأحكام السابقة"]'::jsonb,
    '["Commercial judgment","Proof of service","Contracts and accounts","Submissions and prior judgments"]'::jsonb,
    'متى صدر الحكم، وما المسألة التجارية الرئيسية التي حسمها؟',
    'When was the judgment issued, and what main commercial issue did it decide?'
  ),
  (
    'cassation_labor',
    'اجمع الحكم العمالي وأسبابه وعقد العمل وكشوف الرواتب والمذكرات والأحكام السابقة، وسجّل تاريخ الإعلان. لا توقّع تسوية نهائية قبل مراجعة أثرها على الطعن.',
    'Collect the labour judgment, reasons, employment contract, payroll records, submissions, and prior judgments, and record the service date. Do not sign a final settlement before reviewing its effect on the appeal.',
    '["الحكم العمالي","إثبات الإعلان","عقد العمل وكشوف الرواتب","المذكرات والأحكام السابقة"]'::jsonb,
    '["Labour judgment","Proof of service","Employment contract and payroll records","Submissions and prior judgments"]'::jsonb,
    'متى تم إعلان الحكم، وما الطلب العمالي الذي رُفض أو قُضي به؟',
    'When was the judgment served, and which labour claim was rejected or awarded?'
  ),
  (
    'cassation_administrative',
    'اجمع الحكم الإداري وأسبابه والقرار المطعون عليه والتظلمات والمذكرات السابقة، وسجّل تاريخ إعلان الحكم. اطلب مراجعة عاجلة ولا تؤخر تجهيز الملف.',
    'Collect the administrative judgment, reasons, challenged decision, grievances, and prior submissions, and record the judgment service date. Seek urgent review and do not delay file preparation.',
    '["الحكم الإداري","إثبات الإعلان","القرار الإداري والتظلمات","المذكرات والأحكام السابقة"]'::jsonb,
    '["Administrative judgment","Proof of service","Administrative decision and grievances","Submissions and prior judgments"]'::jsonb,
    'متى تم إعلانك بالحكم، وما القرار الإداري محل النزاع؟',
    'When was the judgment served, and which administrative decision is disputed?'
  )
ON CONFLICT (legal_case_key) DO UPDATE SET
  guidance_ar = EXCLUDED.guidance_ar,
  guidance_en = EXCLUDED.guidance_en,
  documents_ar = EXCLUDED.documents_ar,
  documents_en = EXCLUDED.documents_en,
  clarifying_question_ar = EXCLUDED.clarifying_question_ar,
  clarifying_question_en = EXCLUDED.clarifying_question_en,
  is_active = true,
  updated_at = now();

