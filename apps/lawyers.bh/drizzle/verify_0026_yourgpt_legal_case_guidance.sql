DO $$
DECLARE
  active_case_count integer;
  guidance_count integer;
  missing_guidance_count integer;
  malformed_guidance_count integer;
BEGIN
  SELECT count(*)
  INTO active_case_count
  FROM ONLY public.bahrain_legal_cases
  WHERE country_code = 'BH'
    AND is_active = true;

  SELECT count(*)
  INTO guidance_count
  FROM public.legal_case_guidance
  WHERE is_active = true;

  SELECT count(*)
  INTO missing_guidance_count
  FROM ONLY public.bahrain_legal_cases AS legal_case
  LEFT JOIN public.legal_case_guidance AS guidance
    ON guidance.legal_case_key = legal_case.key
    AND guidance.is_active = true
  WHERE legal_case.country_code = 'BH'
    AND legal_case.is_active = true
    AND guidance.legal_case_key IS NULL;

  SELECT count(*)
  INTO malformed_guidance_count
  FROM public.legal_case_guidance
  WHERE is_active = true
    AND (
      btrim(guidance_ar) = ''
      OR btrim(guidance_en) = ''
      OR jsonb_typeof(documents_ar) <> 'array'
      OR jsonb_typeof(documents_en) <> 'array'
      OR jsonb_array_length(documents_ar) = 0
      OR jsonb_array_length(documents_en) = 0
    );

  IF active_case_count = 0 THEN
    RAISE EXCEPTION 'No active Bahrain legal cases were found';
  END IF;

  IF missing_guidance_count > 0 THEN
    RAISE EXCEPTION
      '% active Bahrain legal cases do not have active guidance',
      missing_guidance_count;
  END IF;

  IF malformed_guidance_count > 0 THEN
    RAISE EXCEPTION
      '% guidance rows are empty or malformed',
      malformed_guidance_count;
  END IF;

  RAISE NOTICE
    'Verified % active Bahrain legal cases and % active guidance rows',
    active_case_count,
    guidance_count;
END
$$;

SELECT
  legal_case.key,
  legal_case.name_ar,
  guidance.guidance_ar,
  guidance.documents_ar,
  guidance.clarifying_question_ar
FROM ONLY public.bahrain_legal_cases AS legal_case
INNER JOIN public.legal_case_guidance AS guidance
  ON guidance.legal_case_key = legal_case.key
WHERE legal_case.country_code = 'BH'
  AND legal_case.is_active = true
  AND guidance.is_active = true
ORDER BY legal_case.key;
