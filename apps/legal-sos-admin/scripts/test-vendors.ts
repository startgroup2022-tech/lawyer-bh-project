// Vendor smoke test — exercises every provisioned third-party against
// real APIs to confirm creds are live.
//
//   npm run test:vendors
//
// Reads .env.local. Safe to re-run.

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

const TEST_PHONE = "+97338347070";
const TEST_EMAIL = "info@lawyers.bh";

interface CheckResult {
  vendor: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(vendor: string, ok: boolean, detail: string) {
  results.push({ vendor, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${vendor}: ${detail}`);
}

// ── 1) Twilio Verify ───────────────────────────────────────────────

async function testTwilio() {
  console.log("\n── Twilio Verify ──");
  try {
    const { sendSmsOtp } = await import("../lib/twilio");
    const res = await sendSmsOtp(TEST_PHONE, "en");
    record(
      "Twilio Verify",
      true,
      `OTP sent to ${TEST_PHONE} (SID ${res.providerRef}, status=${res.status})`,
    );
    console.log(`   → Check ${TEST_PHONE} for the 6-digit code.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Twilio trial accounts reject unverified numbers — surface the hint.
    if (msg.includes("unverified") || msg.includes("60200") || msg.includes("21608")) {
      record(
        "Twilio Verify",
        false,
        `Trial account — ${TEST_PHONE} not on Verified Caller IDs. Add it at console.twilio.com → Phone Numbers → Manage → Verified Caller IDs.`,
      );
    } else {
      record("Twilio Verify", false, msg);
    }
  }
}

// ── 2) Pusher Channels ─────────────────────────────────────────────

async function testPusher() {
  console.log("\n── Pusher Channels ──");
  try {
    const { publishSystemEvent, isPusherConfigured } = await import("../lib/pusher");
    if (!isPusherConfigured()) {
      record("Pusher", false, "PUSHER_APP_ID/KEY/SECRET not set");
      return;
    }
    await publishSystemEvent({
      kind: "case.created",
      caseId: "00000000-0000-0000-0000-000000000000",
      caseRef: "SOS-TEST-VENDOR-CHECK",
      at: new Date().toISOString(),
    });
    record("Pusher", true, "Published test event to 'system' channel (kind=case.created)");

    // Also query the Pusher REST API directly to confirm the channel
    // accepts subscriptions.
    const Pusher = (await import("pusher")).default;
    const client = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
    // Returns {} for an empty cluster (no current subscribers) — but a
    // successful 200 means our app keys are valid.
    const info = await client.get({ path: "/channels" });
    record(
      "Pusher REST",
      info.status === 200,
      `GET /channels returned ${info.status}`,
    );
  } catch (err) {
    record("Pusher", false, err instanceof Error ? err.message : String(err));
  }
}

// ── 3) Cloudflare R2 ───────────────────────────────────────────────

async function testR2() {
  console.log("\n── Cloudflare R2 ──");
  try {
    const r2 = await import("../lib/r2");
    if (!r2.isR2Configured()) {
      record("R2", false, "R2_ACCOUNT_ID/ACCESS_KEY/SECRET not set");
      return;
    }
    const key = r2.buildEvidenceKey(
      "00000000-0000-0000-0000-000000000000",
      "vendor-test.txt",
    );
    const payload = `vendor smoke @ ${new Date().toISOString()}`;
    await r2.putObject(key, payload, "text/plain");
    const head = await r2.objectExists(key);
    if (!head.exists) throw new Error("PUT succeeded but HEAD says missing");
    const signed = await r2.getSignedGetUrl(key, 60);
    // Round-trip fetch the signed URL to prove it returns the bytes.
    const got = await fetch(signed);
    const gotText = await got.text();
    const matches = gotText === payload;
    await r2.deleteObject(key);
    record(
      "R2 round-trip",
      matches,
      matches
        ? `PUT (${head.sizeBytes}B) → signed GET → DELETE all worked; bytes match`
        : `bytes mismatch: expected ${JSON.stringify(payload)}, got ${JSON.stringify(gotText)}`,
    );
  } catch (err) {
    record("R2", false, err instanceof Error ? err.message : String(err));
  }
}

// ── 4) SendGrid ────────────────────────────────────────────────────

async function testSendgrid() {
  console.log("\n── SendGrid ──");
  try {
    const { sendEmail, isSendgridConfigured } = await import("../lib/sendgrid");
    if (!isSendgridConfigured()) {
      record("SendGrid", false, "SENDGRID_API_KEY not set");
      return;
    }
    const stamp = new Date().toISOString();
    const result = await sendEmail({
      to: TEST_EMAIL,
      subject: `Legal SOS · vendor smoke test · ${stamp}`,
      html: `
        <h2 style="margin:0 0 10px;font-size:18px">✅ SendGrid wired</h2>
        <p>This email was sent by <code>npm run test:vendors</code> at <code>${stamp}</code>.</p>
        <p>If you can read this, the API key, verified sender, brand shell, and DNS authentication all work.</p>
        <p style="margin-top:18px;color:#6b7b97;font-size:12px">No action needed — this is an automated infrastructure check.</p>
      `,
      categories: ["vendor-smoke-test"],
    });
    record(
      "SendGrid",
      true,
      `Email sent to ${TEST_EMAIL}${result.messageId ? ` (Message ID ${result.messageId})` : ""}`,
    );
    console.log(`   → Check the inbox at ${TEST_EMAIL}.`);
  } catch (err) {
    record(
      "SendGrid",
      false,
      err instanceof Error ? `${err.message}` : String(err),
    );
  }
}

// ── 5) Sentry (backend) ────────────────────────────────────────────

async function testSentry() {
  console.log("\n── Sentry (backend) ──");
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    record("Sentry", false, "SENTRY_DSN not set — create a Node.js project at sentry.io and set the DSN");
    return;
  }
  try {
    // @sentry/nextjs is mostly designed for Next.js's instrumentation
    // entry point; outside that we use @sentry/node directly which
    // ships as a transitive dep and has a stable named-import surface.
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      release: "vendor-smoke-test",
      environment: "test",
      tracesSampleRate: 0,
    });
    const stamp = new Date().toISOString();
    const eventId = Sentry.captureMessage(
      `Legal SOS · vendor smoke test · ${stamp}`,
      "info",
    );
    await Sentry.flush(5000);
    record(
      "Sentry",
      Boolean(eventId),
      eventId
        ? `Event sent (id=${eventId}). Check sentry.io → Issues.`
        : "captureMessage returned no event ID",
    );
  } catch (err) {
    record("Sentry", false, err instanceof Error ? err.message : String(err));
  }
}

