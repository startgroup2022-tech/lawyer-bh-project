type PaymentState = {
  paymentStatus: string | null;
  tapStatus: string | null;
};

export function isServerConfirmedPaid(state: PaymentState): boolean {
  return state.paymentStatus === "success" && state.tapStatus === "CAPTURED";
}

export function canLawyerAccessRealRequest(
  state: PaymentState & { isReviewAccount: boolean },
): boolean {
  return !state.isReviewAccount && isServerConfirmedPaid(state);
}
