import { ApiError, type SarayaPrincipal } from "../auth/contracts";

interface LeaseDocumentRecord {
  propertyId: string;
  tenantUserId: string;
  ownerId: string | null;
  storageKey: string;
  originalName: string;
}

export function createLeaseDocumentDownload(dependencies: {
  find(leaseId: string, final: boolean): Promise<LeaseDocumentRecord | null>;
  read(storageKey: string): Promise<Uint8Array>;
}) {
  return async (principal: SarayaPrincipal, leaseId: string, final: boolean) => {
    const lease = await dependencies.find(leaseId, final);
    const membership = lease && principal.memberships.find((item) => item.propertyId === lease.propertyId);
    const allowed = lease && (principal.userId === lease.tenantUserId
      || membership?.role === "super_admin"
      || membership?.role === "property_manager"
      || (membership?.role === "owner" && membership.ownerId === lease.ownerId));
    if (!allowed || !lease) throw new ApiError(404, "LEASE_DOCUMENT_NOT_FOUND", "مستند العقد غير موجود", "Lease document not found");
    return { bytes: await dependencies.read(lease.storageKey), contentType: "application/pdf", fileName: lease.originalName };
  };
}
