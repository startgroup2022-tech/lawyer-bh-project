import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle } from "../auth/http";
import type { RentalRequestDocumentKind } from "./request-list-service";

export function createRentalRequestDocumentRoute(dependencies: {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  download(principal: SarayaPrincipal, propertyId: string, requestId: string, kind: RentalRequestDocumentKind): Promise<{ bytes: Uint8Array; fileName: string; contentType: string }>;
}) {
  return (request: Request, context: { params: Promise<{ requestId: string; kind: string }> }) => handle(async () => {
    const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
    if (!propertyId) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
    const { requestId, kind } = await context.params;
    if (kind !== "identity" && kind !== "payment-proof") throw new ApiError(422, "INVALID_DOCUMENT_KIND", "نوع المستند غير صالح", "Invalid document kind");
    const file = await dependencies.download(await dependencies.authenticate(request), propertyId, requestId, kind);
    return new Response(Buffer.from(file.bytes), { headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.fileName.replace(/[\r\n"\\]/g, "-")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    } });
  });
}
