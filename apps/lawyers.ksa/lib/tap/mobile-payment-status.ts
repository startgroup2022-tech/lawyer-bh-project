import { toMobilePaymentStatus } from "./mobile-payment-contract";

export type MobilePaymentStatusRow = {
  bookingId: string;
  amount: number;
  currency: string;
  orderReference: string;
  paymentStatus: string;
  tapStatus: string | null;
  chargeId: string | null;
  invoiceNumber: string | null;
};

export type RetrievedTapCharge = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference?: { order?: string };
};

export type MobilePaymentStatusDependencies = {
  findBooking(bookingId: string): Promise<MobilePaymentStatusRow | null>;
  retrieveCharge(chargeId: string): Promise<RetrievedTapCharge>;
  markPaid(input: {
    bookingId: string;
    tapStatus: "CAPTURED";
    invoiceNumber: string;
  }): Promise<MobilePaymentStatusRow>;
  markTerminal(input: {
    bookingId: string;
    paymentStatus: "failed" | "cancelled";
    tapStatus: string;
  }): Promise<MobilePaymentStatusRow>;
};

export type MobilePaymentStatusResult = {
  status: number;
  body: Record<string, unknown>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sameAmount(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0005;
}

export function tapChargeMatchesBooking(
  charge: RetrievedTapCharge,
  booking: Pick<
    MobilePaymentStatusRow,
    "chargeId" | "orderReference" | "amount" | "currency"
  >,
): boolean {
  return (
    charge.id === booking.chargeId &&
    charge.reference?.order === booking.orderReference &&
    sameAmount(Number(charge.amount), booking.amount) &&
    charge.currency.trim().toUpperCase() ===
      booking.currency.trim().toUpperCase()
  );
}

function publicStatus(row: MobilePaymentStatusRow): MobilePaymentStatusResult {
  const state = toMobilePaymentStatus({
    paymentStatus: row.paymentStatus,
    tapStatus: row.tapStatus,
  });

  return {
    status: 200,
    body: {
      ok: true,
      bookingId: row.bookingId,
      status: state,
      tapStatus: row.tapStatus,
      chargeId: row.chargeId,
      invoiceNumber: row.invoiceNumber,
      amount: row.amount.toFixed(2),
      currency: row.currency,
    },
  };
}

export async function getMobilePaymentStatus(
  bookingId: string,
  dependencies: MobilePaymentStatusDependencies,
): Promise<MobilePaymentStatusResult> {
  if (!UUID_PATTERN.test(bookingId)) {
    return {
      status: 400,
      body: { ok: false, error: "Invalid bookingId" },
    };
  }

  let row = await dependencies.findBooking(bookingId);

  if (!row) {
    return {
      status: 404,
      body: { ok: false, error: "Mobile payment booking was not found" },
    };
  }

  const storedState = toMobilePaymentStatus({
    paymentStatus: row.paymentStatus,
    tapStatus: row.tapStatus,
  });

  if (storedState !== "pending_payment" || !row.chargeId) {
    return publicStatus(row);
  }

  let charge: RetrievedTapCharge;

  try {
    charge = await dependencies.retrieveCharge(row.chargeId);
  } catch {
    return publicStatus(row);
  }

  const matches = tapChargeMatchesBooking(charge, row);

  if (!matches) {
    return {
      status: 409,
      body: { ok: false, error: "Tap charge does not match the booking" },
    };
  }

  const tapStatus = charge.status.trim().toUpperCase();

  if (tapStatus === "CAPTURED") {
    row = await dependencies.markPaid({
      bookingId: row.bookingId,
      tapStatus: "CAPTURED",
      invoiceNumber: charge.id,
    });
  } else if (tapStatus === "CANCELLED") {
    row = await dependencies.markTerminal({
      bookingId: row.bookingId,
      paymentStatus: "cancelled",
      tapStatus,
    });
  } else if (
    tapStatus === "DECLINED" ||
    tapStatus === "FAILED" ||
    tapStatus === "ABANDONED"
  ) {
    row = await dependencies.markTerminal({
      bookingId: row.bookingId,
      paymentStatus: "failed",
      tapStatus,
    });
  }

  return publicStatus(row);
}
