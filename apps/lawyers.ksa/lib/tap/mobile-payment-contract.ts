export type MobilePaymentCustomer = {
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
};

export type MobilePaymentRequest = {
  countryCode: "SA";
  emergencyCaseId: string;
  customer: MobilePaymentCustomer;
  locale: "ar" | "en";
  idempotencyKey: string;
};

export type MobilePaymentState =
  | "pending_payment"
  | "paid"
  | "failed"
  | "cancelled";

export type TapTestConfiguration = {
  secretKey: string;
  publicKey: string;
  merchantId: string;
};

export type MobilePaymentRowState = {
  paymentStatus?: string | null;
  tapStatus?: string | null;
};

export type MobilePaymentParseResult =
  | { ok: true; value: MobilePaymentRequest }
  | { ok: false; error: "Invalid mobile payment request" };

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGITS_PATTERN = /^\d+$/;

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function parseMobilePaymentRequest(
  input: unknown,
): MobilePaymentParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid mobile payment request" };
  }

  const data = input as Record<string, unknown>;
  const customerValue = data.customer;

  if (
    !customerValue ||
    typeof customerValue !== "object" ||
    Array.isArray(customerValue)
  ) {
    return { ok: false, error: "Invalid mobile payment request" };
  }

  const customerData = customerValue as Record<string, unknown>;
  const countryCode = cleanText(data.countryCode, 2).toUpperCase();
  const emergencyCaseId = cleanText(data.emergencyCaseId, 100);
  const locale = cleanText(data.locale, 2).toLowerCase();
  const idempotencyKey = cleanText(data.idempotencyKey, 64);
  const customer: MobilePaymentCustomer = {
    name: cleanText(customerData.name, 120),
    email: cleanText(customerData.email, 120).toLowerCase(),
    phoneCountryCode: cleanText(customerData.phoneCountryCode, 6),
    phone: cleanText(customerData.phone, 20),
  };

  const valid =
    countryCode === "SA" &&
    emergencyCaseId.length > 0 &&
    (locale === "ar" || locale === "en") &&
    UUID_PATTERN.test(idempotencyKey) &&
    customer.name.length > 0 &&
    EMAIL_PATTERN.test(customer.email) &&
    DIGITS_PATTERN.test(customer.phoneCountryCode) &&
    DIGITS_PATTERN.test(customer.phone);

  if (!valid) {
    return { ok: false, error: "Invalid mobile payment request" };
  }

  return {
    ok: true,
    value: {
      countryCode: "SA",
      emergencyCaseId,
      customer,
      locale: locale as "ar" | "en",
      idempotencyKey,
    },
  };
}

export function assertTapTestConfiguration(
  input: TapTestConfiguration,
): TapTestConfiguration {
  const config = {
    secretKey: input.secretKey.trim(),
    publicKey: input.publicKey.trim(),
    merchantId: input.merchantId.trim(),
  };

  if (
    !config.secretKey.startsWith("sk_test_") ||
    !config.publicKey.startsWith("pk_test_") ||
    !config.merchantId
  ) {
    throw new Error("Tap test credentials are required");
  }

  return config;
}

export function toMobilePaymentStatus(
  row: MobilePaymentRowState,
): MobilePaymentState {
  const paymentStatus = cleanText(row.paymentStatus, 40).toLowerCase();
  const tapStatus = cleanText(row.tapStatus, 40).toUpperCase();

  if (paymentStatus === "paid" && tapStatus === "CAPTURED") {
    return "paid";
  }

  if (tapStatus === "CANCELLED") {
    return "cancelled";
  }

  if (
    paymentStatus === "failed" ||
    tapStatus === "DECLINED" ||
    tapStatus === "FAILED" ||
    tapStatus === "ABANDONED"
  ) {
    return "failed";
  }

  return "pending_payment";
}
