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

/*
 * When an administrator saves Tap credentials in the dashboard the values live
 * in the database, not the environment. They are hydrated into this override at
 * startup (and after every save) so the synchronous accessors below keep their
 * contract and every existing caller keeps working unchanged. With no override
 * the environment is the source of truth, exactly as before.
 */
let override: TapConfig | null = null;

export function setTapConfigOverride(next: TapConfig | null): void {
  override = next;
}

export function getTapConfigOverride(): TapConfig | null {
  return override;
}

export function tapSiteUrl(): string {
  return (override?.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

export function getTapSecretKey(): string {
  if (override) return override.secretKey;
  return required("TAP_SECRET_KEY");
}

export function getTapMode(): "test" | "live" {
  if (override) return override.mode;
  return getTapSecretKey().startsWith("sk_live_") ? "live" : "test";
}

export function getTapConfig(): TapConfig {
  if (override) return override;

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
