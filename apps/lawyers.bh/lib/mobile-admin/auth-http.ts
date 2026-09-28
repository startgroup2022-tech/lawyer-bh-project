import type { createMobileAdminAuth } from "./auth-core";

type Auth = ReturnType<typeof createMobileAdminAuth>;

function json(body: object, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{40,60})$/.exec(header);
  return match?.[1] ?? "";
}

export function createMobileAdminAuthHttp(
  auth: Auth,
  takeLoginAttempt: (request: Request, email: string) => Promise<boolean> = async () => true,
) {
  return {
    async login(request: Request): Promise<Response> {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return json({ ok: false, error: "Invalid request" }, 400);
      }
      const { email, password } = body as Record<string, unknown>;
      if (typeof email !== "string" || typeof password !== "string" ||
          !email.trim() || !password || email.length > 254 || password.length > 1024) {
        return json({ ok: false, error: "Invalid request" }, 400);
      }
      if (!(await takeLoginAttempt(request, email.trim().toLowerCase()))) {
        return json({ ok: false, error: "Too many attempts" }, 429);
      }
      const session = await auth.login(email, password);
      if (!session) return json({ ok: false, error: "Invalid login details" }, 401);
      return json({ ok: true, ...session });
    },
    async me(request: Request): Promise<Response> {
      const token = bearerToken(request);
      if (!token) return json({ ok: false, error: "Unauthorized" }, 401);
      const admin = await auth.authorize(token, "manage_requests");
      if (!admin) return json({ ok: false, error: "Unauthorized" }, 401);
      return json({ ok: true, admin: {
        id: admin.id, fullName: admin.fullName, email: admin.email, role: admin.role,
      } });
    },
    async logout(request: Request): Promise<Response> {
      const token = bearerToken(request);
      if (!token) return json({ ok: false, error: "Unauthorized" }, 401);
      await auth.logout(token);
      return json({ ok: true });
    },
  };
}
