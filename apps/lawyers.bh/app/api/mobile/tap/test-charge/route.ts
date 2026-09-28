import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const secretKey = process.env.TAP_MOBILE_TEST_SECRET_KEY?.trim();
    const merchantId = process.env.TAP_MOBILE_TEST_MERCHANT_ID?.trim();

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "TAP_MOBILE_TEST_SECRET_KEY is missing",
        },
        { status: 500 },
      );
    }

    if (!merchantId) {
      return NextResponse.json(
        {
          ok: false,
          error: "TAP_MOBILE_TEST_MERCHANT_ID is missing",
        },
        { status: 500 },
      );
    }

    const reference = `TEST-${Date.now()}`;

    const payload = {
      amount: 1,
      currency: "BHD",

      customer_initiated: true,
      threeDSecure: true,
      save_card: false,

      description: "LegalSOS Tap API Test",

      metadata: {
        flow: "direct_api_test",
      },

      reference: {
        transaction: reference,
        order: reference,
      },

      customer: {
        first_name: "Habib",
        last_name: "Habib",
        email: "habib@gmail.com",
        phone: {
          country_code: "973",
          number: "36005682",
        },
      },

      merchant: {
        id: merchantId,
      },

      source: {
  id: "src_bh.benefit",
},

      post: {
        url: "https://www.lawyers.bh/api/mobile/tap/webhook",
      },

      redirect: {
        url: "https://www.lawyers.bh/api/tap/redirect",
      },
    };

    console.log("Tap direct API test request", {
      merchantId,
      amount: payload.amount,
      currency: payload.currency,
      source: payload.source.id,
      reference,
    });

    const response = await fetch(
      "https://api.tap.company/v2/charges/",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),

        cache: "no-store",
      },
    );

    const raw = await response.text();

    let data: unknown;

    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    console.log("Tap direct API response", {
      httpStatus: response.status,
      data,
    });

    return NextResponse.json(
      {
        ok: response.ok,
        tapHttpStatus: response.status,
        tapResponse: data,
      },
      {
        status: response.ok ? 200 : 502,
      },
    );
  } catch (error) {
    console.error("Tap direct API test error", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Tap test error",
      },
      { status: 500 },
    );
  }
}