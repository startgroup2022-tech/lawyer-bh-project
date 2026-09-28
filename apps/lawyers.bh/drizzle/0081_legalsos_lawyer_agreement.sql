ALTER TABLE terms_versions DROP CONSTRAINT terms_versions_document_type_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_document_type_check
CHECK (document_type IN ('general', 'lawyer_registration', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement'));
ALTER TABLE terms_versions DROP CONSTRAINT terms_versions_commission_scope_check;
ALTER TABLE terms_versions ADD CONSTRAINT terms_versions_commission_scope_check CHECK (
  (document_type IN ('general', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement') AND platform_percentage_year_one IS NULL AND platform_percentage_year_two IS NULL)
  OR (document_type = 'lawyer_registration' AND platform_percentage_year_one IS NOT NULL AND platform_percentage_year_two IS NOT NULL)
);
-- Preserve the four clauses already shown by the mobile application.
INSERT INTO terms_versions (document_type, version, status, content_ar, content_en, published_at)
SELECT 'legalsos_lawyer_agreement', 1, 'published',
'أقر بأن جميع البيانات والمستندات المقدمة صحيحة وحديثة.

ألتزم بتقديم الخدمة القانونية بمهنية ووفق القوانين والأنظمة المعمول بها.

ألتزم بالحفاظ على سرية بيانات العملاء وعدم مشاركتها مع أي طرف غير مصرح.

أفهم أن إدارة التطبيق تملك حق مراجعة الحساب أو إيقافه عند مخالفة الشروط.',
'I confirm that all submitted information and documents are accurate and up to date.

I agree to provide legal services professionally and in accordance with applicable laws and regulations.

I agree to keep client information confidential and not share it with unauthorized parties.

I understand that the app administration may review or suspend the account if terms are violated.',
NOW()
WHERE NOT EXISTS (SELECT 1 FROM terms_versions WHERE document_type = 'legalsos_lawyer_agreement');
