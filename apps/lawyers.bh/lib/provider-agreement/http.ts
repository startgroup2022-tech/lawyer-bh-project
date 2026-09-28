import { requireAdminPermission } from "@/lib/auth/admin-access";
import { AgreementError } from "./model";
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: privateHeaders });
export async function endpoint(
  request: Request,
  action: (adminId: string) => Promise<Response>,
  admin = false,
) {
  try {
    const actor = admin
      ? await requireAdminPermission("manage_terms_commissions")
      : null;
    if (admin && !actor) throw new AgreementError("forbidden", 403);
    if (
      !["GET", "HEAD"].includes(request.method) &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      throw new AgreementError("forbidden", 403);
    return await action(actor?.id ?? "");
  } catch (error) {
    if (error instanceof AgreementError)
      return json({ ok: false, error: error.code }, error.status);
    console.error("[provider-agreement] request failed", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
export async function readJson(
  request: Request,
  limit = 400000,
): Promise<Record<string, unknown>> {
  const bytes = await readBody(request, limit);
  try {
    const data = JSON.parse(bytes.toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new AgreementError("invalid_input");
  }
}
export async function readBody(
  request: Request,
  limit: number,
): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AgreementError("request_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AgreementError("invalid_input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new AgreementError("request_too_large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
