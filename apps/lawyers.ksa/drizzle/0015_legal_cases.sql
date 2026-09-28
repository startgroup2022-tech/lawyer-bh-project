-- Migration: legal case categories + legal cases + provider case mapping
-- Suggested path:
-- apps/lawyers.bh/drizzle/000X_legal_cases.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS legal_case_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS legal_case_categories_active_idx
  ON legal_case_categories (is_active);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS legal_case_categories_sort_idx
  ON legal_case_categories (sort_order);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES legal_case_categories(id) ON DELETE CASCADE,
  key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  keywords_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords_en jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS legal_cases_category_idx
  ON legal_cases (category_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS legal_cases_active_idx
  ON legal_cases (is_active);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS legal_cases_sort_idx
  ON legal_cases (sort_order);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lawyer_legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES bahrain_lawyers(id) ON DELETE CASCADE,
  legal_case_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lawyer_id, legal_case_id)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS lawyer_legal_cases_lawyer_idx
  ON lawyer_legal_cases (lawyer_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS lawyer_legal_cases_case_idx
  ON lawyer_legal_cases (legal_case_id);
--> statement-breakpoint

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS legal_case_id uuid REFERENCES legal_cases(id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS booking_requests_legal_case_idx
  ON booking_requests (legal_case_id);
--> statement-breakpoint

INSERT INTO legal_case_categories (key, name_ar, name_en, description_ar, description_en, sort_order, is_active)
VALUES
  ('criminal', 'جنائي', 'Criminal', 'القضايا الجنائية والبلاغات والتحقيقات والجرائم الإلكترونية.', 'Criminal cases, reports, investigations, and cybercrime matters.', 10, true),
  ('civil', 'مدني', 'Civil', 'المنازعات المدنية والتعويضات والعقود والديون والمطالبات.', 'Civil disputes, compensation, contracts, debts, and claims.', 20, true),
  ('sharia', 'شرعي', 'Sharia / Family', 'قضايا الأسرة والأحوال الشخصية والميراث.', 'Family, personal status, and inheritance matters.', 30, true),
  ('commercial', 'تجاري', 'Commercial', 'القضايا التجارية والشركات والعقود التجارية والإفلاس.', 'Commercial cases, companies, commercial contracts, and bankruptcy.', 40, true),
  ('labor', 'عمالي', 'Labor', 'قضايا العمل والرواتب والفصل والتعويضات العمالية.', 'Employment, wages, dismissal, and labor compensation matters.', 50, true),
  ('administrative', 'إداري', 'Administrative', 'المنازعات الإدارية والقرارات الحكومية والتراخيص.', 'Administrative disputes, government decisions, and licensing matters.', 60, true),
  ('constitutional', 'دستوري', 'Constitutional', 'المسائل والدفوع الدستورية وتفسير النصوص الدستورية.', 'Constitutional issues, challenges, and interpretation.', 70, true),
  ('cassation', 'تمييز', 'Cassation', 'طعون التمييز أمام محكمة التمييز.', 'Cassation appeals before the Court of Cassation.', 80, true)
ON CONFLICT (key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
--> statement-breakpoint

WITH cats AS (
  SELECT key, id FROM legal_case_categories
)
INSERT INTO legal_cases (
  category_id,
  key,
  name_ar,
  name_en,
  description_ar,
  description_en,
  keywords_ar,
  keywords_en,
  sort_order,
  is_active
)
VALUES
  ((SELECT id FROM cats WHERE key = 'criminal'), 'criminal_arrest_bail', 'قبض وتوقيف وكفالة', 'Arrest, Detention & Bail', 'طلبات ومرافعات القبض والتوقيف والكفالة.', 'Arrest, detention, and bail requests and representation.', '["قبض", "توقيف", "كفالة", "تحقيق"]'::jsonb, '["arrest", "detention", "bail", "investigation"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'criminal'), 'criminal_investigation', 'تحقيق جنائي', 'Criminal Investigation', 'الحضور أمام جهات التحقيق ومتابعة البلاغات.', 'Representation before investigation authorities and report follow-up.', '["تحقيق", "نيابة", "بلاغ", "شرطة"]'::jsonb, '["investigation", "prosecution", "police report"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'criminal'), 'criminal_cybercrime', 'جرائم إلكترونية', 'Cybercrime', 'الابتزاز الإلكتروني والسب والقذف عبر الإنترنت والاختراق.', 'Online extortion, cyber defamation, hacking, and related offenses.', '["جرائم إلكترونية", "ابتزاز", "اختراق", "سب"]'::jsonb, '["cybercrime", "extortion", "hacking", "online defamation"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'criminal'), 'criminal_fraud', 'احتيال ونصب', 'Fraud & Deception', 'قضايا الاحتيال والنصب وإساءة الائتمان.', 'Fraud, deception, and breach of trust cases.', '["احتيال", "نصب", "إساءة ائتمان"]'::jsonb, '["fraud", "deception", "breach of trust"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'criminal'), 'criminal_cheque', 'شيكات بدون رصيد', 'Dishonored Cheques', 'قضايا الشيكات والبلاغات المرتبطة بها.', 'Cheque disputes and related criminal reports.', '["شيك", "شيكات", "بدون رصيد"]'::jsonb, '["cheque", "dishonored cheque", "bounced cheque"]'::jsonb, 50, true),
  ((SELECT id FROM cats WHERE key = 'criminal'), 'criminal_assault', 'اعتداء وتهديد', 'Assault & Threats', 'قضايا الاعتداء والتهديد والمشاجرات.', 'Assault, threats, and altercation cases.', '["اعتداء", "تهديد", "مشاجرة"]'::jsonb, '["assault", "threat", "fight"]'::jsonb, 60, true),
  ((SELECT id FROM cats WHERE key = 'civil'), 'civil_compensation', 'تعويضات', 'Compensation Claims', 'مطالبات التعويض عن الضرر والمسؤولية المدنية.', 'Claims for damages and civil liability.', '["تعويض", "ضرر", "مسؤولية"]'::jsonb, '["compensation", "damages", "liability"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'civil'), 'civil_contracts', 'منازعات عقود', 'Contract Disputes', 'المنازعات الناشئة عن العقود والالتزامات.', 'Disputes arising from contracts and obligations.', '["عقد", "عقود", "التزام"]'::jsonb, '["contract", "agreement", "obligation"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'civil'), 'civil_debt_collection', 'مطالبات مالية وديون', 'Debt & Monetary Claims', 'المطالبات المالية واسترداد الديون.', 'Debt recovery and monetary claims.', '["دين", "ديون", "مطالبة مالية"]'::jsonb, '["debt", "collection", "monetary claim"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'civil'), 'civil_property', 'منازعات عقارية', 'Property Disputes', 'النزاعات العقارية والملكية والحيازة.', 'Real estate, ownership, and possession disputes.', '["عقار", "ملكية", "حيازة"]'::jsonb, '["property", "real estate", "ownership"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'civil'), 'civil_rent', 'قضايا إيجار', 'Rental Disputes', 'منازعات الإيجار والإخلاء والأجرة.', 'Rent, eviction, and lease disputes.', '["إيجار", "إخلاء", "أجرة"]'::jsonb, '["rent", "eviction", "lease"]'::jsonb, 50, true),
  ((SELECT id FROM cats WHERE key = 'civil'), 'civil_execution', 'تنفيذ أحكام', 'Judgment Enforcement', 'إجراءات تنفيذ الأحكام والسندات التنفيذية.', 'Enforcement of judgments and enforceable instruments.', '["تنفيذ", "حكم", "سند تنفيذي"]'::jsonb, '["enforcement", "judgment", "execution"]'::jsonb, 60, true),
  ((SELECT id FROM cats WHERE key = 'sharia'), 'sharia_divorce', 'طلاق', 'Divorce', 'قضايا الطلاق وما يترتب عليها.', 'Divorce and related consequences.', '["طلاق", "انفصال"]'::jsonb, '["divorce", "separation"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'sharia'), 'sharia_marriage_dissolution', 'فسخ الزواج', 'Marriage Dissolution', 'دعاوى فسخ عقد الزواج.', 'Marriage dissolution claims.', '["فسخ الزواج", "فسخ عقد"]'::jsonb, '["marriage dissolution", "annulment"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'sharia'), 'sharia_khula', 'خلع', 'Khula', 'دعاوى الخلع والافتداء.', 'Khula and related family claims.', '["خلع", "افتداء"]'::jsonb, '["khula"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'sharia'), 'sharia_custody', 'حضانة', 'Custody', 'الحضانة والرؤية والزيارة.', 'Custody, visitation, and access rights.', '["حضانة", "رؤية", "زيارة"]'::jsonb, '["custody", "visitation", "access"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'sharia'), 'sharia_alimony', 'نفقة', 'Alimony & Maintenance', 'النفقة الزوجية ونفقة الأبناء.', 'Spousal and child maintenance.', '["نفقة", "مصروف", "أبناء"]'::jsonb, '["alimony", "maintenance", "child support"]'::jsonb, 50, true),
  ((SELECT id FROM cats WHERE key = 'sharia'), 'sharia_inheritance', 'ميراث وتركات', 'Inheritance & Estates', 'الميراث وحصر الورثة وتقسيم التركات.', 'Inheritance, heirs, and estate distribution.', '["ميراث", "تركة", "حصر ورثة"]'::jsonb, '["inheritance", "estate", "heirs"]'::jsonb, 60, true),
  ((SELECT id FROM cats WHERE key = 'commercial'), 'commercial_company_formation', 'تأسيس شركات', 'Company Formation', 'تأسيس الشركات وترتيب مستنداتها.', 'Company formation and corporate documentation.', '["تأسيس شركة", "سجل تجاري", "شركة"]'::jsonb, '["company formation", "commercial registration", "company"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'commercial'), 'commercial_partner_disputes', 'نزاعات شركاء', 'Partner Disputes', 'نزاعات الشركاء والإدارة والحصص.', 'Partner, management, and shareholding disputes.', '["شركاء", "حصص", "إدارة"]'::jsonb, '["partner dispute", "shares", "management"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'commercial'), 'commercial_contracts', 'عقود تجارية', 'Commercial Contracts', 'صياغة ومنازعات العقود التجارية.', 'Commercial contract drafting and disputes.', '["عقد تجاري", "اتفاقية تجارية"]'::jsonb, '["commercial contract", "business agreement"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'commercial'), 'commercial_bankruptcy', 'إفلاس وإعادة هيكلة', 'Bankruptcy & Restructuring', 'قضايا الإفلاس وإعادة الهيكلة والتصفية.', 'Bankruptcy, restructuring, and liquidation matters.', '["إفلاس", "تصفية", "إعادة هيكلة"]'::jsonb, '["bankruptcy", "liquidation", "restructuring"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'commercial'), 'commercial_agencies', 'وكالات تجارية', 'Commercial Agencies', 'منازعات وتنظيم الوكالات التجارية.', 'Commercial agency disputes and arrangements.', '["وكالة تجارية", "وكالات"]'::jsonb, '["commercial agency", "agency"]'::jsonb, 50, true),
  ((SELECT id FROM cats WHERE key = 'commercial'), 'commercial_ecommerce', 'تجارة إلكترونية', 'E-commerce', 'منازعات التجارة الإلكترونية والمنصات.', 'E-commerce and platform disputes.', '["تجارة إلكترونية", "منصة", "متجر"]'::jsonb, '["e-commerce", "platform", "online store"]'::jsonb, 60, true),
  ((SELECT id FROM cats WHERE key = 'labor'), 'labor_unpaid_wages', 'أجور ومستحقات عمالية', 'Unpaid Wages & Entitlements', 'المطالبات بالأجور والمستحقات.', 'Claims for wages and employment entitlements.', '["أجور", "رواتب", "مستحقات"]'::jsonb, '["wages", "salary", "entitlements"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'labor'), 'labor_unfair_dismissal', 'فصل تعسفي', 'Unfair Dismissal', 'الفصل التعسفي والتعويض عنه.', 'Unfair dismissal and compensation.', '["فصل تعسفي", "إنهاء خدمة"]'::jsonb, '["unfair dismissal", "termination"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'labor'), 'labor_end_of_service', 'مكافأة نهاية الخدمة', 'End of Service Benefits', 'حساب ومطالبة مكافأة نهاية الخدمة.', 'End of service benefit claims and calculations.', '["نهاية الخدمة", "مكافأة"]'::jsonb, '["end of service", "benefits"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'labor'), 'labor_work_injury', 'إصابة عمل', 'Work Injury', 'إصابات العمل والتعويض عنها.', 'Work injury claims and compensation.', '["إصابة عمل", "تعويض عمالي"]'::jsonb, '["work injury", "labor compensation"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'labor'), 'labor_contracts', 'عقود عمل', 'Employment Contracts', 'مراجعة ومنازعات عقود العمل.', 'Employment contract review and disputes.', '["عقد عمل", "عامل", "موظف"]'::jsonb, '["employment contract", "employee", "worker"]'::jsonb, 50, true),
  ((SELECT id FROM cats WHERE key = 'administrative'), 'administrative_decision_challenge', 'طعن على قرار إداري', 'Challenge Administrative Decision', 'الطعون على القرارات الإدارية.', 'Challenges against administrative decisions.', '["قرار إداري", "طعن إداري"]'::jsonb, '["administrative decision", "challenge"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'administrative'), 'administrative_license_permit', 'تراخيص وتصاريح', 'Licenses & Permits', 'منازعات وإجراءات التراخيص والتصاريح.', 'Licensing and permit disputes and procedures.', '["ترخيص", "تصريح", "رخصة"]'::jsonb, '["license", "permit"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'administrative'), 'administrative_tenders', 'مناقصات ومزايدات', 'Tenders & Procurement', 'منازعات المناقصات والمزايدات والمشتريات.', 'Tender, bid, and procurement disputes.', '["مناقصة", "مزايدة", "مشتريات"]'::jsonb, '["tender", "bid", "procurement"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'administrative'), 'administrative_disciplinary', 'جزاءات وتأديب', 'Disciplinary Matters', 'الجزاءات الإدارية والتأديبية.', 'Administrative and disciplinary penalties.', '["جزاء", "تأديب", "مخالفة"]'::jsonb, '["disciplinary", "penalty", "violation"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'constitutional'), 'constitutional_challenge', 'دفع بعدم الدستورية', 'Constitutional Challenge', 'إثارة الدفع بعدم دستورية نص قانوني.', 'Raising constitutional challenges against legal provisions.', '["دستورية", "عدم دستورية", "دفع"]'::jsonb, '["constitutional", "challenge", "unconstitutional"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'constitutional'), 'constitutional_interpretation', 'تفسير دستوري', 'Constitutional Interpretation', 'المسائل المتعلقة بتفسير النصوص الدستورية.', 'Issues related to interpretation of constitutional provisions.', '["تفسير دستوري", "نص دستوري"]'::jsonb, '["constitutional interpretation", "constitutional provision"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'constitutional'), 'constitutional_rights', 'حقوق وحريات دستورية', 'Constitutional Rights & Freedoms', 'المسائل المتعلقة بالحقوق والحريات الدستورية.', 'Matters related to constitutional rights and freedoms.', '["حقوق", "حريات", "دستور"]'::jsonb, '["rights", "freedoms", "constitution"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'cassation'), 'cassation_civil', 'تمييز مدني', 'Civil Cassation Appeal', 'طعون التمييز في القضايا المدنية.', 'Cassation appeals in civil cases.', '["تمييز مدني", "طعن"]'::jsonb, '["civil cassation", "appeal"]'::jsonb, 10, true),
  ((SELECT id FROM cats WHERE key = 'cassation'), 'cassation_criminal', 'تمييز جنائي', 'Criminal Cassation Appeal', 'طعون التمييز في القضايا الجنائية.', 'Cassation appeals in criminal cases.', '["تمييز جنائي", "طعن جنائي"]'::jsonb, '["criminal cassation", "criminal appeal"]'::jsonb, 20, true),
  ((SELECT id FROM cats WHERE key = 'cassation'), 'cassation_sharia', 'تمييز شرعي', 'Sharia Cassation Appeal', 'طعون التمييز في القضايا الشرعية.', 'Cassation appeals in sharia and family cases.', '["تمييز شرعي", "طعن شرعي"]'::jsonb, '["sharia cassation", "family appeal"]'::jsonb, 30, true),
  ((SELECT id FROM cats WHERE key = 'cassation'), 'cassation_commercial', 'تمييز تجاري', 'Commercial Cassation Appeal', 'طعون التمييز في القضايا التجارية.', 'Cassation appeals in commercial cases.', '["تمييز تجاري", "طعن تجاري"]'::jsonb, '["commercial cassation", "commercial appeal"]'::jsonb, 40, true),
  ((SELECT id FROM cats WHERE key = 'cassation'), 'cassation_labor', 'تمييز عمالي', 'Labor Cassation Appeal', 'طعون التمييز في القضايا العمالية.', 'Cassation appeals in labor cases.', '["تمييز عمالي", "طعن عمالي"]'::jsonb, '["labor cassation", "labor appeal"]'::jsonb, 50, true),
  ((SELECT id FROM cats WHERE key = 'cassation'), 'cassation_administrative', 'تمييز إداري', 'Administrative Cassation Appeal', 'طعون التمييز في القضايا الإدارية.', 'Cassation appeals in administrative cases.', '["تمييز إداري", "طعن إداري"]'::jsonb, '["administrative cassation", "administrative appeal"]'::jsonb, 60, true)
ON CONFLICT (key) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  keywords_ar = EXCLUDED.keywords_ar,
  keywords_en = EXCLUDED.keywords_en,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
