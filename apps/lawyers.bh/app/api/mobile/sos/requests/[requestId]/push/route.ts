import { NextResponse } from "next/server";

import { bearerToken, authorizeMobileDispatchToken } from "@/lib/sos/mobile-dispatch-auth";
import { mobilePushStore, type MobilePushLocale, type MobilePushPlatform } from "@/lib/sos/mobile-push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ requestId: string }> };

function validLocale(value: unknown): value is MobilePushLocale {
  return value === "ar" || value === "en" || value === "tr";
}
function validPlatform(value: unknown): value is MobilePushPlatform {
  return value === "ios" || value === "android";
}

async function json(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function authorized(request: Request, requestId: string) {
  return authorizeMobileDispatchToken(requestId, bearerToken(request));
}

export async function PUT(request: Request, context: Context) {
  const { requestId } = await context.params;
  if (!await authorized(request, requestId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await json(request);
  if (!body || !validPlatform(body.platform) || !validLocale(body.locale) || typeof body.token !== "string") {
    return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
  }
  try {
    await mobilePushStore.subscribeClientRequest({ token: body.token, platform: body.platform, locale: body.locale, requestId });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_fcm_token") {
      return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: Request, context: Context) {
  const { requestId } = await context.params;
  if (!await authorized(request, requestId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await json(request);
  if (!body || typeof body.token !== "string") {
    return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
  }
  try {
    await mobilePushStore.unsubscribeClientRequest(body.token, requestId);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_fcm_token") {
      return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
