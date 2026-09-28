import { ApiError } from "../auth/contracts";
import { handle, jsonBody } from "../auth/http";
import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { propertyManagementRepository } from "./repository";
import { createPropertyManagementService, type Resource } from "./service";
const service = createPropertyManagementService(propertyManagementRepository);
const propertyIdOf = (request: Request) => { const value = new URL(request.url).searchParams.get("propertyId")?.trim(); if (!value) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required"); return value; };
export const collectionHandlers = (resource: Resource) => ({
  GET: (request: Request) => handle(async () => { const principal = await requireSarayaPrincipal(request, sessions()); const url = new URL(request.url); const result = await service.list(principal, resource, propertyIdOf(request), { cursor: url.searchParams.get("cursor") ?? undefined, limit: Number(url.searchParams.get("limit") || 25), search: url.searchParams.get("search") ?? undefined, status: url.searchParams.get("status") ?? undefined, role: url.searchParams.get("role") ?? undefined }); return Response.json(result); }),
  POST: (request: Request) => handle(async () => { const principal = await requireSarayaPrincipal(request, sessions()); const result = await service.create(principal, resource, resource === "properties" ? "" : propertyIdOf(request), await jsonBody(request)); return Response.json(result, { status: 201 }); }),
});
export const itemHandlers = (resource: Resource) => ({
  GET: (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => { const principal = await requireSarayaPrincipal(request, sessions()); return Response.json(await service.get(principal, resource, propertyIdOf(request), (await context.params).id)); }),
  PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => { const principal = await requireSarayaPrincipal(request, sessions()); return Response.json(await service.update(principal, resource, propertyIdOf(request), (await context.params).id, await jsonBody(request))); }),
  DELETE: (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => { const principal = await requireSarayaPrincipal(request, sessions()); await service.remove(principal, resource, propertyIdOf(request), (await context.params).id); return new Response(null, { status: 204 }); }),
});
