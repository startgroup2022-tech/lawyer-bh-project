# إعداد مساعد واتساب «د. نبيه»

هذا التكامل لا يستخدم YourGPT. يستقبل Lawyers.bh رسائل WhatsApp Cloud API،
ويستخدم OpenAI لفهم المقصد فقط، ثم يقرأ القضايا والخدمات والأسعار والمدد
والمحامين والمواعيد من مصادر Lawyers.bh الحالية.

## المسار

```text
WhatsApp -> Meta Cloud API -> /api/whatsapp/webhook -> Dr. Nabih -> Lawyers.bh data
```

عنوان callback بعد وجود بيئة منشورة معتمدة:

```text
https://www.lawyers.bh/api/whatsapp/webhook
```

## المتغيرات المطلوبة

أضف القيم إلى البيئة الآمنة فقط، ولا تضعها في Git أو هذا الملف:

```text
META_WHATSAPP_VERIFY_TOKEN
META_WHATSAPP_APP_SECRET
META_WHATSAPP_ACCESS_TOKEN
META_WHATSAPP_PHONE_NUMBER_ID
META_WHATSAPP_GRAPH_VERSION
OPENAI_API_KEY
OPENAI_WHATSAPP_MODEL
```

يبقى `META_WHATSAPP_VERIFY_TOKEN` متطابقًا بين إعداد callback في Meta والبيئة.
يستخدم POST توقيع `X-Hub-Signature-256` ويفحصه قبل تحليل الرسالة.

## تفعيل Meta لاحقًا

1. تحقق من ملكية Business وWABA والرقم الحالي وصلاحية coexistence دون فصل الرقم.
2. أنشئ تطبيق Meta/منتج WhatsApp Cloud API أو اربط الموجود بعد موافقة صريحة.
3. أضف callback واشترك في أحداث `messages`.
4. أضف الرموز والمعرفات إلى البيئة الآمنة.
5. طبّق migration `0072_whatsapp_dr_nabih` في بيئة اختبار أولًا.
6. اختبر رقم Meta التجريبي قبل نقل الرقم الحالي.

إنجاز الكود محليًا لا يعني أن migration طُبقت أو أن الموقع نُشر أو أن الرقم
الحالي رُبط. كل خطوة إنتاجية تحتاج تحققًا وموافقة مستقلة.

## سلوك التعطل

عند غياب OpenAI يعرض النظام القوائم المنظمة. عند فشل مصدر بيانات Lawyers.bh
لا يعرض سعرًا أو موعدًا محفوظًا، ويطلب من العميل المحاولة لاحقًا أو التحويل
إلى خدمة العملاء على `info@lawyers.bh`.
