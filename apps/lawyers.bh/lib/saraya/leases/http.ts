import { ApiError } from "../auth/contracts";
import { handle, jsonBody, optionalJsonBody } from "../auth/http";
import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import type { LeaseCommand, LeaseTerms } from "./contracts";
import { LeaseError } from "./contracts";
import { leaseRepository } from "./repository";
import { createLeaseService } from "./service";
import { leaseListRepository } from "./list-repository";
import { createLeaseListService } from "./list-service";

const service = createLeaseService(leaseRepository);
const listService = createLeaseListService(leaseListRepository);
const propertyIdOf = (request: Request) => {
  const value = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!value) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  return value;
};
export const listLeases = (request: Request) => handle(async () => {
  const principal = await requireSarayaPrincipal(request, sessions());
  return Response.json({
    items: await listService.list(principal, propertyIdOf(request)),
  });
});
const leaseError = (error: unknown) => {
  if (error instanceof LeaseError) throw new ApiError(error.status, error.code, "تعذر تنفيذ إجراء العقد", "Lease action could not be completed");
  throw error;
};
const termsOf = (body: Record<string, unknown>): LeaseTerms => {
  const terms = body.terms;
  if (!terms || typeof terms !== "object" || Array.isArray(terms)) throw new LeaseError("LEASE_TERMS_REQUIRED");
  return terms as LeaseTerms;
};
export const leaseCommandHandler = (build: (body: Record<string, unknown>) => LeaseCommand, bodyRequired = false) =>
  (request: Request, context: { params: Promise<{ id: string }> }) => handle(async () => {
    try {
      const principal = await requireSarayaPrincipal(request, sessions());
      const body = bodyRequired ? await jsonBody(request) : await optionalJsonBody(request);
      const result = await service.command(principal, propertyIdOf(request), (await context.params).id, build(body));
      return Response.json(result);
    } catch (error) { return leaseError(error); }
  });
export const approveLease = leaseCommandHandler(() => ({ type: "approve" }));
export const requestRenewal = leaseCommandHandler(() => ({ type: "request_renewal" }));
export const decideRenewal = leaseCommandHandler((body) => {
  if (body.decision === "approve") return { type: "approve_renewal", terms: termsOf(body) };
  if (body.decision === "reject") return { type: "reject_renewal" };
  throw new LeaseError("INVALID_RENEWAL_DECISION");
}, true);
export const terminateLease = leaseCommandHandler((body) => ({ type: "terminate", ...(typeof body.reason === "string" && body.reason.trim() ? { reason: body.reason.trim() } : {}) }));
export const closeLease = leaseCommandHandler(() => ({ type: "close" }));
