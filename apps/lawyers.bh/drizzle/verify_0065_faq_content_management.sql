BEGIN;
DO $$
BEGIN
  IF to_regclass('public.faq_categories') IS NULL OR to_regclass('public.faq_questions') IS NULL THEN RAISE EXCEPTION 'FAQ tables missing'; END IF;
  IF (SELECT count(*) FROM public.faq_categories WHERE key IN ('general','services','providers','payments','privacy')) <> 5 THEN RAISE EXCEPTION 'FAQ categories seed mismatch'; END IF;
  IF (SELECT count(*) FROM public.faq_questions q JOIN public.faq_categories c ON c.id=q.category_id WHERE c.key IN ('general','services','providers','payments','privacy')) <> 10 THEN RAISE EXCEPTION 'FAQ questions seed mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.faq_categories WHERE status='published' AND (btrim(name_ar)='' OR btrim(name_en)='' OR btrim(description_ar)='' OR btrim(description_en)='')) THEN RAISE EXCEPTION 'Incomplete published category'; END IF;
  IF EXISTS (SELECT 1 FROM public.faq_questions WHERE status='published' AND (btrim(question_ar)='' OR btrim(question_en)='' OR btrim(answer_ar)='' OR btrim(answer_en)='')) THEN RAISE EXCEPTION 'Incomplete published question'; END IF;
END $$;
SAVEPOINT faq_duplicate_test;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.faq_categories(key,name_ar,name_en,description_ar,description_en,icon_key,status,position) VALUES ('general','x','x','x','x','help-circle','draft',0);
    RAISE EXCEPTION 'Duplicate FAQ key accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
ROLLBACK TO SAVEPOINT faq_duplicate_test;
ROLLBACK;
