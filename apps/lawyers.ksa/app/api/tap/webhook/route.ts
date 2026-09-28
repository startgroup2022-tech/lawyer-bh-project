import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import {
  processBooking,
  type ConsultMethod,
  type VideoProvider,
} from "@/lib/bookingConfirmation";
import type { EmailLang } from "@/lib/emailTemplates";

import { db, schema, sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";

import { recordPaymentAllocation } from "@/lib/payments/commission";
import { getBookingAllocationMode } from "@/lib/payments/allocation-policy";
import { verifyWebhookSignature } from "@/lib/tap";
import { tapChargeMatchesBooking } from "@/lib/tap/mobile-payment-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * يمنع معالجة نفس Webhook مرتين داخل نفس Serverless instance.
 *
 * الحماية الأساسية الدائمة موجودة كذلك في:
 * - booking_requests.payment_status
 * - payment_allocations.tap_charge_id UNIQUE
 */
const processed = new Set<string>();

type TapCharge = {
  id?: string;
  status?: string;

  amount?: number | string;
  currency?: string;

  reference?: {
    order?: string;
  };

  metadata?: Record<string, unknown>;

  [key: string]: unknown;
};

type BookingPaymentRow = {
  id: string;
  country_code: string;

  lang: string;

  service: string;
  consultation_type: string;
  consultation_method: string;
  consultation_price: string;

  amount_bd: string;
  duration_minutes: number;
  video_provider: string | null;

  appointment_date: string;
  appointment_time: string;

  assignment_mode: string;

  selected_lawyer_id: string | null;
  selected_lawyer_name: string | null;

  assigned_to_email: string;

  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_message: string | null;

  payment_status: string;
  tap_charge_id: string | null;
};

function cleanText(
  value: unknown,
  maxLength = 200,
): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value,
  );
}

function getConsultMethod(
  value: unknown,
): ConsultMethod {
  const method = cleanText(value, 30);

  if (
    method === "online" ||
    method === "phone" ||
    method === "office" ||
    method === "video"
  ) {
    return method;
  }

  return "online";
}

function getVideoProvider(
  value: unknown,
): VideoProvider {
  const provider = cleanText(value, 30);

  if (
    provider === "google-meet" ||
    provider === "whatsapp"
  ) {
    return provider;
  }

  return null;
}

function getEmailLang(value: unknown): EmailLang {
  return cleanText(value, 10) === "ar"
    ? "ar"
    : "en";
}

function getDurationMinutes(value: unknown): number {
  const duration = Number(value);

  if ([15, 30, 45].includes(duration)) {
    return duration;
  }

  return 30;
}

function getPositiveAmount(
  value: unknown,
): number | null {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(
    (amount + Number.EPSILON) * 1000,
  ) / 1000;
}

