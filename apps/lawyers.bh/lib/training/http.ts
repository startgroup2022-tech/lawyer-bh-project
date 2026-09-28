import { isIP } from "node:net";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { TrainingError } from "./types";

export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: privateHeaders }); }
export function clientKey(request: Request) {
  // Vercel overwrites this header. Outside Vercel, use one conservative bucket rather than trust spoofable proxy headers.
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "";
  return ip && isIP(ip) ? ip : "unknown";
}
export async function endpoint(request: Request, action: (adminId: string) => Promise<Response>, admin = false) {
  try {
    let adminId = "";
    if (admin) {
      const actor = await requireAdminPermission("manage_training");
      if (!actor) throw new TrainingError("forbidden", 403);
      adminId = actor.id;
    }
    if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== new URL(request.url).origin) throw new TrainingError("forbidden", 403);
    return await action(adminId);
  } catch (error) {
    if (error instanceof TrainingError) return json({ ok: false, error: error.code }, error.status);
    console.error("[training] request failed", { name: error instanceof Error ? error.name : "unknown" });
    return json({ ok: false, error: "unavailable" }, 500);
  }
}
export async function readBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw new TrainingError("request_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new TrainingError("invalid_input");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new TrainingError("request_too_large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request) {
  const bytes = await readBytes(request, 32 * 1024);
  try {
    const data = JSON.parse(bytes.toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch { throw new TrainingError("invalid_input"); }
}
