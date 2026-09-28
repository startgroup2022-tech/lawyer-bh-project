CREATE TABLE IF NOT EXISTS "terms_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_type" varchar(32) NOT NULL,
  "version" integer NOT NULL,
  "status" varchar(16) DEFAULT 'draft' NOT NULL,
  "content_ar" text NOT NULL,
  "content_en" text NOT NULL,
  "platform_percentage_year_one" numeric(5, 2),
  "platform_percentage_year_two" numeric(5, 2),
  "created_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "updated_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "published_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "archived_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "published_at" timestamp(3) with time zone,
  "archived_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "terms_versions_document_type_check" CHECK ("document_type" IN ('general', 'lawyer_registration')),
  CONSTRAINT "terms_versions_status_check" CHECK ("status" IN ('draft', 'published', 'archived')),
  CONSTRAINT "terms_versions_content_ar_check" CHECK (length(btrim("content_ar")) > 0),
  CONSTRAINT "terms_versions_content_en_check" CHECK (length(btrim("content_en")) > 0),
  CONSTRAINT "terms_versions_version_check" CHECK ("version" > 0),
  CONSTRAINT "terms_versions_year_one_percentage_check" CHECK ("platform_percentage_year_one" IS NULL OR "platform_percentage_year_one" BETWEEN 0 AND 100),
  CONSTRAINT "terms_versions_year_two_percentage_check" CHECK ("platform_percentage_year_two" IS NULL OR "platform_percentage_year_two" BETWEEN 0 AND 100),
  CONSTRAINT "terms_versions_commission_scope_check" CHECK (
    ("document_type" = 'general' AND "platform_percentage_year_one" IS NULL AND "platform_percentage_year_two" IS NULL)
    OR
    ("document_type" = 'lawyer_registration' AND "platform_percentage_year_one" IS NOT NULL AND "platform_percentage_year_two" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "terms_versions_document_version_unique_idx"
  ON "terms_versions" ("document_type", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "terms_versions_one_published_per_document_idx"
  ON "terms_versions" ("document_type") WHERE status = 'published';
CREATE INDEX IF NOT EXISTS "terms_versions_current_publication_idx"
  ON "terms_versions" ("document_type", "published_at" DESC) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS "lawyer_terms_acceptances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lawyer_id" uuid NOT NULL REFERENCES "bahrain_lawyers"("id") ON DELETE RESTRICT,
  "terms_version_id" uuid NOT NULL REFERENCES "terms_versions"("id") ON DELETE RESTRICT,
  "accepted_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "accepted_ip" varchar(64),
  "accepted_user_agent" text,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lawyer_terms_acceptances_lawyer_version_unique_idx"
  ON "lawyer_terms_acceptances" ("lawyer_id", "terms_version_id");
CREATE INDEX IF NOT EXISTS "lawyer_terms_acceptances_lawyer_idx"
  ON "lawyer_terms_acceptances" ("lawyer_id", "accepted_at" DESC);

CREATE TABLE IF NOT EXISTS "lawyer_terms_acceptance_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "lawyer_id" uuid NOT NULL REFERENCES "bahrain_lawyers"("id") ON DELETE RESTRICT,
  "terms_version_id" uuid NOT NULL REFERENCES "terms_versions"("id") ON DELETE RESTRICT,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "notification_status" varchar(16) DEFAULT 'pending' NOT NULL,
  "notification_attempt_count" integer DEFAULT 0 NOT NULL,
  "notification_last_error" text,
  "notification_last_attempt_at" timestamp(3) with time zone,
  "notification_delivered_at" timestamp(3) with time zone,
  "requested_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "requested_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "accepted_at" timestamp(3) with time zone,
  "cancelled_at" timestamp(3) with time zone,
  "cancelled_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lawyer_terms_acceptance_requests_status_check" CHECK ("status" IN ('pending', 'accepted', 'cancelled')),
  CONSTRAINT "lawyer_terms_acceptance_requests_notification_status_check" CHECK ("notification_status" IN ('pending', 'delivered', 'failed')),
  CONSTRAINT "lawyer_terms_acceptance_requests_attempt_count_check" CHECK ("notification_attempt_count" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "lawyer_terms_acceptance_requests_lawyer_version_unique_idx"
  ON "lawyer_terms_acceptance_requests" ("lawyer_id", "terms_version_id");
CREATE INDEX IF NOT EXISTS "lawyer_terms_acceptance_requests_campaign_idx"
  ON "lawyer_terms_acceptance_requests" ("campaign_id");
CREATE INDEX IF NOT EXISTS "lawyer_terms_acceptance_requests_pending_idx"
  ON "lawyer_terms_acceptance_requests" ("lawyer_id", "terms_version_id") WHERE status = 'pending';

INSERT INTO "terms_versions" (
  "document_type", "version", "status", "content_ar", "content_en", "published_at"
)
VALUES (
  'general',
  1,
  'published',
  $terms_ar$الشروط والأحكام
باستخدامك لمنصة محامون البحرين، فإنك توافق على الالتزام بهذه الشروط والأحكام. تشكل هذه الشروط اتفاقية ملزمة قانونياً بينك وبين مؤسسة ساريا سكوير لخدمات الأعمال (سجل تجاري رقم 96375-5)، مالكة المنصة.

طبيعة المحتوى
قد يشمل المحتوى المقدم على هذه المنصة نصوصاً وبيانات ورسومات وصوراً ومواد أخرى. تعمل المنصة كوسيط يربط المستفيدين بالممارسين القانونيين المرخصين ولا تقدم بنفسها خدمات قانونية.

سياسة الخصوصية والأمان
تعتبر المعلومات المقدمة عبر المنصة غير سرية ما لم يتم الاتفاق صراحة على خلاف ذلك. لا تقوم المنصة بتوصية محامين أو مقدمي خدمات محددين. يتحمل المستخدمون مسؤولية اختيارهم للممارسين القانونيين.

شروط الدفع
يمكن الدفع مقابل الخدمات نقداً مباشرة لمقدم الخدمة أو من خلال نظام الدفع الإلكتروني للمنصة. تحتفظ المنصة بالحق في تعديل رسوم الخدمات في أي وقت مع إشعار مسبق.

تسجيل المستخدم
لا يتطلب تصفح المنصة التسجيل. ومع ذلك، قد تتطلب بعض الخدمات تسجيل المستخدم. يجب على المستخدمين تقديم معلومات دقيقة وحديثة عند التسجيل.

مسؤولية المنصة
المنصة غير مسؤولة عن أي اتفاقيات مبرمة بين العملاء والمحامين خارج نطاق المنصة. لا تضمن المنصة نتائج أي إجراءات قانونية.

القانون الواجب التطبيق
تخضع هذه الشروط لقوانين مملكة البحرين وتُفسر وفقاً لها. تخضع أي نزاعات ناشئة عن هذه الشروط للاختصاص القضائي الحصري لمحاكم مملكة البحرين.

التعديلات
تحتفظ المنصة بالحق في تعديل هذه الشروط في أي وقت. يعتبر الاستمرار في استخدام المنصة بعد أي تغييرات قبولاً بالشروط المعدلة.$terms_ar$,
  $terms_en$Terms and Conditions
By accessing and using the Lawyers.bh platform, you agree to be bound by these terms and conditions. These terms constitute a legally binding agreement between you and Saraya Square Foundation for Services Business (CR No. 96375-5), the owner of the platform.

Nature of Content
The content provided on this platform may include text, data, graphics, images, and other materials. The platform acts as an intermediary connecting beneficiaries with licensed legal practitioners and does not itself provide legal services.

Privacy and Security Policy
Information submitted through the platform is considered non-confidential unless explicitly agreed otherwise. The platform does not recommend specific lawyers or service providers. Users are responsible for their own selection of legal practitioners based on the information provided.

Payment Terms
Payment for services may be made in cash directly to the service provider or through the platform's online payment system. The platform reserves the right to modify service fees at any time with prior notice.

User Registration
Registration is not required to browse the platform. However, certain services may require user registration. Users must provide accurate and current information during registration.

Platform Liability
The platform is not responsible for any agreements concluded between clients and lawyers outside the scope of the platform. The platform does not guarantee the outcome of any legal proceedings.

Choice of Law
These terms shall be governed by and construed in accordance with the laws of the Kingdom of Bahrain. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of the Kingdom of Bahrain.

Amendments
The platform reserves the right to amend these terms at any time. Continued use of the platform following any changes constitutes acceptance of the revised terms.$terms_en$,
  now()
)
ON CONFLICT ("document_type", "version") DO NOTHING;

INSERT INTO "terms_versions" (
  "document_type", "version", "status", "content_ar", "content_en",
  "platform_percentage_year_one", "platform_percentage_year_two", "published_at"
)
VALUES (
  'lawyer_registration',
  1,
  'published',
  $lawyer_ar$يفوض مقدم الطلب شركة الخليج الدولية للتحصيل والاستشارات باستقبال الطلبات والرد على العملاء وحجز المواعيد وتحصيل المبالغ نيابة عنه.

تستحق المنصة عمولة بنسبة 20% من قيمة الأتعاب المحصلة فعليًا عن الخدمات أو الأعمال التي تتم من خلال المنصة خلال السنة الأولى من تاريخ تسجيل المحامي واعتماد حسابه، وتصبح العمولة 45% اعتبارًا من بداية السنة الثانية وما بعدها، ما لم يُتفق كتابيًا على خلاف ذلك.

تحتفظ المنصة بالحق في تعليق أي محامي يتبين عدم ترخيصه أو حظره من الممارسة.

رسوم التسجيل إدارية وغير قابلة للاسترداد.

توفر المنصة خدمات الدفع الإلكتروني لمعاملات العملاء.

تحل جميع النزاعات عن طريق التحكيم وفقاً لقوانين مملكة البحرين.$lawyer_ar$,
  $lawyer_en$The applicant authorizes Gulf International Collection to receive requests, respond to clients, book appointments, and collect payments on their behalf.

The platform is entitled to a commission of 20% on fees actually collected for services or work obtained through the platform during the first year from the lawyer's registration and account approval date, and 45% beginning from the second year and thereafter, unless otherwise agreed in writing.

The platform retains the right to delete any lawyer found unlicensed or prohibited from practice.

Registration fees are administrative and non-refundable.

The platform provides electronic payment services for client transactions.

All disputes shall be resolved by arbitration in accordance with the laws of the Kingdom of Bahrain.$lawyer_en$,
  20.00,
  45.00,
  now()
)
ON CONFLICT ("document_type", "version") DO NOTHING;

UPDATE "admin_users"
SET
  "permissions" = jsonb_set(
    COALESCE("permissions", '{}'::jsonb),
    '{manage_terms_commissions}',
    'true'::jsonb,
    true
  ),
  "permissions_updated_at" = now()
WHERE "role" IN ('admin', 'super_admin')
  AND "is_active" = true;
