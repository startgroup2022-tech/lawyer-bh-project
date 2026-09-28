export function providerBalanceDocumentActions(status: string, tapStatus?: string | null) {
  return {
    invoice: true,
    receipt: status === "paid" && tapStatus?.toUpperCase() === "CAPTURED",
  };
}
