import "server-only";

import { createHmac } from "node:crypto";
import { sqlClient } from "@/lib/db/client";

function digest(value: string): string {
  const secret = process.env.ADMIN_AUTH_SECRET || process.env.LAWYER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing admin authentication secret");
  return createHmac("sha256", secret).update(`mobile-admin-login:${value}`).digest("hex");
}

export async function takeMobileAdminLoginAttempt(request: Request, email: string): Promise<boolean> {
  const ip = process.env.VERCEL === "1"
    ? (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim()
    : "local";
  const limits = [
    { key: digest(`ip:${ip}`), max: 20 },
    { key: digest(`email:${email}`), max: 5 },
  ];
  return sqlClient.begin(async (tx) => {
    for (const limit of limits) {
      const rows = await tx`
        INSERT INTO mobile_client_auth_limits (key, count, reset_at, last_at)
        VALUES (${limit.key}, 1, now() + interval '15 minutes', now())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN mobile_client_auth_limits.reset_at <= now() THEN 1 ELSE mobile_client_auth_limits.count + 1 END,
          reset_at = CASE WHEN mobile_client_auth_limits.reset_at <= now() THEN now() + interval '15 minutes' ELSE mobile_client_auth_limits.reset_at END,
          last_at = now()
        WHERE mobile_client_auth_limits.reset_at <= now() OR mobile_client_auth_limits.count < ${limit.max}
        RETURNING key`;
      if (rows.length !== 1) return false;
    }
    return true;
  });
}
