INSERT INTO public.bahrain_payment_allocations (
  country_code,
  booking_request_id,
  provider_id,
  commission_rate_id,
  tap_charge_id,
  currency_code,
  gross_amount,
  platform_percentage,
  provider_percentage,
  platform_amount,
  provider_amount,
  gateway_fee_amount,
  split_mode,
  allocation_status,
  payout_status,
  captured_at,
  created_at,
  updated_at
)
SELECT
  booking.country_code,
  booking.id,
  NULL,
  NULL,
  booking.tap_charge_id,
  'BHD',
  ROUND(booking.amount_bd::numeric, 3),
  100.00,
  0.00,
  ROUND(booking.amount_bd::numeric, 3),
  0.000,
  0.000,
  'platform_only',
  'calculated',
  'not_applicable',
  COALESCE(booking.updated_at, booking.created_at, NOW()),
  NOW(),
  NOW()
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
      OR allocation.tap_charge_id = booking.tap_charge_id
  )
ON CONFLICT DO NOTHING;
