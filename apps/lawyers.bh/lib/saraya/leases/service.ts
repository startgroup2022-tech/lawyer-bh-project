import { authorize } from "../access/authorize";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type { LeaseCommand, LeaseStatus, LeaseTerms } from "./contracts";
import { LeaseError } from "./contracts";
import { buildRentSchedule } from "./schedule";
import { transitionLease } from "./state-machine";

export interface StoredLease { id: string; propertyId: string; unitId: string; tenantOrganizationId: string; status: LeaseStatus; currentVersion: number; isRentable?: boolean; terms?: LeaseTerms }
export interface LeaseRepository {
  transaction<T>(work: (repository: LeaseRepository) => Promise<T>): Promise<T>;
  getForUpdate(propertyId: string, leaseId: string): Promise<StoredLease | null>;
  hasOverlappingActiveLease(propertyId: string, unitId: string, startDate: string | undefined, endDate: string | undefined, excludingLeaseId: string): Promise<boolean>;
  appendVersionAndTransition(input: { propertyId: string; leaseId: string; expectedVersion: number; previousStatus: LeaseStatus; nextStatus: LeaseStatus; actorUserId: string; command: LeaseCommand; terms?: LeaseTerms; schedule?: ReturnType<typeof buildRentSchedule>; unitStatus?: "occupied" | "vacant" | null }): Promise<unknown>;
}

export function createLeaseService(repository: LeaseRepository, clock: () => Date = () => new Date()) {
  return {
    async command(principal: SarayaPrincipal, propertyId: string, leaseId: string, command: LeaseCommand) {
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      const tenantRenewal = command.type === "request_renewal" && membership.role === "tenant";
      if (!tenantRenewal) authorize(principal, { propertyId, permission: "units:write" });
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leaseId)) throw new LeaseError("INVALID_LEASE_ID");
      return repository.transaction(async (tx) => {
        const lease = await tx.getForUpdate(propertyId, leaseId);
        if (!lease) throw new LeaseError("LEASE_NOT_FOUND", 404);
        if (tenantRenewal) authorize(principal, { propertyId, permission: "tenant:self:read", tenantId: lease.tenantOrganizationId });
        if ((command.type === "approve" || command.type === "approve_renewal") && lease.isRentable === false) {
          throw new LeaseError("UNIT_NOT_RENTABLE", 409);
        }
        const transition = transitionLease(lease.status, command, { now: clock(), actorUserId: principal.userId, currentVersion: lease.currentVersion });
        const terms = transition.version?.terms ?? lease.terms;
        if ((command.type === "approve" || command.type === "approve_renewal") && await tx.hasOverlappingActiveLease(propertyId, lease.unitId, terms?.startDate, terms?.endDate, lease.id)) throw new LeaseError("LEASE_OVERLAP", 409);
        if ((command.type === "approve" || command.type === "approve_renewal") && !terms) throw new LeaseError("LEASE_TERMS_MISSING", 409);
        const schedule = command.type === "approve" || command.type === "approve_renewal" ? buildRentSchedule(terms!) : undefined;
        return tx.appendVersionAndTransition({ propertyId, leaseId, expectedVersion: lease.currentVersion, previousStatus: lease.status, nextStatus: transition.status, actorUserId: principal.userId, command, ...(terms ? { terms } : {}), ...(schedule ? { schedule } : {}), unitStatus: command.type === "approve" || command.type === "approve_renewal" ? "occupied" : command.type === "close" ? "vacant" : null });
      });
    },
  };
}
