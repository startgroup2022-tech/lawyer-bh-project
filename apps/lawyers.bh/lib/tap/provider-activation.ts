export type ConfirmedProviderStatus = {
  retailerId: string;
  destinationId: string;
  environment: "test" | "live";
  payoutEnabled: boolean;
};

export type TapProviderActivationNotification = {
  retailerId?: string;
  destinationId?: string;
  payoutEnabled?: boolean;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function parseTapProviderNotification(
  body: unknown,
): TapProviderActivationNotification {
  const root = record(body);
  const retailer = record(root.retailer);
  const retailerStatus = record(retailer.status);
  const retailerId = text(retailer.id) || text(root.retailer_id) || text(root.retailerId);
  const destinationId = text(root.destination_id) || text(root.destinationId) || retailerId;

  if (!retailerId && !destinationId) {
    throw new Error("Tap retailer identifier is missing");
  }

  return {
    retailerId: retailerId || destinationId,
    destinationId,
    payoutEnabled: retailerStatus.payout === true || root.payout_enabled === true,
  };
}

export async function syncTapProviderActivation<TResult>(
  deps: {
    environment: "test" | "live";
    tapClient: {
      retrieveDestination(id: string): Promise<{ id: string; status: string }>;
    };
    repository: {
      applyConfirmedStatus(input: ConfirmedProviderStatus): Promise<TResult>;
    };
  },
  notification: TapProviderActivationNotification,
): Promise<TResult> {
  const retailerId = notification.retailerId?.trim() ?? "";
  const destinationId = notification.destinationId?.trim() || retailerId;

  if (!retailerId && !destinationId) {
    throw new Error("Tap retailer identifier is missing");
  }

  const destination = await deps.tapClient.retrieveDestination(destinationId);
  const confirmedId = destination.id?.trim();

  if (!confirmedId || confirmedId !== destinationId) {
    throw new Error("Tap destination identity mismatch");
  }

  return deps.repository.applyConfirmedStatus({
    retailerId: retailerId || confirmedId,
    destinationId: confirmedId,
    environment: deps.environment,
    payoutEnabled: destination.status.trim().toLowerCase() === "active",
  });
}
