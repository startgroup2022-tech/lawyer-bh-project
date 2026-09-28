import { ApiError } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import type { DocumentUpdate } from "./service";
import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { documentRepository } from "./repository";
import { createDocumentService } from "./service";
import { documentStorage } from "./storage";
import { readDocumentUpload } from "./upload-form";

const service = createDocumentService(documentRepository, documentStorage);

export const listDocuments = (request: Request) => handle(async () => {
  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  }
  const principal = await requireSarayaPrincipal(request, sessions());
  return Response.json({ items: await service.list(principal, propertyId) });
});

export const createDocument = (request: Request) => handle(async () => {
  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  }
  const principal = await requireSarayaPrincipal(request, sessions());
  const created = await service.create(principal, propertyId, await readDocumentUpload(request));
  return Response.json(created, { status: 201 });
});

export const updateDocument = (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => {
  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!propertyId) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  const body = await jsonBody(request);
  const expiresOn = body.expiresOn;
  if (expiresOn !== undefined && expiresOn !== null && typeof expiresOn !== "string") {
    throw new ApiError(422, "VALIDATION_ERROR", "تاريخ الانتهاء غير صحيح", "Expiry date is invalid");
  }
  const principal = await requireSarayaPrincipal(request, sessions());
  return Response.json(await service.update(principal, propertyId, (await context.params).id, {
    title: text(body, "title"),
    category: text(body, "category") as DocumentUpdate["category"],
    status: text(body, "status") as DocumentUpdate["status"],
    expiresOn: typeof expiresOn === "string" && expiresOn.trim() ? expiresOn.trim() : null,
  }));
});
