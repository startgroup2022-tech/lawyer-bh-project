CREATE TABLE IF NOT EXISTS "about_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seed_key" varchar(96) UNIQUE,
  "roman_label" varchar(24) NOT NULL,
  "heading_ar" text NOT NULL,
  "heading_en" text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "updated_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "about_sections_position_check" CHECK ("position" >= 0)
);
CREATE INDEX IF NOT EXISTS "about_sections_public_order_idx" ON "about_sections" ("archived_at", "position");

CREATE TABLE IF NOT EXISTS "about_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seed_key" varchar(128) UNIQUE,
  "section_id" uuid NOT NULL REFERENCES "about_sections"("id") ON DELETE CASCADE,
  "name_ar" text DEFAULT '' NOT NULL, "name_en" text DEFAULT '' NOT NULL,
  "title_ar" text NOT NULL, "title_en" text NOT NULL,
  "slug" varchar(160), "schema_type" varchar(16) DEFAULT 'Person' NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "photo_url" text, "photo_storage_key" text,
  "previous_experience_ar" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "previous_experience_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "experience_ar" jsonb DEFAULT '[]'::jsonb NOT NULL, "experience_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "years_of_experience_ar" text DEFAULT '' NOT NULL, "years_of_experience_en" text DEFAULT '' NOT NULL,
  "previous_employer_ar" text DEFAULT '' NOT NULL, "previous_employer_en" text DEFAULT '' NOT NULL,
  "tasks_ar" jsonb DEFAULT '[]'::jsonb NOT NULL, "tasks_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tasks_label_ar" text DEFAULT '' NOT NULL, "tasks_label_en" text DEFAULT '' NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "updated_by_admin_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "about_members_position_check" CHECK ("position" >= 0),
  CONSTRAINT "about_members_schema_type_check" CHECK ("schema_type" IN ('Person', 'Organization'))
);
CREATE INDEX IF NOT EXISTS "about_members_section_order_idx" ON "about_members" ("section_id", "archived_at", "position");
