import type { LeaseCommand, LeaseStatus, LeaseTerms, LeaseVersion } from "./contracts";
import { LeaseError } from "./contracts";

const transitions: Record<LeaseStatus, Partial<Record<LeaseCommand["type"], LeaseStatus>>> = {
  draft: { submit: "pending_approval" },
  pending_approval: { approve: "active", reject: "rejected" },
  active: { request_renewal: "renewal_requested", terminate: "terminated" },
  renewal_requested: { approve_renewal: "active", reject_renewal: "active", terminate: "terminated" },
  rejected: {},
  terminated: { close: "closed" },
  closed: {},
};

export function transitionLease(
  current: LeaseStatus,
  command: LeaseCommand,
  context: { now: Date; actorUserId: string; currentVersion?: number },
): { status: LeaseStatus; version?: Readonly<LeaseVersion> } {
  const status = transitions[current][command.type];
  if (!status) throw new LeaseError("LEASE_TRANSITION_DENIED", 409);
  if (command.type !== "approve_renewal") return { status };
  const terms: LeaseTerms = command.terms;
  return {
    status,
    version: Object.freeze({
      version: (context.currentVersion ?? 1) + 1,
      terms: Object.freeze({ ...terms }),
      createdAt: new Date(context.now),
      createdByUserId: context.actorUserId,
    }),
  };
}
