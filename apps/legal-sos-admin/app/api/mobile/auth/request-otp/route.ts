// POST /api/mobile/auth/request-otp
// Body: { phone: "+97333224471", role: "client"|"lawyer", locale?: "en"|"ar" }
// Sends a 6-digit SMS code via Twilio Verify.

import { NextResponse } from "next/server";
import { z } from "zod";
import { isE164 } from "@/lib/phone";
import { requestOtp } from "@/lib/services/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  phone: z.string().refine(isE164, "Phone must be E.164"),
  role: z.enum(["client", "lawyer"]),
  locale: z.enum(["en", "ar"]).default("en"),
});

function getIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: Request) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_request", message: (err as Error).message },
      { status: 400 },
    );
  }

  const result = await requestOtp({
    phone: payload.phone,
    role: payload.role,
    locale: payload.locale,
    ip: getIp(req),
    userAgent: req.headers.get("user-agent") ?? null,
  });

  if (!result.ok) {
    const status =
      result.code === "twilio_not_configured"
        ? 503
        : result.code === "rate_limited"
          ? 429
          : 400;
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status },
    );
  }

  return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
}
