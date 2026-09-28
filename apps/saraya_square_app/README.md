# Saraya Square

تطبيق سرايا سكوير المتجاوب لإدارة المجمع بالعربية والإنجليزية. يتصل بخدمات
`/api/saraya/v1` في مشروع `apps/lawyers.bh` ولا يحتوي على بيانات تجريبية في
نسخة الإنتاج.

## Public journeys

- `/` الصفحة العامة والوحدات المتاحة دون تسجيل دخول.
- `/units/:unitId` تفاصيل الوحدة مع مسارين مستقلين: حجز زيارة أو الاستئجار.
- `/units/:unitId/rent` التحقق برمز OTP، رفع الهوية، وإرسال طلب الاستئجار.
- `/rental-requests/:requestId` حالة الطلب، الدفع، العقد، والتوقيع.
- `/saraya/rental-requests/:requestId` رابط عودة جوال موثّق يحوّل إلى مسار الحالة.

المسارات الإدارية تشمل `/dashboard` و`/units` و`/viewings` و`/rental-requests`
وفق صلاحيات العضوية. الخدمات المقابلة تبدأ من `/api/saraya/v1`، وتشمل المخزون
العام، الزيارات، onboarding، طلبات الإيجار، الدفع، المستندات والعقود.

## Configuration

### Flutter

- `SARAYA_API_BASE_URL`: اختياري للتطوير المحلي فقط. عند عدم ضبطه يستخدم التطبيق
  أصل الصفحة الحالي، وهو الإعداد الصحيح لحزمة الإنتاج على `/saraya/`.

### Server

- `DATABASE_URL`: قاعدة البيانات التي تطبق عليها migrations الخادم بشكل منفصل.
- `POSTMARK_SERVER_TOKEN` و`POSTMARK_FROM_EMAIL`: تسليم OTP بالبريد.
- `SARAYA_SMS_WEBHOOK_URL` و`SARAYA_SMS_WEBHOOK_SECRET`: تسليم OTP بالرسائل.
- `TAP_SECRET_KEY` و`TAP_MERCHANT_ID` و`NEXT_PUBLIC_SITE_URL`: إنشاء شحنة Tap
  والتحقق منها على الخادم. لا يوضع مفتاح Tap السري في Flutter.
- `SARAYA_LOCAL_DOCUMENT_ROOT`: تخزين خاص محلي للمستندات عندما لا تستخدم خدمة
  تخزين أخرى.
- `SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS`: بصمات شهادة Android مفصولة بفواصل.
- `SARAYA_APPLE_TEAM_ID`: Team ID المستخدم في Universal Links على iOS.

إذا لم تضبط قيم الارتباط بالجوال، ترجع ملفات الارتباط قوائم فارغة آمنة بدل
الإعلان عن ارتباط غير موثّق.

## Mobile association

- Android: `/.well-known/assetlinks.json` للحزمة
  `bh.lawyers.saraya_square_app`.
- iOS: `/.well-known/apple-app-site-association` للحزمة
  `bh.lawyers.sarayaSquareApp`.
- النطاق المسموح: `/saraya/rental-requests/*`.

يجب التحقق من App Links وUniversal Links على نسخ موقعة فعلية بعد ضبط بصمة
Android وApple Team ID ونشر ملفات `/.well-known` على النطاق الحي.

## Local verification and artifact

```bash
flutter pub get
flutter gen-l10n
dart format lib test integration_test tool
flutter analyze
flutter test --concurrency=1
flutter build web --release --base-href /saraya/ --no-wasm-dry-run
dart run tool/publish_web.dart
```

ينسخ الأمر الأخير الحزمة المحلية بعد فحصها إلى
`../lawyers.bh/public/saraya`. يحتفظ الناشر بالحزمة السابقة ويستعيدها إذا فشل
الاستبدال. حزمة الإنتاج لا تضبط `SARAYA_API_BASE_URL`، كي لا تحتوي على عنوان API
تطويري.

## Verification boundaries

### Verified locally

- اختبارات Flutter تستخدم حدودًا وهمية للزيارات وOTP وTap والتحويل البنكي؛ وهي
  تثبت انتقالات الواجهة والحالة، ولا تمثل دفعًا أو رسالة OTP حقيقية.
- حجز الزيارة مستقل عن طلب الإيجار، وتعارض السعة مغطى.
- الموافقة اليدوية تمنع الدفع، والموافقة الفورية تسمح به.
- تأكيد الدفع من الخادم أو اعتماد الإثبات اليدوي ينشئ عقدًا واحدًا فقط.
- تفعيل العقد وإشغال الوحدة يحدثان بعد توقيع المستأجر والمالك.
- الحزمة المحلية تتحقق من base href `/saraya/` وعلامة البناء والمسارات الجديدة
  وعدم تضمين عنوان API تطويري.

### Needs live verification

- إرسال OTP عبر Postmark أو مزود الرسائل الفعلي.
- Tap sandbox/production webhook والتسوية البنكية؛ فتح رابط الدفع وحده ليس نجاحًا.
- تطبيق migrations والتحقق منها على قاعدة البيئة المستهدفة.
- ملفات App Links/Universal Links على النطاق واختبارها على Android/iOS موقّعين.
- النشر، حالة منصة الاستضافة، والمسارات العامة الحية؛ البناء المحلي ليس نشرًا.
