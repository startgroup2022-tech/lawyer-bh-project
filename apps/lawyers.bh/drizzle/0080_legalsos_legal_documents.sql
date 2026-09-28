ALTER TABLE terms_versions DROP CONSTRAINT terms_versions_document_type_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_document_type_check
  CHECK (document_type IN ('general', 'lawyer_registration', 'legalsos_terms', 'legalsos_privacy'));
ALTER TABLE terms_versions DROP CONSTRAINT terms_versions_commission_scope_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_commission_scope_check CHECK (
  (document_type IN ('general', 'legalsos_terms', 'legalsos_privacy') AND platform_percentage_year_one IS NULL AND platform_percentage_year_two IS NULL)
  OR (document_type = 'lawyer_registration' AND platform_percentage_year_one IS NOT NULL AND platform_percentage_year_two IS NOT NULL)
);

-- Preserve the existing LegalSOS copy; no new legal provisions are introduced.
INSERT INTO terms_versions (document_type, version, status, content_ar, content_en, published_at)
SELECT 'legalsos_terms', 1, 'published', 'قبول الشروط
باستخدام موقع أو تطبيق LegalSOS أو إرسال طلب من خلالهما، فإنك توافق على هذه الشروط وسياسة الخصوصية. تشكل هذه الوثيقة اتفاقاً بينك وبين شركة GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L، المالكة والمشغلة للخدمة.

طبيعة الخدمة
LegalSOS منصة وسيطة تساعد المستخدم على إرسال طلب قانوني والوصول إلى محامين أو مقدمي خدمات قانونية بحسب الدولة والتخصص والتوافر. LegalSOS ليست جهة حكومية أو شرطة أو إسعافاً أو دفاعاً مدنياً، ولا تستبدل خدمات الطوارئ الرسمية.

الخصوصية والأمان
نتعامل مع البيانات الشخصية بالقدر اللازم لتشغيل الخدمة وحماية الحسابات ومتابعة الطلبات. نستخدم إجراءات تقنية وتنظيمية معقولة، لكن لا يمكن ضمان أمان الإرسال أو التخزين الإلكتروني بصورة مطلقة.

البيانات التي نجمعها واستخدامها
قد نجمع الاسم وبيانات التواصل وبيانات الحساب ووصف الطلب والمرفقات وبيانات الجهاز وسجلات الاستخدام ومعلومات الدفع المرجعية. نستخدمها لإنشاء الطلب والتحقق من الحساب وتقديم الدعم ومنع الاحتيال وتحسين الخدمة والامتثال للالتزامات القانونية.

الموقع والإشعارات
لا نصل إلى الموقع أو الإشعارات إلا بعد إذن الجهاز. يستخدم الموقع لتحديد الدولة أو ربط الطلب بالمكان والعثور على مقدم خدمة قريب عند الحاجة. تستخدم الإشعارات لإبلاغك بتحديثات الطلب، ويمكنك إيقاف الصلاحيات من إعدادات الجهاز.

مشاركة البيانات
قد نشارك الحد الأدنى اللازم من بيانات الطلب مع المحامي أو مقدم الخدمة المكلّف، ومع مزودي الاستضافة والاتصالات والدفع والتحليلات الذين يساعدون في تشغيل LegalSOS. وقد نفصح عن بيانات عندما يفرض القانون ذلك أو لحماية الحقوق والسلامة.

الدفع
قد تتم المدفوعات من خلال مزود دفع خارجي. لا نعرض بيانات البطاقة الكاملة ولا نخزنها في أنظمة LegalSOS عندما يعالجها مزود الدفع مباشرة. تخضع المعاملة أيضاً لشروط وسياسة الخصوصية الخاصة بمزود الدفع.

الحسابات ومسؤولية المستخدم
يجب تقديم معلومات صحيحة وحديثة والمحافظة على سرية بيانات الدخول. أنت مسؤول عن النشاط الذي يتم من حسابك وعن مشروعية ودقة المحتوى والمستندات التي ترسلها، ويجب إبلاغنا عند الاشتباه في استخدام غير مصرح به.

