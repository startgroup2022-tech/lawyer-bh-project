import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const secretKey =
      process.env.TAP_MOBILE_TEST_SECRET_KEY?.trim();

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing TAP_MOBILE_TEST_SECRET_KEY",
        },
        { status: 500 },
      );
    }

    const response = await fetch(
      "https://api.tap.company/v2/charges/list",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          limit: "10",
          order: "reverse_chronological",
        }),
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

    return NextResponse.json({
      ok: response.ok,
      tapHttpStatus: response.status,
      tapResponse: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}