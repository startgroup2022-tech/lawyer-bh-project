ALTER TABLE bahrain_lawyers
ADD COLUMN IF NOT EXISTS personal_id_file_name text;

ALTER TABLE bahrain_lawyers
ADD COLUMN IF NOT EXISTS personal_id_file_mime_type text;

ALTER TABLE bahrain_lawyers
ADD COLUMN IF NOT EXISTS personal_id_file_url text;

ALTER TABLE bahrain_lawyers
ADD COLUMN IF NOT EXISTS personal_id_file_blob_path text;
