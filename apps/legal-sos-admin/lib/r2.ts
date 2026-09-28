// Cloudflare R2 wrapper — S3-compatible API via the AWS SDK.
//
// Why R2 vs S3 vs Vercel Blob:
//   • Zero egress fees — viewing evidence in the admin doesn't get billed
//     per GB pulled out, which matters when investigators scroll through
//     case attachments.
//   • S3-compatible — drop-in for `@aws-sdk/client-s3`, no lock-in.
//   • Bahrain-friendly latency via Cloudflare's automatic POP routing.
//
// Upload flow (mobile evidence):
//   1. Mobile asks: POST /api/mobile/evidence/sign-put
//      → returns { signedUrl, storageKey, expiresAt }
//   2. Mobile PUTs the bytes DIRECTLY to R2 using signedUrl (no proxy
//      through admin — saves Vercel bandwidth + speeds up large uploads).
//   3. Mobile confirms: POST /api/mobile/evidence/finalize
//      → admin writes the evidence_files row.
//
// Read flow (admin viewing evidence):
//   • lib/services/evidence.ts → getEvidenceSignedUrl(id) returns a
//     short-lived signed GET URL the <img>/<a> in the admin can use.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";

// Env vars are read lazily — modules that import this file may be
// loaded BEFORE a script's dotenv.config() runs (TS hoists imports),
// so capturing them at module-init would lock in undefined values.

function env() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.R2_ENDPOINT ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const bucket = process.env.R2_BUCKET ?? "legal-sos-evidence";
  return { accountId, accessKeyId, secretAccessKey, endpoint, bucket };
}

let cached: S3Client | null = null;

export function isR2Configured(): boolean {
  const { accountId, accessKeyId, secretAccessKey, endpoint } = env();
  return Boolean(accountId && accessKeyId && secretAccessKey && endpoint);
}

export function r2Bucket(): string {
  return env().bucket;
}

export function r2Endpoint(): string | undefined {
  return env().endpoint;
}

function getClient(): S3Client {
  if (cached) return cached;
  const { accessKeyId, secretAccessKey, endpoint } = env();
  if (!isR2Configured()) {
    throw new Error(
      "R2 creds incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT.",
    );
  }
  cached = new S3Client({
    region: "auto", // Cloudflare R2 always uses 'auto'
    endpoint,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    // Force path-style addressing — R2 only supports virtual-hosted style
    // for buckets in custom domains, path-style for everything else.
    forcePathStyle: true,
  });
  return cached;
}

// ── Storage key conventions ────────────────────────────────────────
//
// Per-tenant prefixing keeps the bucket browsable. Suffix is a random
// 16-byte ID so concurrent uploads with the same filename never collide.

export function buildEvidenceKey(
  caseId: string,
  fileName: string,
): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  const safeExt = (ext ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rnd = randomBytes(8).toString("hex");
  return `cases/${caseId}/evidence/${Date.now()}-${rnd}.${safeExt}`;
}

export function buildSignatureKey(caseId: string): string {
  return `cases/${caseId}/signatures/${Date.now()}-${randomBytes(4).toString("hex")}.png`;
}

// ── Signed URLs ────────────────────────────────────────────────────

/** Issue a signed PUT URL the mobile can upload to directly. */
export async function getSignedPutUrl(
  storageKey: string,
  contentType: string,
  contentLength: number,
  expiresInSec = 900, // 15 min
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env().bucket,
    Key: storageKey,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return await getSignedUrl(getClient(), command, { expiresIn: expiresInSec });
}

/** Issue a signed GET URL — used by admin viewer to display evidence. */
export async function getSignedGetUrl(
  storageKey: string,
  expiresInSec = 300, // 5 min — short, links rotate
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env().bucket, Key: storageKey });
  return await getSignedUrl(getClient(), command, { expiresIn: expiresInSec });
}

// ── Object operations ──────────────────────────────────────────────

/** Server-side upload (used by signature finalization, server-generated PDFs). */
export async function putObject(
  storageKey: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env().bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(storageKey: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: env().bucket, Key: storageKey }),
  );
}

export async function objectExists(storageKey: string): Promise<{ exists: true; sizeBytes: number; contentType?: string } | { exists: false }> {
  try {
    const res = await getClient().send(
      new HeadObjectCommand({ Bucket: env().bucket, Key: storageKey }),
    );
    return {
      exists: true,
      sizeBytes: res.ContentLength ?? 0,
      contentType: res.ContentType,
    };
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") {
      return { exists: false };
    }
    throw err;
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────

/** Create the bucket if it doesn't exist. Idempotent. */
export async function ensureBucket(): Promise<{ created: boolean }> {
  const b = env().bucket;
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: b }));
    return { created: false };
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchBucket") {
      await getClient().send(new CreateBucketCommand({ Bucket: b }));
      return { created: true };
    }
    throw err;
  }
}
