// POST /api/mobile/auth/verify-otp
// Body: { phone, code, role, fullName?, idNumber?, countryCode?, locale?, device? }
// On success: { ok: true, accessJwt, refreshToken, user }

import { NextResponse } from "next/server";
import { z } from "zod";
import { isE164 } from "@/lib/phone";
import { verifyOtp } from "@/lib/services/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  phone: z.string().refine(isE164, "Phone must be E.164"),
  code: z.string().regex(/^\d{4,8}$/, "Code must be 4–8 digits"),
  role: z.enum(["client", "lawyer"]),
  fullName: z.string().min(2).max(100).optional(),
  idNumber: z.string().min(4).max(32).optional(),
  countryCode: z.enum(["BH", "AE", "SA", "KW", "QA", "OM"]).default("BH"),
  locale: z.enum(["en", "ar"]).default("en"),
  device: z
    .object({
      model: z.string().max(64).optional(),
      os: z.string().max(32).optional(),
      appVersion: z.string().max(16).optional(),
    })
    .optional(),
});

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

  const result = await verifyOtp({
    ...payload,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  });

  if (!result.ok) {
    const status =
      result.code === "too_many_attempts"
        ? 429
        : result.code === "no_active_code"
          ? 400
          : 401;
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    accessJwt: result.accessJwt,
    refreshToken: result.refreshToken,
    user: result.user,
  });
}
