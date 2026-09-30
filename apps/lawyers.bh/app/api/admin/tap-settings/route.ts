import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { refreshTapConfig } from "@/lib/tap/hydrate";
import { testTapConnection } from "@/lib/tap/connection-test";
import { encryptionConfigured } from "@/lib/tap/secret-box";
import {
  loadTapSettings,
  loadTapSettingsView,
  recordTapConnectionTest,
  saveTapSettings,
  type TapEnvironment,
  type TapSettingsPatch,
} from "@/lib/tap/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function clean(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function parseEnvironment(value: unknown): TapEnvironment | undefined {
  return value === "test" || value === "live" ? value : undefined;
}

type Credentials = { secretKey: string | null; publicKey: string | null; merchantId: string | null; marketplaceMid: string | null };
type EnvPatch = NonNullable<TapSettingsPatch["test"]>;

function parseEnvPatch(value: unknown): EnvPatch | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_input");
  const input = value as Record<string, unknown>;
  const patch: EnvPatch = {};
  const secretKey = clean(input.secretKey, 400);
  if (secretKey) patch.secretKey = secretKey;
  const publicKey = clean(input.publicKey);
  if (publicKey) patch.publicKey = publicKey;
  const merchantId = clean(input.merchantId, 100);
  if (merchantId) patch.merchantId = merchantId;
  const marketplaceMid = clean(input.marketplaceMid, 100);
  if (marketplaceMid) patch.marketplaceMid = marketplaceMid;
  if (input.clearSecretKey === true) patch.clearSecretKey = true;
  return patch;
}

function parsePatch(body: Record<string, unknown>): TapSettingsPatch {
  const patch: TapSettingsPatch = {};
  const activeEnvironment = parseEnvironment(body.activeEnvironment);
  if (activeEnvironment) patch.activeEnvironment = activeEnvironment;
  if (typeof body.liveEnabled === "boolean") patch.liveEnabled = body.liveEnabled;
  const test = parseEnvPatch(body.test);
  if (test) patch.test = test;
  const live = parseEnvPatch(body.live);
  if (live) patch.live = live;
  return patch;
}

function mergeEnv(current: Credentials, patch?: EnvPatch): Credentials {
  const next = { ...current };
  if (patch) {
    if (patch.clearSecretKey) next.secretKey = null;
    else if (patch.secretKey) next.secretKey = patch.secretKey;
    if (patch.publicKey) next.publicKey = patch.publicKey;
    if (patch.merchantId) next.merchantId = patch.merchantId;
    if (patch.marketplaceMid) next.marketplaceMid = patch.marketplaceMid;
  }
  return next;
}

function complete(credentials: Credentials) {
  return Boolean(credentials.secretKey && credentials.publicKey && credentials.merchantId && credentials.marketplaceMid);
}

export async function GET() {
  if (!(await requireSuperAdmin())) return json({ ok: false, error: "FORBIDDEN" }, 403);
  try {
    const view = await loadTapSettingsView(encryptionConfigured());
    if (!view) return json({ ok: false, error: "TAP_SETTINGS_MISSING" }, 503);
    return json({ ok: true, settings: view });
  } catch {
    return json({ ok: false, error: "TAP_SETTINGS_UNAVAILABLE" }, 503);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return json({ ok: false, error: "FORBIDDEN" }, 403);
  if (!sameOrigin(request)) return json({ ok: false, error: "INVALID_ORIGIN" }, 403);

  let body: Record<string, unknown>;
  let patch: TapSettingsPatch;
  try {
    body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_input");
    patch = parsePatch(body);
  } catch {
    return json({ ok: false, error: "INVALID_TAP_SETTINGS" }, 400);
  }

  try {
    const current = await loadTapSettings();
    if (!current) return json({ ok: false, error: "TAP_SETTINGS_MISSING" }, 503);

    const nextEnvironment = patch.activeEnvironment ?? current.activeEnvironment;
    const nextLiveEnabled = patch.liveEnabled ?? current.liveEnabled;
    if (nextEnvironment === "live" && !nextLiveEnabled) {
      return json({ ok: false, error: "live_not_enabled" }, 400);
    }

    const nextTest = mergeEnv(current.test, patch.test);
    const nextLive = mergeEnv(current.live, patch.live);
    const target = nextEnvironment === "live" ? nextLive : nextTest;
    if (!complete(target)) {
      return json({ ok: false, error: "incomplete_credentials" }, 400);
    }

    await saveTapSettings(patch, admin.id);
    await refreshTapConfig();
    const view = await loadTapSettingsView(encryptionConfigured());
    return json({ ok: true, settings: view });
  } catch (error) {
    const code = error instanceof Error ? error.message : "TAP_SETTINGS_UNAVAILABLE";
    if (code === "encryption_not_configured" || code === "live_not_enabled") {
      return json({ ok: false, error: code }, 400);
    }
    return json({ ok: false, error: "TAP_SETTINGS_UNAVAILABLE" }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await requireSuperAdmin())) return json({ ok: false, error: "FORBIDDEN" }, 403);
  if (!sameOrigin(request)) return json({ ok: false, error: "INVALID_ORIGIN" }, 403);

  let environment: TapEnvironment | undefined;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    environment = parseEnvironment(body?.environment);
  } catch {
    environment = undefined;
  }

  try {
    const settings = await loadTapSettings();
    if (!settings) return json({ ok: false, error: "TAP_SETTINGS_MISSING" }, 503);
    const target = environment ?? settings.activeEnvironment;
    const secretKey = target === "live" ? settings.live.secretKey : settings.test.secretKey;
    if (!secretKey) return json({ ok: false, error: "secret_key_not_configured" }, 400);

    const result = await testTapConnection({ environment: target, secretKey });
    await recordTapConnectionTest({ environment: target, status: result.status, message: result.message });
    return json({ ok: result.status === "connected", environment: target, ...result });
  } catch {
    return json({ ok: false, error: "TAP_SETTINGS_UNAVAILABLE" }, 503);
  }
}
