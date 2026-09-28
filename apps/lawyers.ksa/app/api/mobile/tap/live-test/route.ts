import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requiredEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export async function POST() {
  try {
    const secretKey = requiredEnv("TAP_MOBILE_LIVE_SECRET_KEY");
    const merchantId = requiredEnv("TAP_MOBILE_LIVE_MERCHANT_ID");
    const siteUrl = requiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "TAP_MOBILE_LIVE_SECRET_KEY is missing",
        },
        { status: 500 },
      );
    }

    if (!secretKey.startsWith("sk_live_")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Live test requires an sk_live_ key",
        },
        { status: 500 },
      );
    }

    if (!merchantId || !siteUrl.startsWith("https://")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tap merchant or HTTPS site URL is missing",
        },
        { status: 500 },
      );
    }

    const reference = `LSOS-LIVE-${Date.now()}`;

    const payload = {
      amount: 0.1,
      currency: "SAR",

      customer_initiated: true,
      threeDSecure: true,
      save_card: false,

      description: "LegalSOS Live Integration Test",

      metadata: {
        paymentFlow: "legalsos_live_test",
        environment: "live",
      },

      reference: {
        transaction: reference,
        order: reference,
      },

      customer: {
        first_name: "Test",
        last_name: "Customer",
        email: "test@example.com",
        phone: {
          country_code: "966",
          number: "500000000",
        },
      },

      merchant: {
        id: merchantId,
      },

      source: {
        id: "src_card",
      },

      auto: {
        type: "VOID",
        time: 1,
      },

      post: {
        url: `${siteUrl}/api/mobile/tap/webhook`,
      },

      redirect: {
        url: `${siteUrl}/api/tap/redirect`,
      },
    };

    console.info("Tap LIVE authorize test request", {
      merchantId,
      amount: payload.amount,
      currency: payload.currency,
      reference,
      source: payload.source.id,
    });

    const response = await fetch(
      "https://api.tap.company/v2/authorize/",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(payload),

        cache: "no-store",
      },
    );

    const raw = await response.text();

    let tapResponse: unknown;

    try {
      tapResponse = JSON.parse(raw);
    } catch {
      tapResponse = raw;
    }

    console.info("Tap LIVE authorize response", {
      httpStatus: response.status,
      tapResponse,
    });

    return NextResponse.json(
      {
        ok: response.ok,
        tapHttpStatus: response.status,
        tapResponse,
      },
      {
        status: response.ok ? 200 : 502,
      },
    );
  } catch (error) {
    console.error("Tap LIVE authorize test error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Tap live test error",
      },
      { status: 500 },
    );
  }
}