حدود مسؤولية المنصة
لا تضمن LegalSOS قبول محامٍ للطلب أو زمن الوصول أو نتيجة الاستشارة أو القضية. العلاقة المهنية والخدمة القانونية الفعلية تكون مع مقدم الخدمة المختار أو المكلّف، ولا تتحمل المنصة مسؤولية الاتفاقات التي تتم خارج نطاقها.

الاحتفاظ بالبيانات وحقوقك
نحتفظ بالبيانات للمدة اللازمة لتقديم الخدمة وتسوية المعاملات والوفاء بالمتطلبات القانونية وحماية الحقوق. يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عندما يسمح القانون بذلك عبر التواصل معنا.

القانون والاختصاص
تخضع هذه الشروط لقوانين مملكة البحرين وتفسر وفقاً لها. تكون محاكم مملكة البحرين مختصة بالنزاعات الناشئة عن استخدام LegalSOS، ما لم يوجب قانون نافذ خلاف ذلك.

التعديلات والتواصل
يجوز تحديث هذه الوثيقة عند تغير الخدمة أو المتطلبات القانونية، ويظهر تاريخ التحديث في أعلى الصفحة. للاستفسارات والطلبات المتعلقة بالخصوصية تواصل معنا عبر info@legalsos.com.', 'Acceptance of terms
By using the LegalSOS website or app, or submitting a request through either, you agree to these terms and this privacy policy. This document is an agreement between you and GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L, the owner and operator of the service.

Nature of the service
LegalSOS is an intermediary platform that helps users submit legal requests and reach lawyers or legal service providers according to country, specialty and availability. LegalSOS is not a government, police, ambulance or civil-defence service and does not replace official emergency services.

Privacy and security
We process personal data only as reasonably required to operate the service, protect accounts and manage requests. We apply reasonable technical and organisational safeguards, but no electronic transmission or storage method can be guaranteed absolutely secure.

Data we collect and why
We may collect names, contact and account details, request descriptions, attachments, device and usage records, and payment references. We use this information to create requests, verify accounts, provide support, prevent fraud, improve the service and meet legal obligations.

Location and notifications
We access location or notifications only after device permission. Location may identify the country, associate a request with a place or find a nearby provider. Notifications deliver request updates. You can disable either permission in your device settings.

Data sharing
We may share the minimum request information needed with the assigned lawyer or provider and with hosting, communication, payment and analytics vendors that operate LegalSOS. We may also disclose information when required by law or to protect rights and safety.

Payments
Payments may be handled by an external payment provider. LegalSOS does not display or store full card details when the provider processes them directly. Transactions are also governed by the payment provider''s terms and privacy practices.

Accounts and user responsibilities
You must provide accurate, current information and keep credentials confidential. You are responsible for account activity and for the legality and accuracy of content and documents you submit. Notify us if you suspect unauthorised account use.

Platform limitations
LegalSOS does not guarantee that a lawyer will accept a request, arrival time, advice, or the outcome of a matter. The professional relationship and legal service are with the selected or assigned provider. The platform is not responsible for agreements made outside it.

Retention and your rights
We retain data as needed to deliver services, settle transactions, meet legal requirements and protect rights. You may request access, correction or deletion where permitted by law by contacting us.

Governing law
These terms are governed by the laws of the Kingdom of Bahrain. Bahrain courts have jurisdiction over disputes arising from LegalSOS use unless applicable law requires otherwise.

