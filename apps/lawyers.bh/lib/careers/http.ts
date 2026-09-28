import { requireAdminPermission } from "@/lib/auth/admin-access";
import { CareersError } from "./types";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
function sameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new CareersError("forbidden", 403);
}
function errorResponse(error: unknown) {
  if (error instanceof CareersError) return json({ ok: false, error: error.code }, error.status);
  console.error("[careers] request failed", { name: error instanceof Error ? error.name : "unknown", code: error && typeof error === "object" && "code" in error ? String(error.code) : "unknown", frames: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack?.split("\n").slice(1, 5).join("\n") : undefined });
  return json({ ok: false, error: "unavailable" }, 500);
}
export async function publicEndpoint(request: Request, action: () => Promise<Response>) {
  try { sameOrigin(request); return await action(); } catch (error) { return errorResponse(error); }
}
export async function adminEndpoint(request: Request, action: (adminId: string) => Promise<Response>) {
  try {
    const admin = await requireAdminPermission("manage_careers");
    if (!admin) throw new CareersError("forbidden", 403);
    sameOrigin(request);
    return await action(admin.id);
  } catch (error) { return errorResponse(error); }
}
export async function readBytes(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > limit) throw new CareersError("request_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CareersError("invalid_input");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new CareersError("request_too_large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const bytes = await readBytes(request, 160 * 1024);
  try {
    const data = JSON.parse(bytes.toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new CareersError("invalid_input"); }
}
