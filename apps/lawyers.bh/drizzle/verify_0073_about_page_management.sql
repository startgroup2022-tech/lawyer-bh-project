DO $$ BEGIN
  IF to_regclass('public.about_sections') IS NULL OR to_regclass('public.about_members') IS NULL THEN
    RAISE EXCEPTION 'About management tables are missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'about_members_section_id_about_sections_id_fk' AND confdeltype = 'c')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'about_members'::regclass AND confrelid = 'about_sections'::regclass AND confdeltype = 'c') THEN
    RAISE EXCEPTION 'About member cascade foreign key is missing';
  END IF;
END $$;
