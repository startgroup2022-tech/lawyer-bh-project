import "server-only";

export type TapConfig = {
  secretKey: string;
  publicKey: string;
  merchantId: string;
  marketplaceMid: string;
  mode: "test" | "live";
  siteUrl: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getTapSecretKey(): string {
  return required("TAP_SECRET_KEY");
}

export function getTapMode(): "test" | "live" {
  return getTapSecretKey().startsWith("sk_live_") ? "live" : "test";
}

export function getTapConfig(): TapConfig {
  const secretKey = getTapSecretKey();

  return {
    secretKey,
    publicKey: required("NEXT_PUBLIC_TAP_PUBLIC_KEY"),
    merchantId: required("TAP_MERCHANT_ID"),
    marketplaceMid: required("TAP_MARKETPLACE_MID"),
    mode: getTapMode(),
    siteUrl: required("NEXT_PUBLIC_SITE_URL").replace(/\/$/, ""),
  };
}
