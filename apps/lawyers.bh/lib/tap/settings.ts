import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { decryptSecret, encryptSecret, maskSecret } from "./secret-box";

export type TapEnvironment = "test" | "live";

type Credentials = {
  secretKey: string | null;
  publicKey: string | null;
  merchantId: string | null;
  marketplaceMid: string | null;
};

export type TapSettings = {
  activeEnvironment: TapEnvironment;
  liveEnabled: boolean;
  test: Credentials;
  live: Credentials;
  lastTestStatus: "connected" | "failed" | null;
  lastTestAt: Date | null;
  lastTestMessage: string | null;
};

type Row = typeof schema.tapGatewaySettings.$inferSelect;

function asEnvironment(value: string): TapEnvironment {
  return value === "live" ? "live" : "test";
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function fromRow(row: Row): TapSettings {
  return {
    activeEnvironment: asEnvironment(row.activeEnvironment),
    liveEnabled: row.liveEnabled,
    test: {
      secretKey: row.testSecretKeyEncrypted ? decryptSecret(row.testSecretKeyEncrypted) : null,
      publicKey: clean(row.testPublicKey),
      merchantId: clean(row.testMerchantId),
      marketplaceMid: clean(row.testMarketplaceMid),
    },
    live: {
      secretKey: row.liveSecretKeyEncrypted ? decryptSecret(row.liveSecretKeyEncrypted) : null,
      publicKey: clean(row.livePublicKey),
      merchantId: clean(row.liveMerchantId),
      marketplaceMid: clean(row.liveMarketplaceMid),
    },
    lastTestStatus: row.lastTestStatus === "connected" || row.lastTestStatus === "failed" ? row.lastTestStatus : null,
    lastTestAt: row.lastTestAt,
    lastTestMessage: clean(row.lastTestMessage),
  };
}

async function loadRow(): Promise<Row | null> {
  const [row] = await db
    .select()
    .from(schema.tapGatewaySettings)
    .where(eq(schema.tapGatewaySettings.id, true))
    .limit(1);
  return row ?? null;
}

/** Full settings including decrypted secrets — server-side use only. */
export async function loadTapSettings(): Promise<TapSettings | null> {
  const row = await loadRow();
  return row ? fromRow(row) : null;
}

export type TapSettingsView = {
  activeEnvironment: TapEnvironment;
  liveEnabled: boolean;
  encryptionConfigured: boolean;
  test: { secretKeyMasked: string | null; publicKey: string | null; merchantId: string | null; marketplaceMid: string | null };
  live: { secretKeyMasked: string | null; publicKey: string | null; merchantId: string | null; marketplaceMid: string | null };
  lastTestStatus: "connected" | "failed" | null;
  lastTestAt: string | null;
  lastTestMessage: string | null;
};

/** Safe projection for the admin UI: secrets reduced to a mask. */
export async function loadTapSettingsView(encryptionReady: boolean): Promise<TapSettingsView | null> {
  const settings = await loadTapSettings();
  if (!settings) return null;
  return {
    activeEnvironment: settings.activeEnvironment,
    liveEnabled: settings.liveEnabled,
    encryptionConfigured: encryptionReady,
    test: {
      secretKeyMasked: maskSecret(settings.test.secretKey),
      publicKey: settings.test.publicKey,
      merchantId: settings.test.merchantId,
      marketplaceMid: settings.test.marketplaceMid,
    },
    live: {
      secretKeyMasked: maskSecret(settings.live.secretKey),
      publicKey: settings.live.publicKey,
      merchantId: settings.live.merchantId,
      marketplaceMid: settings.live.marketplaceMid,
    },
    lastTestStatus: settings.lastTestStatus,
    lastTestAt: settings.lastTestAt?.toISOString() ?? null,
    lastTestMessage: settings.lastTestMessage,
  };
}

export type TapSettingsPatch = {
  activeEnvironment?: TapEnvironment;
  liveEnabled?: boolean;
  test?: Partial<Credentials> & { clearSecretKey?: boolean };
  live?: Partial<Credentials> & { clearSecretKey?: boolean };
};

function encryptOrThrow(value: string): string {
  try {
    return encryptSecret(value);
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes("TAP_CONFIG_ENCRYPTION_KEY")
        ? "encryption_not_configured"
        : "encryption_failed",
    );
  }
}

/**
 * Persists a partial update. A field is only written when supplied, so saving
 * one environment never clears the other, and a secret is only replaced when a
 * new non-empty value (or an explicit clear) is provided.
 */
export async function saveTapSettings(patch: TapSettingsPatch, adminId: string | null): Promise<void> {
  const current = await loadRow();
  if (!current) throw new Error("tap_settings_missing");

  const values: Partial<typeof schema.tapGatewaySettings.$inferInsert> = {
    updatedAt: new Date(),
    updatedBy: adminId,
  };

  if (patch.activeEnvironment) values.activeEnvironment = patch.activeEnvironment;
  if (patch.liveEnabled !== undefined) values.liveEnabled = patch.liveEnabled;

  const applyEnv = (env: "test" | "live", input?: TapSettingsPatch["test"]) => {
    if (!input) return;
    const prefix = env === "test" ? "test" : "live";
    if (input.publicKey !== undefined) values[`${prefix}PublicKey` as const] = clean(input.publicKey);
    if (input.merchantId !== undefined) values[`${prefix}MerchantId` as const] = clean(input.merchantId);
    if (input.marketplaceMid !== undefined) values[`${prefix}MarketplaceMid` as const] = clean(input.marketplaceMid);
    const secretField = env === "test" ? "testSecretKeyEncrypted" : "liveSecretKeyEncrypted";
    if (input.clearSecretKey) values[secretField] = null;
    else if (input.secretKey) values[secretField] = encryptOrThrow(input.secretKey.trim());
  };
  applyEnv("test", patch.test);
  applyEnv("live", patch.live);

  // Switching to live without having enabled it is rejected by the DB check;
  // surface that as a clear domain error instead of a raw constraint failure.
  const nextEnvironment = patch.activeEnvironment ?? asEnvironment(current.activeEnvironment);
  const nextLiveEnabled = patch.liveEnabled ?? current.liveEnabled;
  if (nextEnvironment === "live" && !nextLiveEnabled) throw new Error("live_not_enabled");

  await db.update(schema.tapGatewaySettings).set(values).where(eq(schema.tapGatewaySettings.id, true));
}

export async function recordTapConnectionTest(result: {
  environment: TapEnvironment;
  status: "connected" | "failed";
  message: string | null;
}): Promise<void> {
  await db
    .update(schema.tapGatewaySettings)
    .set({
      lastTestStatus: result.status,
      lastTestAt: new Date(),
      lastTestMessage: result.message?.slice(0, 300) ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tapGatewaySettings.id, true));
}

/** The effective Tap configuration for the active environment, if complete. */
export async function loadActiveTapConfig(siteUrl: string): Promise<import("./config").TapConfig | null> {
  const settings = await loadTapSettings();
  if (!settings) return null;
  const credentials = settings.activeEnvironment === "live" ? settings.live : settings.test;
  if (!credentials.secretKey || !credentials.publicKey || !credentials.merchantId || !credentials.marketplaceMid) {
    return null;
  }
  return {
    secretKey: credentials.secretKey,
    publicKey: credentials.publicKey,
    merchantId: credentials.merchantId,
    marketplaceMid: credentials.marketplaceMid,
    mode: settings.activeEnvironment,
    siteUrl,
  };
}
