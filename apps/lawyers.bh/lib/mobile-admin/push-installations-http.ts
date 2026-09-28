import type { AdminInstallationInput } from "./push-installations-core";

type Dependencies = {
  authorize(request: Request): Promise<{ id: string; sessionDigest: string } | null>;
  register(input: AdminInstallationInput): Promise<void>;
  remove(input: Pick<AdminInstallationInput, "adminId" | "token">): Promise<void>;
};

function json(body: object, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function payload(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function token(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 4096 && value === value.trim();
}

export function createAdminPushInstallationsHttp(deps: Dependencies) {
  return {
    async POST(request: Request): Promise<Response> {
      const admin = await deps.authorize(request);
      if (!admin) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await payload(request);
      if (!body || !token(body.token) ||
        (body.platform !== "ios" && body.platform !== "android") ||
        (body.locale !== "ar" && body.locale !== "en" && body.locale !== "tr")) {
        return json({ ok: false, error: "invalid_admin_push_installation" }, 400);
      }
      await deps.register({ adminId: admin.id, sessionDigest: admin.sessionDigest, token: body.token, platform: body.platform, locale: body.locale });
      return json({ ok: true });
    },
    async DELETE(request: Request): Promise<Response> {
      const admin = await deps.authorize(request);
      if (!admin) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await payload(request);
      if (!body || !token(body.token)) return json({ ok: false, error: "invalid_admin_push_installation" }, 400);
      await deps.remove({ adminId: admin.id, token: body.token });
      return json({ ok: true });
    },
  };
}
