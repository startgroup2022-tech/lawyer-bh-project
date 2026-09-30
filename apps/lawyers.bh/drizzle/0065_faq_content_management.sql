DO $$ BEGIN
  CREATE TYPE public.faq_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.faq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key varchar(64) NOT NULL UNIQUE,
  name_ar text NOT NULL, name_en text NOT NULL, description_ar text NOT NULL, description_en text NOT NULL,
  icon_key varchar(32) NOT NULL, status public.faq_status NOT NULL DEFAULT 'draft', position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  archived_at timestamptz, archived_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL, updated_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(), updated_at timestamptz(3) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES public.faq_categories(id) ON DELETE RESTRICT,
  question_ar text NOT NULL, question_en text NOT NULL, answer_ar text NOT NULL, answer_en text NOT NULL,
  status public.faq_status NOT NULL DEFAULT 'draft', position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  archived_at timestamptz, archived_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL, updated_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(), updated_at timestamptz(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faq_categories_public_order_idx ON public.faq_categories(status, archived_at, position);
CREATE INDEX IF NOT EXISTS faq_questions_category_order_idx ON public.faq_questions(category_id, archived_at, position);
CREATE INDEX IF NOT EXISTS faq_questions_public_order_idx ON public.faq_questions(status, archived_at, category_id, position);

UPDATE public.admin_users
SET permissions = jsonb_set(permissions, '{manage_faq}', 'true'::jsonb, true), permissions_updated_at = now()
WHERE role = 'admin' AND is_active = true
  AND permissions @> '{"view_dashboard":true,"manage_discounts":true,"manage_approvals":true,"manage_requests":true,"manage_finance":true,"manage_reviews":true,"manage_lawyers":true,"manage_notifications":true}'::jsonb;

INSERT INTO public.faq_categories (key,name_ar,name_en,description_ar,description_en,icon_key,status,position) VALUES
('general','عام','General','تعريف المنصة وطريقة عملها','Platform overview and how it works','help-circle','published',0),
('services','الخدمات القانونية','Legal Services','الاستشارات والتوثيق والخدمات القانونية','Consultations, notary and legal services','scale','published',1),
('providers','مقدمو الخدمة','Service Providers','انضمام المحامين ومراجعة البيانات','Provider onboarding and verification','user-check','published',2),
('payments','الدفع والرسوم','Payments & Fees','الرسوم والدفع الإلكتروني','Fees and online payment','credit-card','published',3),
('privacy','الخصوصية والأمان','Privacy & Security','حماية البيانات وإدارة الحساب','Data protection and account management','shield-check','published',4)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.faq_questions (category_id,question_ar,question_en,answer_ar,answer_en,status,position)
SELECT c.id,v.question_ar,v.question_en,v.answer_ar,v.answer_en,'published',v.position
FROM (VALUES
('general','ما هي منصة محامون البحرين؟','What is Lawyers.bh?','محامون البحرين هي منصة تربط العملاء بمقدمي الخدمات القانونية مثل المحامين، المستشارين، الموثقين، الوسطاء، المحكمين، والخبراء.','Lawyers.bh is a platform that connects clients with legal service providers such as lawyers, consultants, notaries, mediators, arbitrators, and experts.',0),
('general','هل المنصة تقدم استشارة قانونية مباشرة؟','Does the platform provide legal advice directly?','المنصة تسهّل الوصول إلى مقدم الخدمة المناسب، أما الاستشارة أو الرأي القانوني فيقدمه مقدم الخدمة المختص.','The platform helps you reach the right service provider. Legal advice is provided by the selected professional.',1),
('services','ما أنواع الخدمات المتوفرة؟','What services are available?','تشمل الخدمات الاستشارات القانونية، التوثيق، الوساطة، التحكيم، التنفيذ الخاص، الخبرة، ومتابعة بعض المعاملات القانونية حسب توفر مقدم الخدمة.','Services may include legal consultations, notary services, mediation, arbitration, private execution, expert services, and selected legal transactions depending on provider availability.',0),
('services','هل أستطيع اختيار التخصص القانوني؟','Can I choose the legal specialty?','نعم، يمكنك اختيار مجال الخدمة أو التخصص المناسب مثل القضايا المدنية، التجارية، الجنائية، الشرعية، العمالية وغيرها.','Yes, you can choose the suitable service area or specialty such as civil, commercial, criminal, sharia, labor, and other fields.',1),
('providers','كيف ينضم المحامي أو مقدم الخدمة؟','How can a lawyer or provider join?','يمكن لمقدم الخدمة تقديم طلب الانضمام من خلال صفحة التسجيل، وإرفاق البيانات والمستندات المطلوبة، ثم تتم مراجعة الطلب من الإدارة.','A provider can submit a join application through the registration page, attach the required information and documents, and wait for admin review.',0),
('providers','هل يتم التحقق من بيانات مقدمي الخدمة؟','Are provider details verified?','نعم، يتم مراجعة بيانات الطلب والمستندات قبل تفعيل الحساب على المنصة.','Yes, application details and documents are reviewed before activating the account on the platform.',1),
('payments','هل توجد رسوم على الخدمات؟','Are there service fees?','قد تختلف الرسوم حسب نوع الخدمة ومقدم الخدمة. يتم توضيح التفاصيل قبل تأكيد الطلب متى ما كانت الخدمة مدفوعة.','Fees may vary depending on the service type and provider. Details are shown before confirming paid services where applicable.',0),
('payments','هل الدفع الإلكتروني متوفر؟','Is online payment available?','تهدف المنصة إلى توفير خيارات دفع إلكترونية لتسهيل عمليات الدفع ومتابعة الطلبات.','The platform aims to provide online payment options to make payments and request tracking easier.',1),
('privacy','هل بياناتي محفوظة؟','Is my information protected?','تتعامل المنصة مع بيانات المستخدمين ومقدمي الخدمة بعناية، ولا تستخدم البيانات إلا لأغراض تقديم الخدمة وإدارة الطلبات.','The platform handles user and provider data carefully and uses it only for service delivery and request management.',0),
('privacy','هل يمكن حذف حسابي أو تعديل بياناتي؟','Can I delete my account or update my details?','يمكنك التواصل مع فريق الدعم لطلب تعديل البيانات أو الاستفسار عن حذف الحساب حسب السياسات المعتمدة.','You can contact support to request data updates or ask about account deletion according to applicable policies.',1)
) AS v(category_key,question_ar,question_en,answer_ar,answer_en,position)
JOIN public.faq_categories c ON c.key=v.category_key
WHERE NOT EXISTS (SELECT 1 FROM public.faq_questions q WHERE q.category_id=c.id AND q.question_en=v.question_en);
