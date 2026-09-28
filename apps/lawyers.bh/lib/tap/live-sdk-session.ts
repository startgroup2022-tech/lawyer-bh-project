import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type TapLiveSdkConfiguration = {
  publicKey: string;
  secretKey: string;
  merchantId: string;
  postUrl: string;
  accessToken: string;
};

const AMOUNT = 0.1;
const FORMATTED_AMOUNT = "0.10";
const DISPLAY_AMOUNT = "0.100";
const CURRENCY = "BHD";

function requireLiveConfiguration(
  configuration: TapLiveSdkConfiguration,
): void {
  if (!configuration.publicKey.startsWith("pk_live_")) {
    throw new Error("TAP_MOBILE_LIVE_PUBLIC_KEY must be a pk_live_ key");
  }

  if (!configuration.secretKey.startsWith("sk_live_")) {
    throw new Error("TAP_MOBILE_LIVE_SECRET_KEY must be an sk_live_ key");
  }

  if (!/^\d+$/.test(configuration.merchantId)) {
    throw new Error("TAP_MOBILE_LIVE_MERCHANT_ID must contain digits only");
  }

  if (!configuration.accessToken) {
    throw new Error("TAP_MOBILE_LIVE_SDK_TEST_TOKEN is not configured");
  }

  let postUrl: URL;

  try {
    postUrl = new URL(configuration.postUrl);
  } catch {
    throw new Error("TAP_MOBILE_POST_URL is not a valid URL");
  }

  if (postUrl.protocol !== "https:") {
    throw new Error("TAP_MOBILE_POST_URL must use HTTPS");
  }
}

export function authorizeLiveSdkTest(
  suppliedToken: string,
  configuration: TapLiveSdkConfiguration,
): boolean {
  if (!suppliedToken || !configuration.accessToken) {
    return false;
  }

  const supplied = Buffer.from(suppliedToken, "utf8");
  const expected = Buffer.from(configuration.accessToken, "utf8");

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createTapLiveSdkSession(
  configuration: TapLiveSdkConfiguration,
  createReference: () => string = () =>
    `LSOS-SDK-LIVE-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
) {
  requireLiveConfiguration(configuration);

  const orderReference = createReference();
  const valueToHash =
    `x_publickey${configuration.publicKey}` +
    `x_amount${FORMATTED_AMOUNT}` +
    `x_currency${CURRENCY}` +
    `x_transaction${orderReference}` +
    `x_post${configuration.postUrl}`;

  const hashString = createHmac("sha256", configuration.secretKey)
    .update(valueToHash, "utf8")
    .digest("hex");

  return {
    ok: true as const,
    purpose: "tap_checkout_flutter_live_test" as const,
    orderReference,
    amount: AMOUNT,
    formattedAmount: FORMATTED_AMOUNT,
    displayAmount: DISPLAY_AMOUNT,
    currency: CURRENCY,
    tap: {
      publicKey: configuration.publicKey,
      merchantId: configuration.merchantId,
      mode: "live" as const,
      hashString,
      postUrl: configuration.postUrl,
    },
  };
}
