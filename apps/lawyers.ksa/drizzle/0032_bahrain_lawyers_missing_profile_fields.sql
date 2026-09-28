ALTER TABLE "bahrain_lawyers"
  ADD COLUMN IF NOT EXISTS "iban_number" text,
  ADD COLUMN IF NOT EXISTS "institution_license_file_name" text,
  ADD COLUMN IF NOT EXISTS "institution_license_file_mime_type" text,
  ADD COLUMN IF NOT EXISTS "institution_license_file_url" text,
  ADD COLUMN IF NOT EXISTS "institution_license_file_blob_path" text,
  ADD COLUMN IF NOT EXISTS "iban_certificate_file_name" text,
  ADD COLUMN IF NOT EXISTS "iban_certificate_file_mime_type" text,
  ADD COLUMN IF NOT EXISTS "iban_certificate_file_url" text,
  ADD COLUMN IF NOT EXISTS "iban_certificate_file_blob_path" text,
  ADD COLUMN IF NOT EXISTS "personal_id_file_name" text,
  ADD COLUMN IF NOT EXISTS "personal_id_file_mime_type" text,
  ADD COLUMN IF NOT EXISTS "personal_id_file_url" text,
  ADD COLUMN IF NOT EXISTS "personal_id_file_blob_path" text;
