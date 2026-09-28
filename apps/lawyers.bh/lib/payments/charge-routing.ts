import type { BookingAllocationMode } from "./allocation-policy";
import { getBookingAllocationMode } from "./allocation-policy";

export type ChargeRecipient = {
  mode: "platform" | "provider";
  destinationId: string | null;
  allocationMode: BookingAllocationMode;
};

export function getChargeRecipient(input: {
  assignmentMode: string | null | undefined;
  providerId: string | null | undefined;
  payoutReady: boolean;
  destinationId: string | null | undefined;
}): ChargeRecipient {
  const allocationMode = getBookingAllocationMode(input);

  if (allocationMode === "provider") {
    const destinationId = input.destinationId?.trim();
    if (!destinationId) {
      throw new Error("A payout-ready provider must have a Tap destination");
    }

    return { mode: "provider", destinationId, allocationMode };
  }

  return { mode: "platform", destinationId: null, allocationMode };
}
