import { createHmac, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import type { Sql, TransactionSql } from "postgres";
import { DiscountError, type DiscountQuote } from "@/lib/discounts/service";
import { normalizeDiscountCode, parseBhdToFils } from "@/lib/discounts/pricing";
import { loadDiscountQuote, reserveMobileDiscount } from "@/lib/discounts/repository";

import { authFailure } from "@/lib/client-auth/http";
import { resolveOptionalClientAccount } from "@/lib/client-auth/request-account";
import { sqlClient } from "@/lib/db/client";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { listEmergencyCaseTypes } from "@/lib/sos/emergencyCaseCatalog";
import { generateCaseRef } from "@/lib/sos/caseTypes";
import { tapOrderReference } from "@/lib/payments/request-identity";
import { formatTapBhdAmount } from "@/lib/tap/bhd-amount";
import { resolveMobileTapPostUrl } from "@/lib/tap/mobile-post-url";
import {
  createMobileRequestAccessToken,
  verifyMobileRequestAccessToken,
} from "@/lib/tap/mobile-request-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingRow = {
  discount?: DiscountQuote | null;
  id: string;
  case_ref: string;
  mobile_payment_idempotency_key: string;
  mobile_payment_case_id: string | null;
  mobile_request_access_digest: string | null;
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
  discountCode: string | null;
  countryCode: string;
  caseId: string;
  locale: "ar" | "en";
  idempotencyKey: string;
  requestAccessToken: string;
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
  return value.replace(/[^a-z]/gi, "").toUpperCase() || "BH";
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
    readString(body, "countryCode", "country_code") || "BH",
  );

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

  const requestAccessToken = readString(
    body,
    "requestAccessToken",
    "request_access_token",
  );

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

  if (customer.email && !isValidEmail(customer.email)) {
    return {
      ok: false,
      error: "customer.email must be valid when provided",
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
      discountCode: null,
      countryCode,
      caseId,
      locale,
      idempotencyKey,
      requestAccessToken,
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
  const formattedAmount = formatTapBhdAmount(input.amount);

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
    "TAP_MOBILE_SECRET_KEY",
    "TAP_MOBILE_TEST_SECRET_KEY",
  );

  const publicKey = requiredEnvironment(
    "TAP_MOBILE_PUBLIC_KEY",
    "TAP_MOBILE_TEST_PUBLIC_KEY",
  );

  const merchantId = requiredEnvironment(
    "TAP_MOBILE_MERCHANT_ID",
    "TAP_MOBILE_TEST_MERCHANT_ID",
  );

  const configuredPostUrl = requiredEnvironment(
    "TAP_MOBILE_POST_URL",
  );

  const siteUrl = requiredEnvironment(
    "NEXT_PUBLIC_SITE_URL",
    "SITE_URL",
  );

  const postUrl = resolveMobileTapPostUrl({
    configuredPostUrl,
    siteUrl,
  });

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
  requestAccessToken: string,
) {
  const amount = Number(row.amount_bd);
  const currency = "BHD";

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Stored booking has an invalid payment amount",
    );
  }

  const orderReference = tapOrderReference({
    requestType: "emergency",
    requestId: row.id,
  });

  const formattedAmount = formatTapBhdAmount(amount);

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
    requestType: "emergency",
    requestId: row.id,
    requestReference: row.case_ref,

    bookingId: row.id,
    idempotencyKey:
      row.mobile_payment_idempotency_key,
    requestAccessToken,

    orderReference,

    amount,
    formattedAmount,
    discount: row.discount ?? null,
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

    let country;
    try {
      country = await requireCountryProduct(parsed.data.countryCode, "legal_sos");
    } catch (error) {
      const mapped = mapCountryProductAccessError(error);
      if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
      throw error;
    }

    const input = parsed.data;
    const rawDiscount = isRecord(body) ? body.discountCode : undefined;
    if (rawDiscount !== undefined && rawDiscount !== null && rawDiscount !== "" && !normalizeDiscountCode(rawDiscount)) {
      return NextResponse.json({ ok: false, errorCode: "invalid" }, { status: 400 });
    }
    input.discountCode = normalizeDiscountCode(rawDiscount);
    let clientAccount: { id: string } | null;
    try {
      clientAccount = await resolveOptionalClientAccount(request);
    } catch (error) {
      return authFailure(error);
    }
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
          id, case_ref,
          mobile_payment_idempotency_key,
          mobile_payment_case_id,
          mobile_request_access_digest,
          base_fee_bhd AS amount_bd,
          payment_status,
          tap_status,
          (SELECT json_build_object('codeId',dr.discount_code_id,'code',dc.code,
            'originalAmountBd',dr.original_amount_bd::text,'discountAmountBd',dr.discount_amount_bd::text,
            'finalAmountBd',dr.final_amount_bd::text) FROM discount_redemptions dr JOIN discount_codes dc ON dc.id=dr.discount_code_id
            WHERE dr.emergency_request_id=bahrain_emergency_requests.id) AS discount
        FROM public.bahrain_emergency_requests
        WHERE mobile_payment_idempotency_key =
          ${input.idempotencyKey}::uuid
        LIMIT 1
      `;

    const existingBooking = existingRows[0];

    if (existingBooking) {
      if (
        !existingBooking.mobile_request_access_digest ||
        !verifyMobileRequestAccessToken(
          input.requestAccessToken,
          existingBooking.mobile_request_access_digest,
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Request access token is required",
          },
          { status: 403 },
        );
      }

      const response = bookingResponse(
        existingBooking,
        tapConfiguration,
        input.requestAccessToken,
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
      emergencyCase.baseFeeBhd,
    );

    const currency = (
      emergencyCase.currencyCode || "BHD"
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

    if (currency !== "BHD") {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported currency: ${currency}`,
        },
        { status: 400 },
      );
    }

    const serviceName =
      emergencyCase.label.en ||
      emergencyCase.label.ar ||
      emergencyCase.slug;

    const caseRef = generateCaseRef();
    const requestAccess = createMobileRequestAccessToken();

    const createBooking = async (connection: Sql | TransactionSql, quote: DiscountQuote | null) => {
    const rows = await connection<BookingRow[]>`
      INSERT INTO public.bahrain_emergency_requests (
        country_code, case_ref, case_type, description,
        contact_name, contact_phone, base_fee_bhd,
        payment_status, service_status, tap_status, locale,
        mobile_payment_idempotency_key, mobile_payment_case_id,
        mobile_request_access_digest, client_account_id
      ) VALUES (
        ${input.countryCode}, ${caseRef}, ${emergencyCase.slug}, ${serviceName},
        ${input.customer.name},
        ${`+${input.customer.phoneCountryCode}${input.customer.phone}`},
        ${quote?.finalAmountBd ?? amount.toFixed(3)}, ${"pending"}, ${"pending"}, ${"SDK_PENDING"},
        ${input.locale}, ${input.idempotencyKey}::uuid, ${String(emergencyCase.id)},
        ${requestAccess.digest}, ${clientAccount?.id ?? null}::uuid
      )
      ON CONFLICT (mobile_payment_idempotency_key)
        WHERE mobile_payment_idempotency_key
          IS NOT NULL
      DO UPDATE SET
        updated_at = NOW()
      RETURNING
        id, case_ref,
        mobile_payment_idempotency_key,
        mobile_payment_case_id,
        mobile_request_access_digest,
        base_fee_bhd AS amount_bd,
        payment_status,
        tap_status
    `;

    const created = rows[0];
    if (quote && created?.mobile_request_access_digest !== requestAccess.digest) throw new DiscountError("invalid");
    if (quote && created) {
      await reserveMobileDiscount(connection as TransactionSql, {
        quote, userKey: input.customer.email || `phone:+${input.customer.phoneCountryCode}${input.customer.phone}`, requestId: created.id,
      });
      created.discount = quote;
    }
    return rows;
    };

    const rows = input.discountCode ? await sqlClient.begin(async tx => {
      const quote = await loadDiscountQuote({ code: input.discountCode,
        email: input.customer.email || `phone:+${input.customer.phoneCountryCode}${input.customer.phone}`,
        originalFils: parseBhdToFils(amount), channel: "app", includeReservations: true, lock: true },tx);
      if (!isRecord(body) || body.expectedFinalAmountBd !== quote.finalAmountBd) throw new DiscountError("price_changed");
      return createBooking(tx,quote);
    }) : await createBooking(sqlClient,null);

    const booking = rows[0];

    if (!booking) {
      throw new Error(
        "Booking was not created",
      );
    }

    if (booking.mobile_request_access_digest !== requestAccess.digest) {
      return NextResponse.json(
        {
          ok: false,
          error: "The payment request already exists; retry with its access token",
        },
        { status: 409 },
      );
    }

    const response = bookingResponse(
      booking,
      tapConfiguration,
      requestAccess.token,
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
    if (error instanceof DiscountError) return NextResponse.json({ ok: false, errorCode: error.code, error: error.code }, { status: 400 });
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
