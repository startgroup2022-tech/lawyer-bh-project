import { verifyMobileRequestAccessToken } from "./mobile-request-access";

export type MobilePaymentCancellationRow = {
  bookingId: string;
  paymentStatus: string;
  serviceStatus: string;
  tapStatus: string | null;
  requestAccessDigest: string | null;
  locale?: "ar" | "en" | "tr";
};

export type MobilePaymentCancellationDependencies = {
  findBooking(bookingId: string): Promise<MobilePaymentCancellationRow | null>;
  cancelBooking(bookingId: string): Promise<MobilePaymentCancellationRow>;
};

export type MobilePaymentCancellationResult = {
  status: number;
  body: Record<string, unknown>;
  cancelledNow: boolean;
  notificationLocale?: "ar" | "en" | "tr";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(row: MobilePaymentCancellationRow) {
  return {
    ok: true,
    bookingId: row.bookingId,
    paymentStatus: row.paymentStatus,
    serviceStatus: row.serviceStatus,
    tapStatus: row.tapStatus,
  };
}

export async function cancelMobilePaymentRequest(
  bookingId: string,
  requestAccessToken: string,
  dependencies: MobilePaymentCancellationDependencies,
): Promise<MobilePaymentCancellationResult> {
  if (!UUID_PATTERN.test(bookingId)) {
    return { status: 400, body: { ok: false, error: "Invalid bookingId" }, cancelledNow: false };
  }

  const row = await dependencies.findBooking(bookingId);

  if (!row) {
    return { status: 404, body: { ok: false, error: "Booking was not found" }, cancelledNow: false };
  }

  if (
    !row.requestAccessDigest ||
    !verifyMobileRequestAccessToken(requestAccessToken, row.requestAccessDigest)
  ) {
    return { status: 403, body: { ok: false, error: "Request access denied" }, cancelledNow: false };
  }

  if (row.paymentStatus === "success" && row.tapStatus === "CAPTURED") {
    return {
      status: 409,
      body: { ok: false, error: "A captured request cannot be cancelled" },
      cancelledNow: false,
    };
  }

  if (row.serviceStatus === "cancelled") {
    return { status: 200, body: response(row), cancelledNow: false };
  }

  const cancelled = await dependencies.cancelBooking(bookingId);
  return {
    status: 200,
    body: response(cancelled),
    cancelledNow: true,
    notificationLocale: cancelled.locale,
  };
}
