// POST /api/auth/login
// Body: { email, password }
// Sets the lsos_admin_session cookie on success.

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createAdminSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

// In-memory rate limit per email (single-process — fine for the admin
// console which runs on one Vercel region). Resets on cold start.
const attempts = new Map<string, { count: number; windowStart: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = attempts.get(email);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(email, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function recordSuccess(email: string) {
  attempts.delete(email);
}

export async function POST(req: Request) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = payload.email.toLowerCase().trim();

  if (isRateLimited(email)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const [admin] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1);

  // Generic error message so we don't leak whether the email exists.
  const invalidResponse = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 },
  );

  if (!admin || !admin.isActive) {
    // Still hash a dummy to keep timing roughly constant.
    await verifyPassword(payload.password, "$2a$12$invalidsaltinvalidsaltinvali.dummypwdneverequalsanybcrypthashs1");
    return invalidResponse;
  }

  const ok = await verifyPassword(payload.password, admin.passwordHash);
  if (!ok) return invalidResponse;

  const ua = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

  await createAdminSession(admin.id, { ua, ip });

  // Audit log entry.
  await db.insert(schema.auditLog).values({
    actorAdminId: admin.id,
    action: "admin.signin",
    targetType: "admin_user",
    targetId: admin.id,
    ipAddress: ip || null,
    userAgent: ua || null,
  });

  recordSuccess(email);

  return NextResponse.json({ ok: true });
}
