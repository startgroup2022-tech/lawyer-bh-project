import "server-only";
import type { TapClient } from "@/lib/tap/client";
import { createTapClient, TapApiError } from "@/lib/tap/client";
import { getTapConfig, type TapConfig } from "@/lib/tap/config";
import type { CheckoutContext, VerifiedTapCharge } from "./contracts";
import type { SarayaPaymentGateway } from "./service";
import { formatBhdMills, parseBhdMills } from "./bhd";

type MinimalTapClient = Pick<TapClient, "createCharge" | "retrieveCharge">;

export class TapChargeCreationError extends Error {
  constructor(public readonly ambiguous: boolean) { super("TAP_CHARGE_CREATION_FAILED"); }
}

function threeDecimals(value: unknown): string {
  return formatBhdMills(parseBhdMills(value));
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function createSarayaTapGateway(dependencies?: { config: TapConfig; client: MinimalTapClient }): SarayaPaymentGateway {
  const config = dependencies?.config ?? getTapConfig();
  const client = dependencies?.client ?? createTapClient(config);
  return {
    async createCharge(input: CheckoutContext & { attemptId: string; returnMode?: "web" | "native" }) {
      const phoneDigits = input.customer.phone?.replace(/^\+/, "") ?? "";
      let response: Awaited<ReturnType<MinimalTapClient["createCharge"]>>;
      try {
        response = await client.createCharge({
          amount: Number(parseBhdMills(input.amount)) / 1000,
          currency: "BHD",
          customer: {
            first_name: input.customer.name,
            email: input.customer.email ?? undefined,
            phone: phoneDigits ? { country_code: "973", number: phoneDigits.replace(/^973/, "") } : undefined,
          },
          source: { id: "src_all" },
          reference: { order: input.demandId, idempotent: input.attemptId },
          redirect: { url: input.returnMode === "native"
            ? `${config.siteUrl}/saraya/rental-requests/${input.requestId}`
            : `${config.siteUrl}/saraya/#/rental-requests/${input.requestId}` },
          post: { url: `${config.siteUrl}/api/saraya/v1/payments/tap/webhook` },
          metadata: {
            rental_request_id: input.requestId,
            tenant_user_id: input.tenantUserId,
          },
        });
      } catch (error) {
        const definitiveClientRejection = error instanceof TapApiError
          && error.status >= 400
          && error.status < 500
          && ![408, 409, 425, 429].includes(error.status);
        throw new TapChargeCreationError(!definitiveClientRejection);
      }
      const paymentUrl = object(response.transaction).url;
      if (typeof paymentUrl !== "string" || !paymentUrl.startsWith("https://")) {
        throw new Error("TAP_CHECKOUT_URL_MISSING");
      }
      return { id: response.id, paymentUrl };
    },

    async retrieveCharge(chargeId: string): Promise<VerifiedTapCharge> {
      const response = await client.retrieveCharge(chargeId);
      const reference = object(response.reference);
      const metadata = object(response.metadata);
      return {
        id: response.id,
        status: response.status,
        amount: threeDecimals(response.amount),
        currency: typeof response.currency === "string" ? response.currency : "",
        reference: { order: typeof reference.order === "string" ? reference.order : undefined },
        metadata: {
          rental_request_id: typeof metadata.rental_request_id === "string" ? metadata.rental_request_id : undefined,
          tenant_user_id: typeof metadata.tenant_user_id === "string" ? metadata.tenant_user_id : undefined,
        },
      };
    },
  };
}

export function sarayaTapGateway() {
  return createSarayaTapGateway();
}
