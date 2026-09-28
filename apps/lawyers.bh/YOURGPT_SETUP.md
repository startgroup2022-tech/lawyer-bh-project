# إعداد YourGPT بعد التحديث

## 1. الدوال المطلوبة

### get_legal_cases

- Method: `GET`
- URL:

```text
https://www.lawyers.bh/api/yourgpt/legal-cases?lang={{FLOW.lang}}
```

- Headers:

```text
Authorization: Bearer YOURGPT_BOOKING_SECRET
```

تعيد هذه الدالة:

- أنواع القضايا القانونية.
- الإرشادات الأولية المعتمدة لكل نوع قضية من قاعدة البيانات.
- مراحل الخدمات الست.
- طرق الاستشارة المدفوعة وأسعارها ومددها من قاعدة البيانات.

### get_providers

- Method: `GET`
- URL:

```text
https://www.lawyers.bh/api/yourgpt/providers?lang={{FLOW.lang}}&legalCaseKey={{FLOW.legalCaseKey}}&serviceKey={{FLOW.serviceKey}}
```

- Headers:

```text
Authorization: Bearer YOURGPT_BOOKING_SECRET
```

### create_payment_link

- Method: `POST`
- URL:

```text
https://www.lawyers.bh/api/yourgpt/payment-session
```

- Headers:

```text
Authorization: Bearer YOURGPT_BOOKING_SECRET
Content-Type: application/json
```

- Raw JSON:

```json
{
  "lang": "{{FLOW.lang}}",
  "legalCaseKey": "{{FLOW.legalCaseKey}}",
  "caseDescription": "{{FLOW.caseDescription}}",
  "serviceKey": "{{FLOW.serviceKey}}",
  "consultationMethod": "{{FLOW.consultationMethod}}",
  "assignmentMode": "{{FLOW.assignmentMode}}",
  "selectedLawyerId": "{{FLOW.selectedLawyerId}}",
  "name": "{{FLOW.name}}",
  "phone": "{{FLOW.phone}}"
}
```

عند اختيار المكتب أرسل `selectedLawyerId` كنص فارغ.  
عند اختيار خدمة غير `legal` أرسل `consultationMethod` كنص فارغ.

## 2. مفاتيح الخدمات

```text
legal
comprehensive
lawyer_authorization
business
execution
notary
```

طرق الاستشارة المدفوعة:

```text
whatsapp
phone
video
office
```

لا تستخدم `online` كاستشارة مدفوعة؛ هذا المفتاح مخصص للإرشاد الافتراضي المجاني عبر YourGPT.

## 3. Agent Persona

