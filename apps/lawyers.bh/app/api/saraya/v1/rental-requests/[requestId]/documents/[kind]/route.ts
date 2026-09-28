import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { readDocumentBytes } from "@/lib/saraya/documents/storage";
import { createRentalRequestDocumentRoute } from "@/lib/saraya/rentals/request-document-http";
import { rentalRequestListRepository } from "@/lib/saraya/rentals/request-list-repository";
import { createRentalRequestListService } from "@/lib/saraya/rentals/request-list-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const service = createRentalRequestListService(rentalRequestListRepository);

export const GET = createRentalRequestDocumentRoute({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  async download(principal, propertyId, requestId, kind) {
    const record = await service.document(principal, propertyId, requestId, kind);
    return { bytes: await readDocumentBytes(record.storageKey), fileName: record.originalName, contentType: record.contentType };
  },
});
