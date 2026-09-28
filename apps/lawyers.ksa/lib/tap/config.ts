import "server-only";

export type TapConfig = {
  secretKey: string;
  publicKey: string;
  merchantId: string;
  marketplaceMid: string;
  mode: "test" | "live";
  siteUrl: string;
};

function optional(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function required(name: string): string {
  const value = optional(name);

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function isTapEnabled(): boolean {
  const explicit = optional("TAP_ENABLED").toLowerCase();

  if (["false", "0", "off"].includes(explicit)) {
    return false;
  }

  if (["true", "1", "on"].includes(explicit)) {
    return true;
  }

  return Boolean(optional("TAP_SECRET_KEY"));
}

export function getTapSecretKey(): string {
  if (!isTapEnabled()) {
    throw new Error("Tap payments are currently disabled");
  }

  return required("TAP_SECRET_KEY");
}

export function getTapMode(): "test" | "live" {
  if (!isTapEnabled()) {
    return "test";
  }

  const secretKey = optional("TAP_SECRET_KEY");

  if (!secretKey) {
    return "test";
  }

  return secretKey.startsWith("sk_live_") ? "live" : "test";
}

export function getTapConfig(): TapConfig {
  if (!isTapEnabled()) {
    throw new Error("Tap payments are currently disabled");
  }

  const secretKey = required("TAP_SECRET_KEY");

  return {
    secretKey,
    publicKey: required("NEXT_PUBLIC_TAP_PUBLIC_KEY"),
    merchantId: required("TAP_MERCHANT_ID"),
    marketplaceMid: required("TAP_MARKETPLACE_MID"),
    mode: secretKey.startsWith("sk_live_") ? "live" : "test",
    siteUrl: required("NEXT_PUBLIC_SITE_URL").replace(/\/$/, ""),
  };
}