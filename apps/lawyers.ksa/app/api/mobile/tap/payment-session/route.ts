import { createHmac, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import { getActiveCountry } from "@/lib/db/country-tables";
import { listEmergencyCaseTypes } from "@/lib/sos/emergencyCaseCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  mobile_payment_idempotency_key: string;
  mobile_payment_case_id: string | null;
  amount_bd: string | number;
  payment_status: string;
  tap_status: string | null;
};

type CustomerInput = {
  name: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
};

type PaymentSessionRequest = {
  countryCode: string;
  caseId: string;
  locale: "ar" | "en";
  idempotencyKey: string;
  customer: CustomerInput;
};

type TapConfiguration = {
  publicKey: string;
  merchantId: string;
  secretKey: string;
  mode: "test" | "live";
  postUrl: string;
};

type UnknownRecord = Record<string, unknown>;

function requiredEnvironment(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  source: UnknownRecord,
  ...names: string[]
): string {
  for (const name of names) {
    const value = source[name];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeLocale(value: string): "ar" | "en" {
  return value.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function normalizeCountryCode(value: string): string {
  return value.replace(/[^a-z]/gi, "").toUpperCase() || "SA";
}

function normalizePhoneCountryCode(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseRequestBody(
  body: unknown,
):
  | { ok: true; data: PaymentSessionRequest }
  | { ok: false; error: string } {
  if (!isRecord(body)) {
    return {
      ok: false,
      error: "Request body must be a JSON object",
    };
  }

  const customerValue = body.customer;

  if (!isRecord(customerValue)) {
    return {
      ok: false,
      error: "customer is required",
    };
  }

  const countryCode = normalizeCountryCode(
    readString(body, "countryCode", "country_code") || "SA",
  );

  if (countryCode !== "SA") {
    return {
      ok: false,
      error: "Only Saudi Arabia is supported",
    };
  }

  const caseId = readString(
    body,
    "caseId",
    "case_id",
    "emergencyCaseId",
    "emergency_case_id",
  );

  const locale = normalizeLocale(
    readString(body, "locale", "lang", "language") || "en",
  );

  const suppliedIdempotencyKey = readString(
    body,
    "idempotencyKey",
    "idempotency_key",
  );

  const idempotencyKey =
    suppliedIdempotencyKey || randomUUID();

  const customer: CustomerInput = {
    name: readString(
      customerValue,
      "name",
      "fullName",
      "full_name",
    ),

    email: readString(
      customerValue,
      "email",
    ),

    phoneCountryCode: normalizePhoneCountryCode(
      readString(
        customerValue,
        "phoneCountryCode",
        "phone_country_code",
        "countryCode",
      ),
    ),

    phone: normalizePhone(
      readString(
        customerValue,
        "phone",
        "phoneNumber",
        "phone_number",
      ),
    ),
  };

  if (!caseId) {
    return {
      ok: false,
      error: "caseId is required",
    };
  }

  if (!isValidUuid(idempotencyKey)) {
    return {
      ok: false,
      error: "idempotencyKey must be a valid UUID",
    };
  }

  if (!customer.name) {
    return {
      ok: false,
      error: "customer.name is required",
    };
  }

  if (!customer.email || !isValidEmail(customer.email)) {
    return {
      ok: false,
      error: "A valid customer.email is required",
    };
  }

  if (!customer.phoneCountryCode) {
    return {
      ok: false,
      error: "customer.phoneCountryCode is required",
    };
  }

  if (!customer.phone) {
    return {
      ok: false,
      error: "customer.phone is required",
    };
  }

  return {
    ok: true,
    data: {
      countryCode,
      caseId,
      locale,
      idempotencyKey,
      customer,
    },
  };
}

/**
 * يولد hash المستخدم بواسطة Tap Checkout SDK.
 *
 * يجب أن تكون قيمة amount في الـ SDK مطابقة تمامًا لهذه الصيغة:
 * منزلتان عشريتان، مثل 150.00.
 */
function generateTapHashString(input: {
  publicKey: string;
  secretKey: string;
  amount: number;
  currency: string;
  transactionReference: string;
  postUrl: string;
}): string {
  const formattedAmount = input.amount.toFixed(2);

  const valueToHash =
    `x_publickey${input.publicKey}` +
    `x_amount${formattedAmount}` +
    `x_currency${input.currency}` +
    `x_transaction${input.transactionReference}` +
    `x_post${input.postUrl}`;

  return createHmac("sha256", input.secretKey)
    .update(valueToHash, "utf8")
    .digest("hex");
}

/**
 * يستخدم فقط متغيرات Tap الخاصة بتطبيق الموبايل.
 *
 * لا نستخدم fallback إلى مفاتيح Tap الخاصة بالموقع،
 * حتى لا تختلط مجموعتان مختلفتان من المفاتيح.
 */
function getTapConfiguration(): TapConfiguration {
  const secretKey = requiredEnvironment(
    "TAP_MOBILE_TEST_SECRET_KEY",
  );

  const publicKey = requiredEnvironment(
    "TAP_MOBILE_TEST_PUBLIC_KEY",
  );

  const merchantId = requiredEnvironment(
    "TAP_MOBILE_TEST_MERCHANT_ID",
  );

  const configuredPostUrl = requiredEnvironment(
    "TAP_MOBILE_POST_URL",
  );

  const siteUrl = requiredEnvironment(
    "NEXT_PUBLIC_SITE_URL",
    "SITE_URL",
  ).replace(/\/+$/, "");

  const postUrl =
    configuredPostUrl ||
    (siteUrl
      ? `${siteUrl}/api/mobile/tap/webhook`
      : "");

  const mode: "test" | "live" =
    publicKey.startsWith("pk_live_")
      ? "live"
      : "test";

  return {
    secretKey,
    publicKey,
    merchantId,
    mode,
    postUrl,
  };
}

function validateTapConfiguration(
  configuration: TapConfiguration,
): string | null {
  if (!configuration.secretKey) {
    return "TAP_MOBILE_TEST_SECRET_KEY is not configured";
  }

  if (!configuration.publicKey) {
    return "TAP_MOBILE_TEST_PUBLIC_KEY is not configured";
  }

  if (!configuration.merchantId) {
    return "TAP_MOBILE_TEST_MERCHANT_ID is not configured";
  }

  if (!/^\d+$/.test(configuration.merchantId)) {
    return "TAP_MOBILE_TEST_MERCHANT_ID must contain digits only";
  }

  if (!configuration.postUrl) {
    return (
      "Tap post URL is not configured. " +
      "Set TAP_MOBILE_POST_URL or NEXT_PUBLIC_SITE_URL."
    );
  }

  const publicIsTest =
    configuration.publicKey.startsWith("pk_test_");

  const secretIsTest =
    configuration.secretKey.startsWith("sk_test_");

  const publicIsLive =
    configuration.publicKey.startsWith("pk_live_");

  const secretIsLive =
    configuration.secretKey.startsWith("sk_live_");

  if (
    (!publicIsTest && !publicIsLive) ||
    (!secretIsTest && !secretIsLive)
  ) {
    return "Tap mobile API keys have an invalid format";
  }

  if (
    (publicIsTest && !secretIsTest) ||
    (publicIsLive && !secretIsLive)
  ) {
    return "Tap public and secret keys use different environments";
  }

  let postUri: URL;

  try {
    postUri = new URL(configuration.postUrl);
  } catch {
    return "TAP_MOBILE_POST_URL is not a valid URL";
  }

  if (postUri.protocol !== "https:") {
    return "TAP_MOBILE_POST_URL must use HTTPS";
  }

  return null;
}

/**
 * يعرض جزءًا صغيرًا فقط من المفتاح العام في اللوق.
 * لا تستخدم هذه الدالة أبدًا مع المفتاح السري.
 */
function maskedPublicKey(value: string): string {
  if (value.length <= 14) {
    return `${value.slice(0, 5)}…`;
  }

  return `${value.slice(0, 12)}…${value.slice(-4)}`;
}

function bookingResponse(
  row: BookingRow,
  configuration: TapConfiguration,
) {
  const amount = Number(row.amount_bd);
  const currency = "SAR";

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Stored booking has an invalid payment amount",
    );
  }

  const orderReference =
    `LSOS-${row.id.slice(0, 8).toUpperCase()}`;

  const formattedAmount = amount.toFixed(2);

  const hashString = generateTapHashString({
    publicKey: configuration.publicKey,
    secretKey: configuration.secretKey,
    amount,
    currency,
    transactionReference: orderReference,
    postUrl: configuration.postUrl,
  });


console.info("Tap hash input", {
  amount: formattedAmount,
  currency,
  transactionReference: orderReference,
  postUrl: configuration.postUrl,
  merchantId: configuration.merchantId,
  hashString,
});

  return {
    ok: true,

    bookingId: row.id,
    idempotencyKey:
      row.mobile_payment_idempotency_key,

    orderReference,

    amount,
    formattedAmount,
    currency,

    paymentStatus: row.payment_status,
    tapStatus: row.tap_status,

    tap: {
      publicKey: configuration.publicKey,
      merchantId: configuration.merchantId,
      mode: configuration.mode,
      hashString,
      postUrl: configuration.postUrl,
    },
  };
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
        },
        { status: 400 },
      );
    }

    const parsed = parseRequestBody(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error,
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const tapConfiguration = getTapConfiguration();

    const tapConfigurationError =
      validateTapConfiguration(tapConfiguration);

    if (tapConfigurationError) {
      console.error(
        "Invalid mobile Tap configuration:",
        tapConfigurationError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: tapConfigurationError,
        },
        { status: 500 },
      );
    }

    /*
     * تشخيص آمن.
     *
     * لا نطبع المفتاح السري.
     * لا نطبع المفتاح العام كاملًا.
     */
    console.info("Mobile Tap configuration", {
      publicKey: maskedPublicKey(
        tapConfiguration.publicKey,
      ),
      merchantId: tapConfiguration.merchantId,
      mode: tapConfiguration.mode,
      postUrl: tapConfiguration.postUrl,
    });

    /*
     * منع إنشاء أكثر من حجز بنفس idempotency key.
     */
    const existingRows =
      await sqlClient<BookingRow[]>`
        SELECT
          id,
          mobile_payment_idempotency_key,
          mobile_payment_case_id,
          amount_bd,
          payment_status,
          tap_status
        FROM public.saudi_booking_requests
        WHERE mobile_payment_idempotency_key =
          ${input.idempotencyKey}::uuid
        LIMIT 1
      `;

    const existingBooking = existingRows[0];

    if (existingBooking) {
      const response = bookingResponse(
        existingBooking,
        tapConfiguration,
      );

      console.info("Reusing mobile payment booking", {
        bookingId: existingBooking.id,
        orderReference: response.orderReference,
        amount: response.formattedAmount,
        currency: response.currency,
      });

      return NextResponse.json(
        response,
        { status: 200 },
      );
    }

    /*
     * جلب السعر من السيرفر.
     *
     * لا نعتمد على أي مبلغ يرسله Flutter.
     */
    const country = await getActiveCountry(
      input.countryCode,
    );

    if (!country) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Country is not active or does not exist",
        },
        { status: 404 },
      );
    }

    const emergencyCases =
      await listEmergencyCaseTypes(country);

    const emergencyCase = emergencyCases.find(
      (candidate) =>
        candidate.id === input.caseId ||
        candidate.slug === input.caseId,
    );

    if (!emergencyCase) {
      return NextResponse.json(
        {
          ok: false,
          error: "Emergency case was not found",
        },
        { status: 404 },
      );
    }

    const amount = Number(
      emergencyCase.baseFee,
    );

    const currency = (
      emergencyCase.currencyCode || "SAR"
    ).toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Emergency case has an invalid payment amount",
        },
        { status: 500 },
      );
    }

    if (currency !== "SAR") {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported currency: ${currency}`,
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const serviceName =
      emergencyCase.label.en ||
      emergencyCase.label.ar ||
      emergencyCase.slug;

    const assignedEmail =
      requiredEnvironment(
        "DISPATCH_USERNAME",
        "POSTMARK_TO_EMAIL",
        "ADMIN_EMAIL",
      ) || input.customer.email;

    const requestPayload = JSON.stringify({
      paymentFlow: "mobile_emergency",
      emergencyCaseId: emergencyCase.id,
      emergencyCaseSlug: emergencyCase.slug,
      locale: input.locale,
      countryCode: input.countryCode,
    });

    const rows = await sqlClient<BookingRow[]>`
      INSERT INTO public.saudi_booking_requests (
        country_code,
        lang,
        service,
        consultation_type,
        consultation_method,
        consultation_price,
        amount_bd,
        duration_minutes,
        appointment_date,
        appointment_time,
        assignment_mode,
        assigned_to_email,
        customer_name,
        customer_phone,
        customer_email,
        payment_status,
        admin_status,
        tap_status,
        request_payload,
        mobile_payment_idempotency_key,
        mobile_payment_case_id
      ) VALUES (
        ${input.countryCode},
        ${input.locale},
        ${serviceName},
        ${"Emergency legal assistance"},
        ${"mobile"},
        ${`${amount.toFixed(2)} ${currency}`},
        ${amount.toFixed(2)},
        ${0},
        ${now.toISOString().slice(0, 10)},
        ${now.toISOString().slice(11, 16)},
        ${"office"},
        ${assignedEmail},
        ${input.customer.name},
        ${
          `+${input.customer.phoneCountryCode}` +
          input.customer.phone
        },
        ${input.customer.email},
        ${"pending_payment"},
        ${"pending_review"},
        ${"SDK_PENDING"},
        ${requestPayload}::jsonb,
        ${input.idempotencyKey}::uuid,
        ${String(emergencyCase.id)}
      )
      ON CONFLICT (mobile_payment_idempotency_key)
        WHERE mobile_payment_idempotency_key
          IS NOT NULL
      DO UPDATE SET
        updated_at = NOW()
      RETURNING
        id,
        mobile_payment_idempotency_key,
        mobile_payment_case_id,
        amount_bd,
        payment_status,
        tap_status
    `;

    const booking = rows[0];

    if (!booking) {
      throw new Error(
        "Booking was not created",
      );
    }

    const response = bookingResponse(
      booking,
      tapConfiguration,
    );

    console.info("Mobile payment booking created", {
      bookingId: booking.id,
      orderReference: response.orderReference,
      amount: response.formattedAmount,
      currency: response.currency,
      caseId: emergencyCase.id,
    });

    return NextResponse.json(
      response,
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Mobile Tap payment session error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create payment session",
      },
      { status: 500 },
    );
  }
}
