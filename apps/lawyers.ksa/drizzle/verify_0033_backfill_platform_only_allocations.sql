DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bahrain_booking_requests AS booking
    WHERE booking.country_code = 'BH'
      AND (
        booking.payment_status = 'paid'
        OR UPPER(COALESCE(booking.tap_status, '')) = 'CAPTURED'
      )
      AND LOWER(COALESCE(booking.assignment_mode, '')) = 'office'
      AND booking.selected_lawyer_id IS NULL
      AND NULLIF(BTRIM(booking.tap_charge_id), '') IS NOT NULL
      AND booking.amount_bd::numeric > 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.bahrain_payment_allocations AS allocation
        WHERE allocation.booking_request_id = booking.id
      )
  ) THEN
    RAISE EXCEPTION 'captured office bookings are missing platform-only allocations';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bahrain_payment_allocations
    WHERE split_mode = 'platform_only'
      AND (
        provider_id IS NOT NULL
        OR commission_rate_id IS NOT NULL
        OR platform_percentage <> 100.00
        OR provider_percentage <> 0.00
        OR platform_amount <> gross_amount
        OR provider_amount <> 0.000
        OR payout_status <> 'not_applicable'
      )
  ) THEN
    RAISE EXCEPTION 'a platform-only allocation violates its financial invariants';
  END IF;
END $$;
