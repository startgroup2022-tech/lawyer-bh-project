import { NextResponse } from "next/server";

import {
  authorizeLiveSdkTest,
  createTapLiveSdkSession,
  type TapLiveSdkConfiguration,
} from "@/lib/tap/live-sdk-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function environment(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function configuration(): TapLiveSdkConfiguration {
  const configuredPostUrl = environment("TAP_MOBILE_POST_URL");
  const siteUrl = environment("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");

  return {
    publicKey: environment("TAP_MOBILE_LIVE_PUBLIC_KEY"),
    secretKey: environment("TAP_MOBILE_LIVE_SECRET_KEY"),
    merchantId: environment("TAP_MOBILE_LIVE_MERCHANT_ID"),
    postUrl:
      configuredPostUrl ||
      (siteUrl ? `${siteUrl}/api/mobile/tap/webhook` : ""),
    accessToken: environment("TAP_MOBILE_LIVE_SDK_TEST_TOKEN"),
  };
}

export async function POST(request: Request) {
  const tapConfiguration = configuration();
  const suppliedToken = request.headers.get("x-live-sdk-test-token")?.trim() ?? "";

  if (!authorizeLiveSdkTest(suppliedToken, tapConfiguration)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized live SDK test" },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(createTapLiveSdkSession(tapConfiguration), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Tap live SDK test configuration is invalid", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { ok: false, error: "Tap live SDK test is unavailable" },
      { status: 500 },
    );
  }
}
