import { NextResponse } from "next/server";
import { clearProviderSession } from "../_session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  clearProviderSession(response);

  return response;
}