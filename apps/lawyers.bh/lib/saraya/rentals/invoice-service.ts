import { permissionsForRole } from "../access/authorize";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";

export interface InvoiceListScope { propertyId?: string; ownerId?: string; tenantUserId?: string }
export interface InvoiceCreateInput {
  propertyId: string;
  rentalRequestId: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "due";
}
export interface InvoiceCreateRecord extends InvoiceCreateInput {
  id: string;
  actorUserId: string;
  number: string;
  currency: "BHD";
}
export interface InvoiceRepository {
  list(scope: InvoiceListScope): Promise<unknown[]>;
  listTargets(propertyId: string): Promise<unknown[]>;
  create(input: InvoiceCreateRecord): Promise<unknown>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;

function invalid(field: string) {
  throw new ApiError(422, "INVALID_INVOICE", "بيانات الفاتورة غير صحيحة", "Invalid invoice", { [field]: ["invalid"] });
}

function writableMembership(principal: SarayaPrincipal, propertyId: string) {
  const membership = principal.memberships.find((item) => item.propertyId === propertyId);
  if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
  if (!permissionsForRole(membership.role).includes("billing:write")) {
    throw new ApiError(403, "PERMISSION_DENIED", "ليست لديك صلاحية إنشاء الفواتير", "Invoice creation denied");
  }
}

function normalizedAmount(value: string) {
  const trimmed = value.trim();
  if (!amountPattern.test(trimmed)) invalid("amount");
  const [whole, fraction = ""] = trimmed.split(".");
  const normalized = `${whole}.${fraction.padEnd(3, "0")}`;
  if (BigInt(whole) === BigInt(0) && Number(fraction.padEnd(3, "0")) === 0) invalid("amount");
  return normalized;
}

export function createInvoiceService(repository: InvoiceRepository, createId: () => string = crypto.randomUUID) {
  return {
    async list(principal: SarayaPrincipal, propertyId?: string) {
      if (!propertyId) return repository.list({ tenantUserId: principal.userId });
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      if (membership.role === "tenant") return repository.list({ propertyId, tenantUserId: principal.userId });
      if (!permissionsForRole(membership.role).includes("billing:read")) {
        throw new ApiError(403, "PERMISSION_DENIED", "ليست لديك صلاحية عرض الفواتير", "Invoice access denied");
      }
      return repository.list({ propertyId, ...(membership.role === "owner" && membership.ownerId ? { ownerId: membership.ownerId } : {}) });
    },
    async listTargets(principal: SarayaPrincipal, propertyId: string) {
      if (!uuidPattern.test(propertyId)) invalid("propertyId");
      writableMembership(principal, propertyId);
      return repository.listTargets(propertyId);
    },
    async create(principal: SarayaPrincipal, input: InvoiceCreateInput) {
      if (!uuidPattern.test(input.propertyId)) invalid("propertyId");
      writableMembership(principal, input.propertyId);
      if (!uuidPattern.test(input.rentalRequestId)) invalid("rentalRequestId");
      const description = input.description.trim();
      if (!description || description.length > 240) invalid("description");
      if (!datePattern.test(input.issueDate) || Number.isNaN(Date.parse(`${input.issueDate}T00:00:00Z`))) invalid("issueDate");
      if (!datePattern.test(input.dueDate) || Number.isNaN(Date.parse(`${input.dueDate}T00:00:00Z`)) || input.dueDate < input.issueDate) invalid("dueDate");
      if (input.status !== "draft" && input.status !== "due") invalid("status");
      const id = createId();
      if (!uuidPattern.test(id)) throw new Error("INVALID_GENERATED_INVOICE_ID");
      return repository.create({
        ...input,
        id,
        actorUserId: principal.userId,
        description,
        amount: normalizedAmount(input.amount),
        number: `INV-${input.issueDate.slice(0, 4)}-${id.slice(0, 8).toUpperCase()}`,
        currency: "BHD",
      });
    },
  };
}
