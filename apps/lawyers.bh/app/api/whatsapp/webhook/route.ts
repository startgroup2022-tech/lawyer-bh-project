import { NextResponse } from "next/server";
import { parseMetaMessages } from "@/lib/whatsapp/meta-events";
import { verifyMetaSignature } from "@/lib/whatsapp/meta-signature";
import { processInboundMessage } from "@/lib/whatsapp/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();

  if (expected && mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_WHATSAPP_APP_SECRET?.trim() ?? "";
  const rawBody = await request.text();

  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  for (const message of parseMetaMessages(payload)) {
    await processInboundMessage(message);
  }

  return NextResponse.json({ ok: true });
}