Changes and contact
We may update this document when the service or legal requirements change, and the date above will identify the latest version. For privacy questions or requests, contact info@legalsos.com.', now()
WHERE NOT EXISTS (SELECT 1 FROM terms_versions WHERE document_type = 'legalsos_terms');
INSERT INTO terms_versions (document_type, version, status, content_ar, content_en, published_at)
SELECT 'legalsos_privacy', 1, 'published', 'الخصوصية والأمان
نتعامل مع البيانات الشخصية بالقدر اللازم لتشغيل الخدمة وحماية الحسابات ومتابعة الطلبات. نستخدم إجراءات تقنية وتنظيمية معقولة، لكن لا يمكن ضمان أمان الإرسال أو التخزين الإلكتروني بصورة مطلقة.

البيانات التي نجمعها واستخدامها
قد نجمع الاسم وبيانات التواصل وبيانات الحساب ووصف الطلب والمرفقات وبيانات الجهاز وسجلات الاستخدام ومعلومات الدفع المرجعية. نستخدمها لإنشاء الطلب والتحقق من الحساب وتقديم الدعم ومنع الاحتيال وتحسين الخدمة والامتثال للالتزامات القانونية.

الموقع والإشعارات
لا نصل إلى الموقع أو الإشعارات إلا بعد إذن الجهاز. يستخدم الموقع لتحديد الدولة أو ربط الطلب بالمكان والعثور على مقدم خدمة قريب عند الحاجة. تستخدم الإشعارات لإبلاغك بتحديثات الطلب، ويمكنك إيقاف الصلاحيات من إعدادات الجهاز.

مشاركة البيانات
قد نشارك الحد الأدنى اللازم من بيانات الطلب مع المحامي أو مقدم الخدمة المكلّف، ومع مزودي الاستضافة والاتصالات والدفع والتحليلات الذين يساعدون في تشغيل LegalSOS. وقد نفصح عن بيانات عندما يفرض القانون ذلك أو لحماية الحقوق والسلامة.

الاحتفاظ بالبيانات وحقوقك
نحتفظ بالبيانات للمدة اللازمة لتقديم الخدمة وتسوية المعاملات والوفاء بالمتطلبات القانونية وحماية الحقوق. يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عندما يسمح القانون بذلك عبر التواصل معنا.

القانون والاختصاص
تخضع هذه الشروط لقوانين مملكة البحرين وتفسر وفقاً لها. تكون محاكم مملكة البحرين مختصة بالنزاعات الناشئة عن استخدام LegalSOS، ما لم يوجب قانون نافذ خلاف ذلك.

التعديلات والتواصل
يجوز تحديث هذه الوثيقة عند تغير الخدمة أو المتطلبات القانونية، ويظهر تاريخ التحديث في أعلى الصفحة. للاستفسارات والطلبات المتعلقة بالخصوصية تواصل معنا عبر info@legalsos.com.', 'Privacy and security
We process personal data only as reasonably required to operate the service, protect accounts and manage requests. We apply reasonable technical and organisational safeguards, but no electronic transmission or storage method can be guaranteed absolutely secure.

Data we collect and why
We may collect names, contact and account details, request descriptions, attachments, device and usage records, and payment references. We use this information to create requests, verify accounts, provide support, prevent fraud, improve the service and meet legal obligations.

Location and notifications
We access location or notifications only after device permission. Location may identify the country, associate a request with a place or find a nearby provider. Notifications deliver request updates. You can disable either permission in your device settings.

Data sharing
We may share the minimum request information needed with the assigned lawyer or provider and with hosting, communication, payment and analytics vendors that operate LegalSOS. We may also disclose information when required by law or to protect rights and safety.

Retention and your rights
We retain data as needed to deliver services, settle transactions, meet legal requirements and protect rights. You may request access, correction or deletion where permitted by law by contacting us.

Governing law
These terms are governed by the laws of the Kingdom of Bahrain. Bahrain courts have jurisdiction over disputes arising from LegalSOS use unless applicable law requires otherwise.

Changes and contact
We may update this document when the service or legal requirements change, and the date above will identify the latest version. For privacy questions or requests, contact info@legalsos.com.', now()
WHERE NOT EXISTS (SELECT 1 FROM terms_versions WHERE document_type = 'legalsos_privacy');
