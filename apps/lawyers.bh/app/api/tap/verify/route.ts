import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyBody = {
  chargeId?: string;
  orderId?: string;
  expectedAmount?: number | string;
  expectedCurrency?: string;
};

type TapCharge = {
  id?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  reference?: {
    order?: string;
    transaction?: string;
  };
  metadata?: Record<string, unknown>;
  response?: {
    code?: string;
    message?: string;
  };
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};

function getTapSecretKey() {
  return (
    process.env.TAP_SECRET_KEY ||
    process.env.TAP_SK ||
    process.env.TAP_SECRET ||
    ""
  ).trim();
}

function cleanText(value: unknown, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeAmount(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round((amount + Number.EPSILON) * 1000) / 1000;
}

function sameAmount(left: number, right: number) {
  return Math.abs(left - right) < 0.0005;
}

export async function POST(request: Request) {
  let body: VerifyBody;

  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const chargeId = cleanText(body.chargeId, 160);
  const orderId = cleanText(body.orderId, 160);
  const expectedAmount = normalizeAmount(body.expectedAmount);
  const expectedCurrency = cleanText(body.expectedCurrency, 10).toUpperCase();

  if (!chargeId || !chargeId.startsWith("chg_")) {
    return NextResponse.json(
      { ok: false, error: "A valid Tap chargeId is required" },
      { status: 400 },
    );
  }

  if (!orderId) {
    return NextResponse.json(
      { ok: false, error: "orderId is required" },
      { status: 400 },
    );
  }

  if (expectedAmount === null) {
    return NextResponse.json(
      { ok: false, error: "A valid expectedAmount is required" },
      { status: 400 },
    );
  }

  if (!expectedCurrency) {
    return NextResponse.json(
      { ok: false, error: "expectedCurrency is required" },
      { status: 400 },
    );
  }

  const tapSecretKey = getTapSecretKey();

  if (!tapSecretKey) {
    return NextResponse.json(
      { ok: false, error: "Tap secret key is not configured" },
      { status: 500 },
    );
  }

  const tapResponse = await fetch(
    `https://api.tap.company/v2/charges/${encodeURIComponent(chargeId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tapSecretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const charge = (await tapResponse.json().catch(() => ({}))) as TapCharge;

  if (!tapResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          charge.errors?.[0]?.description ||
          charge.response?.message ||
          "Could not retrieve Tap charge",
      },
      { status: 502 },
    );
  }

  const status = cleanText(charge.status, 40).toUpperCase();
  const actualAmount = normalizeAmount(charge.amount);
  const actualCurrency = cleanText(charge.currency, 10).toUpperCase();
  const referenceOrder = cleanText(charge.reference?.order, 160);
  const metadataOrder = cleanText(charge.metadata?.order_id, 160);

  const orderMatches = referenceOrder === orderId || metadataOrder === orderId;
  const amountMatches =
    actualAmount !== null && sameAmount(actualAmount, expectedAmount);
  const currencyMatches = actualCurrency === expectedCurrency;
  const captured = status === "CAPTURED";

  if (!captured || !orderMatches || !amountMatches || !currencyMatches) {
    return NextResponse.json(
      {
        ok: false,
        status,
        error: "Payment could not be verified",
        checks: {
          captured,
          orderMatches,
          amountMatches,
          currencyMatches,
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status,
    chargeId: charge.id,
    invoiceNumber: charge.id,
  });
}
