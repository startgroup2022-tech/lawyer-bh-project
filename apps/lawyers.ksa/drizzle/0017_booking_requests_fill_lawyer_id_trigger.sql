-- 0017_booking_requests_fill_lawyer_id_trigger.sql
-- Auto-fill booking_requests.selected_lawyer_id when a lawyer request arrives with only selected_lawyer_name.

CREATE OR REPLACE FUNCTION public.fill_booking_request_selected_lawyer_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  raw_name text;
  normalized_name text;
  matched_lawyer_id uuid;
  matched_lawyer_name text;
BEGIN
  IF NEW.assignment_mode <> 'lawyer' THEN
    RETURN NEW;
  END IF;

  IF NEW.selected_lawyer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  raw_name := coalesce(trim(NEW.selected_lawyer_name), '');

  IF raw_name = '' THEN
    RETURN NEW;
  END IF;

  normalized_name := lower(raw_name);

  -- Remove common Arabic/English titles that may be displayed in the UI.
  normalized_name := regexp_replace(
    normalized_name,
    '^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?|advocate|lawyer|consultant|dr\.?)\s+',
    '',
    'i'
  );

  -- Remove anything after " - email" if the UI sends "Name - email".
  normalized_name := regexp_replace(normalized_name, '\s+-\s+.*$', '', 'g');

  -- Remove parenthesized suffixes and normalize spaces.
  normalized_name := regexp_replace(normalized_name, '\([^)]*\)', '', 'g');
  normalized_name := regexp_replace(trim(normalized_name), '\s+', ' ', 'g');

  IF normalized_name = '' THEN
    RETURN NEW;
  END IF;

  SELECT
    lm.id,
    coalesce(nullif(lm.full_name_ar, ''), nullif(lm.full_name_en, ''), nullif(lm.email, ''), lm.id::text)
  INTO matched_lawyer_id, matched_lawyer_name
  FROM public.bahrain_lawyers lm
  WHERE lm.is_active = true
    AND lm.status = 'approved'
    AND (
      lower(coalesce(lm.full_name_ar, '')) = normalized_name
      OR lower(coalesce(lm.full_name_en, '')) = normalized_name
      OR lower(coalesce(lm.email, '')) = normalized_name
      OR lower(coalesce(lm.full_name_ar, '')) ilike '%' || normalized_name || '%'
      OR lower(coalesce(lm.full_name_en, '')) ilike '%' || normalized_name || '%'
      OR normalized_name ilike '%' || lower(coalesce(lm.full_name_ar, '')) || '%'
      OR normalized_name ilike '%' || lower(coalesce(lm.full_name_en, '')) || '%'
    )
  ORDER BY
    CASE
      WHEN lower(coalesce(lm.full_name_ar, '')) = normalized_name THEN 1
      WHEN lower(coalesce(lm.full_name_en, '')) = normalized_name THEN 2
      WHEN lower(coalesce(lm.email, '')) = normalized_name THEN 3
      ELSE 4
    END,
    lm.created_at DESC
  LIMIT 1;

  IF matched_lawyer_id IS NOT NULL THEN
    NEW.selected_lawyer_id := matched_lawyer_id;
    NEW.selected_lawyer_name := coalesce(nullif(NEW.selected_lawyer_name, ''), matched_lawyer_name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_booking_request_selected_lawyer_id
ON public.booking_requests;

CREATE TRIGGER trg_fill_booking_request_selected_lawyer_id
BEFORE INSERT OR UPDATE OF assignment_mode, selected_lawyer_name, selected_lawyer_id
ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.fill_booking_request_selected_lawyer_id();

-- Backfill old lawyer bookings that were saved with only the lawyer name.
UPDATE public.booking_requests br
SET
  selected_lawyer_id = lm.id,
  updated_at = now()
FROM public.bahrain_lawyers lm
WHERE br.assignment_mode = 'lawyer'
  AND br.selected_lawyer_id IS NULL
  AND lm.is_active = true
  AND lm.status = 'approved'
  AND (
    lower(regexp_replace(regexp_replace(coalesce(br.selected_lawyer_name, ''), '^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?|advocate|lawyer|consultant|dr\.?)\s+', '', 'i'), '\s+', ' ', 'g'))
      ilike '%' || lower(coalesce(lm.full_name_ar, '')) || '%'
    OR lower(regexp_replace(regexp_replace(coalesce(br.selected_lawyer_name, ''), '^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?|advocate|lawyer|consultant|dr\.?)\s+', '', 'i'), '\s+', ' ', 'g'))
      ilike '%' || lower(coalesce(lm.full_name_en, '')) || '%'
    OR lower(coalesce(lm.full_name_ar, ''))
      ilike '%' || lower(regexp_replace(regexp_replace(coalesce(br.selected_lawyer_name, ''), '^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?|advocate|lawyer|consultant|dr\.?)\s+', '', 'i'), '\s+', ' ', 'g')) || '%'
    OR lower(coalesce(lm.full_name_en, ''))
      ilike '%' || lower(regexp_replace(regexp_replace(coalesce(br.selected_lawyer_name, ''), '^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?|advocate|lawyer|consultant|dr\.?)\s+', '', 'i'), '\s+', ' ', 'g')) || '%'
  );

-- Keep booking_reviews linked for completed/review-created requests.
UPDATE public.booking_reviews rv
SET
  lawyer_id = br.selected_lawyer_id,
  provider_name = coalesce(br.selected_lawyer_name, rv.provider_name),
  updated_at = now()
FROM public.booking_requests br
WHERE rv.booking_request_id = br.id
  AND rv.lawyer_id IS NULL
  AND br.selected_lawyer_id IS NOT NULL;
