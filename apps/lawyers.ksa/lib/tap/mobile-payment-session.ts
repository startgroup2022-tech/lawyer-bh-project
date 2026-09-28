import {
  assertTapTestConfiguration,
  parseMobilePaymentRequest,
  type MobilePaymentRequest,
  type TapTestConfiguration,
} from "./mobile-payment-contract";

export type MobileEmergencyCase = {
  id: string;
  slug: string;
  name: string;
  amount: number;
  currency: string;
};

export type StoredMobilePaymentSession = {
  bookingId: string;
  idempotencyKey: string;
  orderReference: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  tapStatus: string | null;
  chargeId: string | null;
  transactionUrl: string | null;
};

export type CreateMobileBookingInput = {
  request: MobilePaymentRequest;
  emergencyCase: MobileEmergencyCase;
  idempotencyKey: string;
  amount: number;
  currency: string;
};

export type CreateMobileTapChargeInput = {
  amount: number;
  currency: string;
  description: string;
  reference: { transaction: string; order: string };
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phoneCountryCode: string;
    phone: string;
  };
  merchantId: string;
  redirectUrl: string;
  postUrl: string;
  metadata: {
    paymentFlow: "mobile_emergency";
    bookingId: string;
    countryCode: "SA";
    emergencyCaseId: string;
  };
};

export type MobilePaymentSessionDependencies = {
  tapConfiguration: TapTestConfiguration;
  siteUrl: string;
  findEmergencyCase(
    countryCode: string,
    caseId: string,
  ): Promise<MobileEmergencyCase | null>;
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredMobilePaymentSession | null>;
  createBooking(
    input: CreateMobileBookingInput,
  ): Promise<StoredMobilePaymentSession>;
  createTapCharge(input: CreateMobileTapChargeInput): Promise<{
    id: string;
    status: string;
    transactionUrl: string;
  }>;
  attachCharge(input: {
    bookingId: string;
    chargeId: string;
    tapStatus: string;
    transactionUrl: string;
  }): Promise<StoredMobilePaymentSession>;
  markFailed(input: { bookingId: string; reason: string }): Promise<void>;
};

export type MobilePaymentSessionResult = {
  status: number;
  body: Record<string, unknown>;
};

function publicSession(
  session: StoredMobilePaymentSession,
): MobilePaymentSessionResult {
  return {
    status: 200,
    body: {
      ok: true,
      bookingId: session.bookingId,
      chargeId: session.chargeId,
      transactionUrl: session.transactionUrl,
      status: "pending_payment",
      amount: session.amount.toFixed(2),
      currency: session.currency,
    },
  };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "Customer",
    lastName: parts.slice(1).join(" ") || parts[0] || "Customer",
  };
}

export async function createMobilePaymentSession(
  input: unknown,
  dependencies: MobilePaymentSessionDependencies,
): Promise<MobilePaymentSessionResult> {
  const parsed = parseMobilePaymentRequest(input);

  if (!parsed.ok) {
    return { status: 400, body: { ok: false, error: parsed.error } };
  }

  try {
    assertTapTestConfiguration(dependencies.tapConfiguration);
  } catch {
    return {
      status: 500,
      body: { ok: false, error: "Tap test payments are unavailable" },
    };
  }

  const existing = await dependencies.findByIdempotencyKey(
    parsed.value.idempotencyKey,
  );

  if (existing?.chargeId && existing.transactionUrl) {
    return publicSession(existing);
  }

  const emergencyCase = await dependencies.findEmergencyCase(
    parsed.value.countryCode,
    parsed.value.emergencyCaseId,
  );

  if (!emergencyCase) {
    return {
      status: 404,
      body: { ok: false, error: "Emergency case is unavailable" },
    };
  }

  const amount = Number(emergencyCase.amount);
  const currency = emergencyCase.currency.trim().toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0 || currency.length !== 3) {
    return {
      status: 500,
      body: { ok: false, error: "Emergency case price is unavailable" },
    };
  }

  const booking =
    existing ??
    (await dependencies.createBooking({
      request: parsed.value,
      emergencyCase,
      idempotencyKey: parsed.value.idempotencyKey,
      amount,
      currency,
    }));

  if (booking.chargeId && booking.transactionUrl) {
    return publicSession(booking);
  }

  const names = splitName(parsed.value.customer.name);

  try {
    const charge = await dependencies.createTapCharge({
      amount,
      currency,
      description: emergencyCase.name,
      reference: {
        transaction: booking.orderReference,
        order: booking.orderReference,
      },
      customer: {
        ...names,
        email: parsed.value.customer.email,
        phoneCountryCode: parsed.value.customer.phoneCountryCode,
        phone: parsed.value.customer.phone,
      },
      merchantId: dependencies.tapConfiguration.merchantId,
      redirectUrl: `${dependencies.siteUrl}/api/tap/redirect?bookingId=${encodeURIComponent(booking.bookingId)}`,
      postUrl: `${dependencies.siteUrl}/api/tap/webhook`,
      metadata: {
        paymentFlow: "mobile_emergency",
        bookingId: booking.bookingId,
        countryCode: "SA",
        emergencyCaseId: emergencyCase.id,
      },
    });

    if (
      !charge.id.startsWith("chg_") ||
      !charge.transactionUrl.startsWith("https://")
    ) {
      throw new Error("Tap returned an invalid hosted payment session");
    }

    const attached = await dependencies.attachCharge({
      bookingId: booking.bookingId,
      chargeId: charge.id,
      tapStatus: charge.status,
      transactionUrl: charge.transactionUrl,
    });

    return publicSession(attached);
  } catch (error) {
    await dependencies.markFailed({
      bookingId: booking.bookingId,
      reason: error instanceof Error ? error.message : "Tap charge failed",
    });

    return {
      status: 502,
      body: {
        ok: false,
        error: "Tap could not create the payment session",
        bookingId: booking.bookingId,
      },
    };
  }
}
