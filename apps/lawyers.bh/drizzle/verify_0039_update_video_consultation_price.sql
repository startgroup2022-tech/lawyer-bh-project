DO $$
DECLARE
  video_count integer;
BEGIN
  SELECT count(*)
    INTO video_count
  FROM ONLY public.bahrain_consultation_methods
  WHERE country_code = 'BH'
    AND code = 'video'
    AND price = 20.000;

  IF video_count <> 1 THEN
    RAISE EXCEPTION 'Video consultation price verification failed: video=%', video_count;
  END IF;
END $$;
