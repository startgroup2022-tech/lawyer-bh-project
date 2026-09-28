import { ApiError } from "../auth/contracts";
import { handle } from "../auth/http";
import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { requestIp } from "../auth/security";
import { leaseDocument } from "./document-service";
import { createGetLeaseDocumentRoute } from "./document-http";
import { leaseSignatureService } from "./signature-runtime";

export async function readBoundedJson(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16_384) throw new ApiError(413, "REQUEST_TOO_LARGE", "حجم الطلب كبير", "Request is too large");
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel().catch(() => undefined);
        throw new ApiError(413, "REQUEST_TOO_LARGE", "حجم الطلب كبير", "Request is too large");
      }
      chunks.push(value);
    }
  }
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object required");
    return value as Record<string, unknown>;
  } catch { throw new ApiError(400, "INVALID_JSON", "صيغة الطلب غير صالحة", "Invalid JSON body"); }
}

export const signLeaseRoute = (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => {
  const principal = await requireSarayaPrincipal(request, sessions());
  const body = await readBoundedJson(request);
  const result = await leaseSignatureService.sign(principal, (await context.params).id, {
    acceptedName: typeof body.acceptedName === "string" ? body.acceptedName : "",
    checksum: typeof body.checksum === "string" ? body.checksum : "",
    ip: requestIp(request), userAgent: request.headers.get("user-agent"),
  });
  return Response.json(result);
});

export const getLeaseDocumentRoute = createGetLeaseDocumentRoute({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  download: leaseDocument,
});