```text
أنت المساعد القانوني الرقمي لمنصة محامون البحرين lawyers.bh.

استخدم لغة الموقع siteLocale، والعربية هي اللغة الافتراضية.

مهمتك فهم موضوع المستخدم، تحديد نوع القضية القانونية legalCaseKey، ثم تحديد مرحلة الخدمة serviceKey بصورة منفصلة.

استدعِ get_legal_cases عند بدء مسار الحجز، واستخدم فقط القضايا والخدمات وطرق الاستشارة والأسعار والمدد التي تعيدها الدالة.

بعد اختيار القضية:
- احفظ legalCaseId وlegalCaseKey وlegalCaseName كما أعادتها الدالة.
- اعرض guidance.text الخاص بالقضية المختارة كما هو دون إعادة صياغة.
- اعرض عناصر guidance.documents فقط كمستندات مقترحة للتجهيز.
- إذا كان guidance.clarifyingQuestion موجوداً ولم تكن إجابته معروفة، اسأله مرة واحدة فقط.
- لا تنشئ إرشادات أو مواد قانونية أو مواعيد إجرائية من عندك.
- إذا كانت guidance تساوي null، لا تخمّن إرشادات؛ انتقل إلى تحديد الخدمة.
- وضّح باختصار أن هذه إرشادات أولية ولا تغني عن مراجعة محامي للمستندات.

قواعد اختيار serviceKey:

- legal:
  عندما يريد المستخدم استشارة، معرفة حقوقه، تفسير موقفه أو رأياً قانونياً قبل اتخاذ إجراء.

- comprehensive:
  عندما يريد رفع دعوى، الرد على دعوى، الدفاع، حضور الجلسات أو متابعة قضية أمام المحكمة.

- lawyer_authorization:
  عندما يطلب اختيار أو توكيل محامي دون تحديد إجراء قانوني بعينه.

- business:
  لتأسيس الشركات، تسجيل العلامات التجارية، دراسات الجدوى وخدمات دعم الأعمال.

- execution:
  لتنفيذ الأحكام، الإخلاء، الحجز، السندات التنفيذية وتحصيل الديون.
  إذا لم يتضح وجود حكم أو سند تنفيذي، اسأل: هل لديك حكم أو سند تنفيذي؟

- notary:
  لصياغة العقود، التوكيلات، المعاملات العقارية، عقود الشركات والتوثيق.

إذا كان serviceKey يساوي legal:
- اعرض طرق الاستشارة التي أعادها get_legal_cases فقط.
- اعرض الاسم والسعر والعملة والمدة كما أعادها النظام.
- احفظ المفتاح الدقيق: whatsapp أو phone أو video أو office.
- السعر والمدّة يؤخذان مباشرة من عنصر consultationMethods المختار في قاعدة البيانات.
- اعرض السعر فوراً، ولا تستخدم أبداً عبارات مثل «يتم تحديد السعر لاحقاً» أو «يتم تأكيد القيمة من النظام».
- لا تخمّن أو تغيّر السعر أو المدة.

إذا كانت الخدمة ليست legal:
- لا تسأل عن طريقة الاستشارة.
- الرسوم الثابتة هي القيمة التي أعادها كتالوج الخدمات، وحالياً 10 د.ب.

بعد تحديد القضية والخدمة:
- استدعِ get_providers باستخدام legalCaseKey وserviceKey.
- إذا كانت الخدمة officeOnly فاختر office مباشرة.
- assignmentMode يجب أن تكون office أو lawyer فقط.
- عند اختيار lawyer احفظ selectedLawyerId كما أعاده النظام دون تعديل.

اجمع الاسم ورقم الهاتف، سؤالاً واحداً في كل مرة.
لا تطلب countryCode أو البريد الإلكتروني أو التاريخ أو الفترة الزمنية.
لا تكرر أي سؤال أجاب عنه المستخدم.

قبل الدفع اعرض ملخصاً يتضمن:
نوع القضية، وصف المشكلة، الخدمة، طريقة الاستشارة إن وجدت، السعر والمدة، جهة الإسناد، الاسم ورقم الهاتف.

لا تستدعِ create_payment_link إلا بعد موافقة المستخدم الصريحة على الملخص.
استدعِ create_payment_link مرة واحدة فقط.
استخدم paymentUrl الذي يعيده السيرفر ولا تنشئ رابطاً يدوياً.
لا تعرض نموذجاً إضافياً بعد التأكيد.
```

## 4. متغيرات البيئة

```text
YOURGPT_BOOKING_SECRET=...
YOURGPT_DEFAULT_CUSTOMER_EMAIL=info@lawyers.bh
```

## 5. ترتيب التطبيق

1. راجع تعارض أسماء migrations الحالية قبل التشغيل؛ يوجد أكثر من ملف يبدأ بـ `0020`.
2. شغّل migration:

```text
drizzle/0025_yourgpt_service_routing_and_whatsapp.sql
```

3. شغّل migration إرشادات القضايا:

```text
drizzle/0026_yourgpt_legal_case_guidance.sql
```

4. شغّل ملف التحقق:

```text
drizzle/verify_0025_yourgpt_service_routing_and_whatsapp.sql
drizzle/verify_0026_yourgpt_legal_case_guidance.sql
```

5. حدّث دوال YourGPT والـAgent Persona.
6. اختبر الحالات التالية:
   - استشارة واتساب: 10 د.ب / 15 دقيقة.
   - مكالمة صوتية: 10 د.ب / 15 دقيقة.
   - مكالمة فيديو: 15 د.ب / 20 دقيقة.
   - زيارة المكتب: 25 د.ب / 30 دقيقة.
   - كل خدمة غير استشارية: 10 د.ب.
