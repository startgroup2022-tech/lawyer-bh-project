export type BookingAllocationMode =
  | "provider"
  | "delayed"
  | "platform_only"
  | "deferred";

type AllocationIdentity = {
  splitMode: string | null | undefined;
  providerId: string | null | undefined;
};

export function getBookingAllocationMode(input: {
  assignmentMode: string | null | undefined;
  providerId: string | null | undefined;
  payoutReady: boolean;
}): BookingAllocationMode {
  if (input.providerId?.trim() && input.payoutReady) return "provider";
  if (input.providerId?.trim()) return "delayed";
  if (input.assignmentMode?.trim().toLowerCase() === "office") {
    return "platform_only";
  }
  return "deferred";
}

export function isPlatformOnlyAllocation(
  input: AllocationIdentity,
): boolean {
  return (
    input.splitMode?.trim().toLowerCase() === "platform_only" &&
    !input.providerId
  );
}

export function requiresProviderPayout(
  input: AllocationIdentity,
): boolean {
  return !isPlatformOnlyAllocation(input) && Boolean(input.providerId);
}
