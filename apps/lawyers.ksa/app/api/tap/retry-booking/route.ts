import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getTapSecretKey } from "@/lib/tap/config";

type RetryPaymentBody = {
  bookingId?: string;
  lang?: string;
};

type TapChargeResponse = {
  id?: string;
  status?: string;
  transaction?: {
    url?: string;
  };
  response?: {
    code?: string;
    message?: string;
  };
};

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const origin = String(request.headers.get("origin") ?? "").trim();

  return (siteUrl || origin || requestUrl.origin).replace(/\/$/, "");
}

function normalizeLocale(value: unknown) {
  return String(value ?? "").trim().toLowerCase() === "ar" ? "ar" : "en";
}

function getCustomerFirstName(value: string) {
  const name = String(value ?? "").trim();
  if (!name) return "Customer";

  return name.split(/\s+/)[0] || name;
}

function getCustomerPhone(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("966") && digits.length > 3) {
    return {
      country_code: "966",
      number: digits.slice(3),
    };
  }

  return {
    country_code: "966",
    number: digits || "500000000",
  };
}

export async function POST(request: Request) {
  let body: RetryPaymentBody = {};

  try {
    body = (await request.json()) as RetryPaymentBody;
  } catch {
    body = {};
  }

  const bookingId = String(body.bookingId ?? "").trim();
  const lang = normalizeLocale(body.lang);

  if (!bookingId) {
    return NextResponse.json(
      { ok: false, error: "Booking ID is required" },
      { status: 400 },
    );
  }

  let tapSecretKey: string;

  try {
    tapSecretKey = getTapSecretKey();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Tap secret key is not configured" },
      { status: 500 },
    );
  }

  const [booking] = await db
    .select({
      id: schema.bookingRequests.id,
      lang: schema.bookingRequests.lang,
      service: schema.bookingRequests.service,
      consultationType: schema.bookingRequests.consultationType,
      consultationPrice: schema.bookingRequests.consultationPrice,
      amountBd: schema.bookingRequests.amountBd,
      appointmentDate: schema.bookingRequests.appointmentDate,
      appointmentTime: schema.bookingRequests.appointmentTime,
      customerName: schema.bookingRequests.customerName,
      customerPhone: schema.bookingRequests.customerPhone,
      customerEmail: schema.bookingRequests.customerEmail,
      paymentStatus: schema.bookingRequests.paymentStatus,
    })
    .from(schema.bookingRequests)
    .where(eq(schema.bookingRequests.id, bookingId))
    .limit(1);

  if (!booking) {
    return NextResponse.json(
      { ok: false, error: "Booking was not found" },
      { status: 404 },
    );
  }

  if (booking.paymentStatus === "paid") {
    return NextResponse.json(
      { ok: false, error: "This booking is already paid" },
      { status: 409 },
    );
  }

  const amount = Number(booking.amountBd);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid booking amount" },
      { status: 400 },
    );
  }

  const baseUrl = getBaseUrl(request);
  const redirectLocale = booking.lang === "ar" ? "ar" : lang;
  const redirectUrl = `${baseUrl}/${redirectLocale}/booking-confirmed`;
  const phone = getCustomerPhone(booking.customerPhone);

  const chargePayload = {
    amount,
    currency: "SAR",
    threeDSecure: true,
    save_card: false,
    description: `Retry payment for booking ${booking.id}`,
    statement_descriptor: "Saudi Lawyers",
    metadata: {
      booking_id: booking.id,
      retry_payment: "true",
      service: booking.service,
    },
    reference: {
      transaction: booking.id,
      order: booking.id,
    },
    receipt: {
      email: true,
      sms: false,
    },
    customer: {
      first_name: getCustomerFirstName(booking.customerName),
      email: booking.customerEmail,
      phone,
    },
    source: {
      id: "src_all",
    },
    redirect: {
      url: redirectUrl,
    },
  };

  const tapRes = await fetch("https://api.tap.company/v2/charges", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tapSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chargePayload),
    cache: "no-store",
  });

  const tapData = (await tapRes.json().catch(() => ({}))) as TapChargeResponse;

  if (!tapRes.ok || !tapData.id || !tapData.transaction?.url) {
    return NextResponse.json(
      {
        ok: false,
        error:
          tapData.response?.message ||
          "Could not create a new Tap payment link",
      },
      { status: 502 },
    );
  }

  await db
    .update(schema.bookingRequests)
    .set({
      tapChargeId: tapData.id,
      tapStatus: String(tapData.status ?? "INITIATED").toUpperCase(),
      tapPayload: tapData,
      paymentStatus: "pending_payment",
      updatedAt: new Date(),
    })
    .where(eq(schema.bookingRequests.id, booking.id));

  return NextResponse.json({
    ok: true,
    chargeId: tapData.id,
    transactionUrl: tapData.transaction.url,
  });
}
