import { NextResponse } from "next/server";

import { allowClientPushRegistration } from "@/lib/sos/client-push-rate-limit";
import {
  mobilePushStore,
  type MobilePushLocale,
  type MobilePushPlatform,
} from "@/lib/sos/mobile-push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validLocale(value: unknown): value is MobilePushLocale {
  return value === "ar" || value === "en" || value === "tr";
}

function validPlatform(value: unknown): value is MobilePushPlatform {
  return value === "ios" || value === "android";
}

async function json(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function PUT(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (!allowClientPushRegistration(ip)) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429 },
    );
  }

  const body = await json(request);
  if (
    !body ||
    !validPlatform(body.platform) ||
    !validLocale(body.locale) ||
    typeof body.token !== "string" ||
    body.token.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "invalid_registration" },
      { status: 400 },
    );
  }

  try {
    await mobilePushStore.registerClientInstallation({
      token: body.token,
      platform: body.platform,
      locale: body.locale,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_fcm_token") {
      return NextResponse.json(
        { error: "invalid_registration" },
        { status: 400 },
      );
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
