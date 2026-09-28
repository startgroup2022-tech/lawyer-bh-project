export type BhdCurrency = "BHD";

export interface PaymentCustomer {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface CheckoutContext {
  demandId: string;
  requestId: string;
  propertyId: string;
  tenantUserId: string;
  amount: string;
  currency: BhdCurrency;
  customer: PaymentCustomer;
  providerReference?: string | null;
}

export type BeginCheckoutResult =
  | (CheckoutContext & { kind: "create"; commandId: string })
  | {
      kind: "existing";
      demandId: string;
      requestId: string;
      providerReference: string;
      paymentUrl: string;
    };

export interface VerifiedTapCharge {
  id: string;
  status: string;
  amount: string;
  currency: string;
  reference: { order?: string };
  metadata?: { rental_request_id?: string; tenant_user_id?: string };
}

export type OfflineDecision =
  | { type: "approve" }
  | { type: "reject"; failureCode: string };
