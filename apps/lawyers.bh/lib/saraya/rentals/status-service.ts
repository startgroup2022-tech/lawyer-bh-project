import { ApiError, type SarayaPrincipal } from "../auth/contracts";

export interface RentalStatusRow {
  id: string;
  propertyId: string;
  unitId: string;
  tenantUserId: string;
  ownerId: string | null;
  status: string;
  resolvedApprovalMode: string;
  decisionReason?: string | null;
  createdAt: Date | string;
  decidedAt?: Date | string | null;
  paymentDemandId?: string | null;
  paymentStatus?: string | null;
  totalAmount?: string | null;
  currency?: string | null;
  paymentUpdatedAt?: Date | string | null;
  leaseId?: string | null;
  leaseStatus?: string | null;
  leaseChecksum?: string | null;
  draftDocumentAvailable?: boolean | null;
  finalDocumentAvailable?: boolean | null;
  tenantSignedAt?: Date | string | null;
  ownerSignedAt?: Date | string | null;
  finalizedAt?: Date | string | null;
  leaseUpdatedAt?: Date | string | null;
}

export interface RentalStatusRepository {
  find(requestId: string): Promise<RentalStatusRow | null>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const event = (code: string, occurredAt: Date | string, labelAr: string, labelEn: string) => ({ code, occurredAt: new Date(occurredAt).toISOString(), labelAr, labelEn });

export function createRentalStatusService(repository: RentalStatusRepository) {
  return {
    async read(principal: SarayaPrincipal, requestId: string) {
      if (!uuidPattern.test(requestId)) throw notFound();
      const row = await repository.find(requestId.toLowerCase());
      if (!row) throw notFound();
      const membership = principal.memberships.find((item) => item.propertyId === row.propertyId);
      const management = membership && ["super_admin", "property_manager", "accountant"].includes(membership.role);
      const owner = membership?.role === "owner" && membership.ownerId && membership.ownerId === row.ownerId;
      if (principal.userId !== row.tenantUserId && !management && !owner) throw notFound();
      const timeline = [event("submitted", row.createdAt, "تم تقديم الطلب", "Application submitted")];
      if (row.decidedAt && row.status !== "pending_owner_review") {
        timeline.push(event(
          row.status === "rejected" ? "owner_rejected" : row.resolvedApprovalMode === "instant" ? "instant_approved" : "owner_approved",
          row.decidedAt,
          row.status === "rejected" ? "تم رفض الطلب" : "تمت الموافقة على الطلب",
          row.status === "rejected" ? "Application rejected" : "Application approved",
        ));
      }
      if (["paid", "captured"].includes(row.paymentStatus ?? "") && row.paymentUpdatedAt) timeline.push(event("payment_confirmed", row.paymentUpdatedAt, "تم تأكيد الدفع", "Payment confirmed"));
      if (row.tenantSignedAt) timeline.push(event("tenant_signed", row.tenantSignedAt, "وقّع المستأجر", "Tenant signed"));
      if (row.ownerSignedAt) timeline.push(event("owner_signed", row.ownerSignedAt, "وقّع المالك", "Owner signed"));
      const activatedAt = row.finalizedAt ?? row.leaseUpdatedAt;
      if (row.status === "completed" && activatedAt) timeline.push(event("activated", activatedAt, "تم تفعيل العقد", "Lease activated"));
      timeline.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
      return {
        id: row.id,
        requestId: row.id,
        propertyId: row.propertyId,
        unitId: row.unitId,
        status: row.status,
        resolvedApprovalMode: row.resolvedApprovalMode,
        ...(row.decisionReason ? { decisionReason: row.decisionReason } : {}),
        ...(row.paymentDemandId ? { paymentDemandId: row.paymentDemandId } : {}),
        ...(row.paymentStatus ? { paymentStatus: row.paymentStatus } : {}),
        ...(row.totalAmount ? { totalAmount: row.totalAmount } : {}),
        ...(row.currency ? { currency: row.currency } : {}),
        timeline,
        ...(row.leaseId && row.leaseChecksum ? { lease: {
          id: row.leaseId,
          checksum: row.leaseChecksum,
          tenantSigned: Boolean(row.tenantSignedAt),
          ownerSigned: Boolean(row.ownerSignedAt),
          active: row.leaseStatus === "active" || row.status === "completed",
          documentAvailable: Boolean(row.draftDocumentAvailable),
          finalDocumentAvailable: Boolean(row.finalDocumentAvailable),
        } } : {}),
      };
    },
  };
}

function notFound() {
  return new ApiError(404, "RENTAL_REQUEST_NOT_FOUND", "طلب الاستئجار غير موجود", "Rental request not found");
}