// ── 7) PostHog ─────────────────────────────────────────────────────

async function testPostHog() {
  console.log("\n── PostHog ──");
  try {
    const ph = await import("../lib/posthog");
    if (!ph.isPostHogConfigured()) {
      record(
        "PostHog",
        false,
        "POSTHOG_KEY not set — get it from posthog.com → Settings → Project API Keys",
      );
      return;
    }
    const stamp = new Date().toISOString();
    await ph.capture("vendor-smoke-test-distinct-id", "vendor_smoke_test", {
      stamp,
      source: "test-vendors.ts",
      $set: { name: "Vendor Smoke Test" },
    });
    // shutdown flushes the queue.
    await ph.shutdownPostHog();
    record(
      "PostHog",
      true,
      `Captured 'vendor_smoke_test' for 'vendor-smoke-test-distinct-id' (check Activity tab on PostHog).`,
    );
  } catch (err) {
    record("PostHog", false, err instanceof Error ? err.message : String(err));
  }
}

// ── 6) Agora ───────────────────────────────────────────────────────

async function testAgora() {
  console.log("\n── Agora ──");
  try {
    const { generateRtcToken, isAgoraConfigured, uidFromString } = await import(
      "../lib/agora"
    );
    if (!isAgoraConfigured()) {
      record("Agora", false, "AGORA_APP_ID + AGORA_APP_CERTIFICATE not set");
      return;
    }
    const channelName = "case-consult-vendor-smoke-test";
    const uid = uidFromString("test-user");
    const t = generateRtcToken({
      channelName,
      uid,
      expirationMinutes: 1,
    });
    // Agora tokens start with version prefix "007" (token format v2).
    const looksValid = t.token.startsWith("007") && t.token.length > 80;
    record(
      "Agora token",
      looksValid,
      looksValid
        ? `Issued (uid=${uid}, channel='${channelName}', expires ${t.expiresAt.toISOString()})`
        : `Unexpected token format: ${t.token.slice(0, 20)}...`,
    );
  } catch (err) {
    record("Agora", false, err instanceof Error ? err.message : String(err));
  }
}

// ── Run ────────────────────────────────────────────────────────────

async function main() {
  console.log("Vendor verification — hitting real APIs");
  console.log("Test phone for Twilio:", TEST_PHONE);
  console.log("Test inbox for SendGrid:", TEST_EMAIL);
  console.log("");

  await testTwilio();
  await testPusher();
  await testR2();
  await testSendgrid();
  await testAgora();
  await testSentry();
  await testPostHog();

  console.log("\n── Summary ──");
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.vendor}`);
  }
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[test-vendors] crashed:", err);
  process.exit(1);
});