async function findBooking(input: {
  bookingRequestsTable: string;
  countryCode: string;
  bookingId: string;
  chargeId: string;
}): Promise<BookingPaymentRow | null> {
  /*
   * الطريقة الأساسية: البحث بواسطة bookingId المخزن
   * داخل Tap metadata.
   */
  if (
    input.bookingId &&
    isUuid(input.bookingId)
  ) {
    const rows =
      await sqlClient<BookingPaymentRow[]>`
        SELECT
          id,
          country_code,
          lang,
          service,
          consultation_type,
          consultation_method,
          consultation_price,
          amount_bd,
          duration_minutes,
          video_provider,
          appointment_date,
          appointment_time,
          assignment_mode,
          selected_lawyer_id,
          selected_lawyer_name,
          assigned_to_email,
          customer_name,
          customer_phone,
          customer_email,
          customer_message,
          payment_status,
          tap_charge_id
        FROM ${sqlClient(input.bookingRequestsTable)}
        WHERE id = ${input.bookingId}::uuid
          AND country_code = ${input.countryCode}
        LIMIT 1
      `;

    if (rows[0]) {
      return rows[0];
    }
  }

  /*
   * Fallback: البحث بواسطة Tap charge id.
   */
  const rows =
    await sqlClient<BookingPaymentRow[]>`
      SELECT
        id,
        country_code,
        lang,
        service,
        consultation_type,
        consultation_method,
        consultation_price,
        amount_bd,
        duration_minutes,
        video_provider,
        appointment_date,
        appointment_time,
        assignment_mode,
        selected_lawyer_id,
        selected_lawyer_name,
        assigned_to_email,
        customer_name,
        customer_phone,
        customer_email,
        customer_message,
        payment_status,
        tap_charge_id
      FROM ${sqlClient(input.bookingRequestsTable)}
      WHERE tap_charge_id = ${input.chargeId}
        AND country_code = ${input.countryCode}
      ORDER BY created_at DESC
      LIMIT 1
    `;

  return rows[0] ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signature =
    request.headers.get("hashstring") ||
    request.headers.get("Hashstring");

  const signatureOk =
    await verifyWebhookSignature(
      rawBody,
      signature,
    );

  if (!signatureOk) {
    console.warn(
      "[tap/webhook] invalid signature",
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid signature",
      },
      {
        status: 401,
      },
    );
  }

  let charge: TapCharge;

  try {
    charge = JSON.parse(rawBody) as TapCharge;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON",
      },
      {
        status: 400,
      },
    );
  }

  const chargeId = cleanText(charge.id, 120);

  if (!chargeId) {
    return NextResponse.json({
      ok: true,
      noop: "no charge id",
    });
  }

  const chargeStatus = cleanText(
    charge.status,
    40,
  ).toUpperCase();

  await sqlClient`
    UPDATE discount_redemptions
    SET status = CASE
          WHEN ${chargeStatus} = 'CAPTURED' THEN 'redeemed'::discount_redemption_status
          WHEN ${chargeStatus} IN ('FAILED', 'DECLINED', 'CANCELLED', 'ABANDONED') THEN 'released'::discount_redemption_status
          ELSE status
        END,
        redeemed_at = ${chargeStatus === "CAPTURED" ? new Date() : null},
        updated_at = NOW()
    WHERE tap_charge_id = ${chargeId}
      AND status = 'reserved'
  `;

  if (chargeStatus !== "CAPTURED") {
    return NextResponse.json({
      ok: true,
      noop: `status ${chargeStatus || "unknown"}`,
    });
  }

  /*
   * منع التكرار داخل نفس Serverless instance.
   */
  if (processed.has(chargeId)) {
    return NextResponse.json({
      ok: true,
      dedup: true,
      chargeId,
    });
  }

  processed.add(chargeId);

  const metadata = charge.metadata ?? {};

  try {
    /*
     * ============================
     * SOS payment
     * ============================
     */
    const contextSource = cleanText(
      metadata.contextSource,
      40,
  );

    const caseRef = cleanText(
      metadata.caseRef,
      120,
    );

    if (
      contextSource === "sos" &&
      caseRef
    ) {
      await db
        .update(schema.emergencyRequests)
        .set({
          paymentStatus: "success",
          paymentRef: chargeId,
          updatedAt: new Date(),
        })
        .where(
          eq(
            schema.emergencyRequests.caseRef,
            caseRef,
          ),
        );

      return NextResponse.json({
        ok: true,
        kind: "sos",
        caseRef,
        chargeId,
      });
    }

    /*
     * ============================
     * Regular booking payment
     * ============================
     */
    const paymentFlow = cleanText(
      metadata.paymentFlow,
      60,
    );

    /*
     * نسمح بالطلبات القديمة التي لا تحتوي على paymentFlow،
     * ولكن إذا كانت القيمة موجودة ومختلفة، فلا نعالجها كحجز.
     */
    const isMobileEmergency =
      paymentFlow === "mobile_emergency";

    if (
      paymentFlow &&
      paymentFlow !== "book_appointment" &&
      !isMobileEmergency
    ) {
      return NextResponse.json({
        ok: true,
        noop: `unsupported payment flow ${paymentFlow}`,
      });
    }

    const countryCode =
      cleanText(
        metadata.countryCode,
        2,
      ).toUpperCase() || "SA";

    if (countryCode !== "SA") {
      return NextResponse.json({
        ok: true,
        noop: `unsupported country ${countryCode}`,
      });
    }

    const country =
      await getActiveCountry(countryCode);

    if (!country) {
      throw new Error(
        `Country ${countryCode} is inactive or its tables are not ready`,
      );
    }

    const tables =
      buildCountryTableSet(country);

    const bookingId = cleanText(
      metadata.bookingId,
      80,
    );

    const booking = await findBooking({
      bookingRequestsTable:
        tables.booking_requests,

      countryCode: country.code,
      bookingId,
      chargeId,
    });

    if (!booking) {
      console.error(
        "[tap/webhook] booking not found",
        {
          chargeId,
          bookingId,
          countryCode: country.code,
        },
      );

      processed.delete(chargeId);

      return NextResponse.json(
        {
          ok: false,
          error: "Booking not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * منع ربط Charge مختلف بالحجز نفسه.
     */
    if (
      booking.tap_charge_id &&
      booking.tap_charge_id !== chargeId
    ) {
      console.error(
        "[tap/webhook] charge id mismatch",
        {
          bookingId: booking.id,
          storedChargeId:
            booking.tap_charge_id,
          receivedChargeId: chargeId,
        },
      );

      processed.delete(chargeId);

      return NextResponse.json(
        {
          ok: false,
          error: "Charge id mismatch",
        },
        {
          status: 409,
        },
      );
    }

    const bookingAmount =
      getPositiveAmount(booking.amount_bd);

    const capturedAmount =
      getPositiveAmount(charge.amount);

    /*
     * نستخدم المبلغ الذي تم تحصيله فعليًا من Tap.
     * وإذا لم يكن موجودًا نستخدم مبلغ الحجز.
     */
    const grossAmount =
      capturedAmount ?? bookingAmount;

    if (!grossAmount) {
      throw new Error(
        "Captured payment amount is invalid",
      );
    }

    if (
      isMobileEmergency &&
      !tapChargeMatchesBooking(
        {
          id: chargeId,
          status: chargeStatus,
          amount: capturedAmount ?? 0,
          currency: cleanText(charge.currency, 10),
          reference: {
            order: cleanText(charge.reference?.order, 120),
          },
        },
        {
          chargeId: booking.tap_charge_id,
          orderReference: `LSOS-${booking.id.slice(0, 8).toUpperCase()}`,
          amount: bookingAmount ?? 0,
          currency: country.currencyCode,
        },
      )
    ) {
      processed.delete(chargeId);

      return NextResponse.json(
        {
          ok: false,
          error: "Tap charge does not match the mobile booking",
        },
        { status: 409 },
      );
    }

    if (
      capturedAmount &&
      bookingAmount &&
      Math.abs(
        capturedAmount - bookingAmount,
      ) > 0.001
    ) {
      console.warn(
        "[tap/webhook] captured amount differs from booking amount",
        {
          bookingId: booking.id,
          bookingAmount,
          capturedAmount,
        },
      );
    }

    /*
     * تحديث الحجز بشكل ذري.
     *
     * لا يرجع صفًا إذا كانت العملية قد سُجلت سابقًا،
     * وهذا يمنع تكرار رسالة التأكيد.
     */
    const paymentTransitionRows =
      await sqlClient<{ id: string }[]>`
        UPDATE ${sqlClient(tables.booking_requests)}
        SET
          payment_status = ${"paid"},
          tap_status = ${chargeStatus},
          tap_charge_id = ${chargeId},
          tap_payload = ${rawBody}::jsonb,
          updated_at = NOW()
        WHERE id = ${booking.id}::uuid
          AND payment_status <> ${"paid"}
        RETURNING id
      `;

    const paymentBecamePaid =
      Boolean(paymentTransitionRows[0]);

    /*
     * إذا كانت العملية مسجلة سابقًا، نحدّث بيانات Tap
     * فقط دون تغيير منطق الإشعارات.
     */
    if (!paymentBecamePaid) {
      await sqlClient`
        UPDATE ${sqlClient(tables.booking_requests)}
        SET
          tap_status = ${chargeStatus},
          tap_charge_id = ${chargeId},
          tap_payload = ${rawBody}::jsonb,
          updated_at = NOW()
        WHERE id = ${booking.id}::uuid
      `;
    }

    if (isMobileEmergency) {
      return NextResponse.json({
        ok: true,
        kind: "mobile_emergency",
        bookingId: booking.id,
        chargeId,
        dedup: !paymentBecamePaid,
      });
    }

    /*
     * ============================
     * Payment allocation
     * ============================
     */
    let allocation:
      | Awaited<
          ReturnType<
            typeof recordPaymentAllocation
          >
        >
      | null = null;

    let allocationSkippedReason:
      | string
      | null = null;

    const allocationMode = getBookingAllocationMode({
      assignmentMode: booking.assignment_mode,
      providerId: booking.selected_lawyer_id,
    });

    if (allocationMode === "provider") {
      allocation =
        await recordPaymentAllocation({
          mode: "provider",
          countryCode: country.code,

          bookingRequestId: booking.id,
          providerId: booking.selected_lawyer_id!,

          tapChargeId: chargeId,
          currencyCode:
            cleanText(
              charge.currency,
              3,
            ).toUpperCase() ||
            country.currencyCode,

          grossAmount,

          /*
           * رسوم Tap غير متوفرة بشكل مؤكد في هذا
           * الـWebhook حاليًا، لذلك تحفظ مؤقتًا بصفر.
           */
          gatewayFeeAmount: 0,

          commissionRatesTable:
            tables.provider_commission_rates,

          paymentAllocationsTable:
            tables.payment_allocations,

          capturedAt: new Date(),
        });

      console.info(
        "[tap/webhook] payment allocation recorded",
        {
          bookingId: booking.id,
          chargeId,
          allocation,
        },
      );
    } else if (allocationMode === "platform_only") {
      allocation = await recordPaymentAllocation({
        mode: "platform_only",
        countryCode: country.code,
        bookingRequestId: booking.id,
        tapChargeId: chargeId,
        currencyCode:
          cleanText(charge.currency, 3).toUpperCase() ||
          country.currencyCode,
        grossAmount,
        gatewayFeeAmount: 0,
        paymentAllocationsTable: tables.payment_allocations,
        capturedAt: new Date(),
      });

      console.info("[tap/webhook] platform-only allocation recorded", {
        bookingId: booking.id,
        chargeId,
        allocation,
      });
    } else {
      /*
       * الحجز مصنف كحجز محامٍ لكنه لا يحمل محاميًا صالحًا.
       * نؤجل التوزيع بدل ربط المبلغ بمزود غير محدد.
       */
      allocationSkippedReason =
        "Lawyer booking has no selected lawyer";

      console.info(
        "[tap/webhook] payment allocation postponed",
        {
          bookingId: booking.id,
          chargeId,
          assignmentMode:
            booking.assignment_mode,
          reason:
            allocationSkippedReason,
        },
      );
    }

    /*
     * ============================
     * Booking confirmation
     * ============================
     *
     * نرسل التأكيد عندما:
     * 1. تحولت العملية إلى paid لأول مرة.
     * 2. أو تم تسجيل Allocation جديد في إعادة محاولة
     *    بعد فشل جزئي سابق.
     */
    const shouldProcessConfirmation =
      paymentBecamePaid ||
      allocation?.isNew === true;

    if (shouldProcessConfirmation) {
      try {
        await processBooking({
          lang: getEmailLang(
            booking.lang,
          ),

          service:
            booking.service,

          consultationType:
            booking.consultation_type,

          consultationPrice:
            booking.consultation_price,

          consultationMethod:
            getConsultMethod(
              booking.consultation_method,
            ),

          durationMinutes:
            getDurationMinutes(
              booking.duration_minutes,
            ),

          videoProvider:
            getVideoProvider(
              booking.video_provider,
            ),

          date:
            booking.appointment_date,

          time:
            booking.appointment_time,

          name:
            booking.customer_name,

          phone:
            booking.customer_phone,

          email:
            booking.customer_email,

          message:
            booking.customer_message ?? "",

          /*
           * استخدام UUID الحقيقي للحجز بدل إنشاء رقم
           * جديد من Charge ID.
           */
          bookingId:
            booking.id,

          adminEmail:
            booking.assigned_to_email,
        });
      } catch (error) {
        /*
         * لا نفشل تسجيل الدفع أو العمولة بسبب خطأ
         * في الإشعار، لأن الدفع تم تحصيله بالفعل.
         */
        console.error(
          "[tap/webhook] booking confirmation failed",
          {
            bookingId: booking.id,
            chargeId,
            error,
          },
        );
      }
    }

    return NextResponse.json({
      ok: true,

      kind: "booking",

      bookingId:
        booking.id,

      chargeId,

      payment: {
        status: "paid",
        tapStatus:
          chargeStatus,

        becamePaid:
          paymentBecamePaid,

        currency:
          cleanText(
            charge.currency,
            3,
          ).toUpperCase() ||
          country.currencyCode,

        grossAmount,
      },

      allocation: allocation
        ? {
            recorded: true,
            isNew:
              allocation.isNew,

            allocationId:
              allocation.allocationId,

            commissionRateId:
              allocation.commissionRateId,

            platformPercentage:
              allocation.platformPercentage,

            providerPercentage:
              allocation.providerPercentage,

            platformAmount:
              allocation.platformAmount,

            providerAmount:
              allocation.providerAmount,

            gatewayFeeAmount:
              allocation.gatewayFeeAmount,
          }
        : {
            recorded: false,
            reason:
              allocationSkippedReason,
          },
    });
  } catch (error) {
    console.error(
      "[tap/webhook] processing failed",
      {
        chargeId,
        error,
      },
    );

    /*
     * السماح لـ Tap بإعادة المحاولة.
     */
    processed.delete(chargeId);

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook processing failed",
      },
      {
        status: 500,
      },
    );
  }
}
