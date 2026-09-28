// Evidence upload + retrieval business logic.
//
// Two-phase upload flow (avoids proxying file bytes through Vercel):
//   Phase 1 — signPutUrl()   → issues a short-lived R2 PUT URL
//   Phase 2 — finalizeUpload() → after client PUTs, we HEAD R2 to
//                                confirm the object exists + size, then
//                                insert the evidence_files row.
//
// The finalize step exists so we never end up with a DB row pointing at
// a key that doesn't exist (failed mid-upload), and so the DB never
// records a different size than R2 actually stored.

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  buildEvidenceKey,
  buildSignatureKey,
  getSignedPutUrl,
  getSignedGetUrl,
  objectExists,
  putObject,
  isR2Configured,
} from "@/lib/r2";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "video/mp4",
  "video/quicktime",
]);

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

export type EvidenceKind =
  | "photo"
  | "document"
  | "audio"
  | "video"
  | "signature";

function inferKind(mime: string): EvidenceKind {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

// ── Phase 1 ─────────────────────────────────────────────────────────

export interface SignPutInput {
  caseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export type SignPutResult =
  | {
      ok: true;
      signedUrl: string;
      storageKey: string;
      expiresAt: Date;
    }
  | {
      ok: false;
      code: "r2_not_configured" | "mime_disallowed" | "too_large" | "case_not_found";
      message: string;
    };

export async function signPutUrl(input: SignPutInput): Promise<SignPutResult> {
  if (!isR2Configured()) {
    return {
      ok: false,
      code: "r2_not_configured",
      message: "Object storage not configured on the server.",
    };
  }
  if (!ALLOWED_MIME.has(input.mimeType)) {
    return {
      ok: false,
      code: "mime_disallowed",
      message: `File type ${input.mimeType} not allowed.`,
    };
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: `File must be under ${Math.floor(MAX_BYTES / 1024 / 1024)} MB.`,
    };
  }

  // Verify the case exists (avoid issuing URLs for arbitrary UUIDs).
  const [caseRow] = await db
    .select({ id: schema.cases.id })
    .from(schema.cases)
    .where(eq(schema.cases.id, input.caseId))
    .limit(1);
  if (!caseRow) {
    return { ok: false, code: "case_not_found", message: "Case not found." };
  }

  const storageKey = buildEvidenceKey(input.caseId, input.fileName);
  const signedUrl = await getSignedPutUrl(
    storageKey,
    input.mimeType,
    input.sizeBytes,
    900,
  );

  return {
    ok: true,
    signedUrl,
    storageKey,
    expiresAt: new Date(Date.now() + 900 * 1000),
  };
}

// ── Phase 2 ─────────────────────────────────────────────────────────

export interface FinalizeInput {
  caseId: string;
  storageKey: string;
  uploadedByUserId?: string | null;
  uploadedByLawyerId?: string | null;
  caption?: string;
  sha256?: string;
  /** Override the auto-inferred kind (used for signatures). */
  kind?: EvidenceKind;
}

export type FinalizeResult =
  | { ok: true; evidenceId: string; sizeBytes: number; mimeType: string }
  | {
      ok: false;
      code: "not_uploaded" | "case_not_found" | "key_outside_case";
      message: string;
    };

export async function finalizeUpload(input: FinalizeInput): Promise<FinalizeResult> {
  // Sanity-check the key actually belongs to this case (prevents one
  // user attaching to another's case by guessing UUIDs).
  if (!input.storageKey.startsWith(`cases/${input.caseId}/`)) {
    return {
      ok: false,
      code: "key_outside_case",
      message: "Storage key does not belong to this case.",
    };
  }

  const [caseRow] = await db
    .select({ id: schema.cases.id })
    .from(schema.cases)
    .where(eq(schema.cases.id, input.caseId))
    .limit(1);
  if (!caseRow) {
    return { ok: false, code: "case_not_found", message: "Case not found." };
  }

  // HEAD R2 to confirm the upload landed + capture real size/mime.
  const head = await objectExists(input.storageKey);
  if (!head.exists) {
    return {
      ok: false,
      code: "not_uploaded",
      message: "Upload not found at the supplied key. Retry the upload.",
    };
  }

  const kind: EvidenceKind =
    input.kind ?? inferKind(head.contentType ?? "application/octet-stream");

  const [inserted] = await db
    .insert(schema.evidenceFiles)
    .values({
      caseId: input.caseId,
      uploadedByUserId: input.uploadedByUserId ?? null,
      uploadedByLawyerId: input.uploadedByLawyerId ?? null,
      kind,
      storageKey: input.storageKey,
      mimeType: head.contentType ?? "application/octet-stream",
      sizeBytes: head.sizeBytes,
      caption: input.caption ?? null,
      sha256: input.sha256 ?? null,
    })
    .returning({ id: schema.evidenceFiles.id });

  await db.insert(schema.auditLog).values({
    actorUserId: input.uploadedByUserId ?? null,
    actorLawyerId: input.uploadedByLawyerId ?? null,
    action: "evidence.upload",
    targetType: "evidence",
    targetId: inserted.id,
    meta: {
      caseId: input.caseId,
      storageKey: input.storageKey,
      kind,
      sizeBytes: head.sizeBytes,
    },
  });

  return {
    ok: true,
    evidenceId: inserted.id,
    sizeBytes: head.sizeBytes,
    mimeType: head.contentType ?? "application/octet-stream",
  };
}

// ── Server-side signature persistence ───────────────────────────────
//
// Signatures come from `react-native-signature-canvas` as a base64 PNG
// data URL. They're small (<200KB) so we just decode + put server-side
// rather than signing a URL for the round trip.

export interface SaveSignatureInput {
  caseId: string;
  signatureDataUrl: string; // "data:image/png;base64,...."
  uploadedByUserId?: string | null;
  uploadedByLawyerId?: string | null;
}

export async function saveSignature(input: SaveSignatureInput): Promise<FinalizeResult> {
  const match = input.signatureDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    return {
      ok: false,
      code: "not_uploaded",
      message: "Invalid signature data URL.",
    };
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const key = buildSignatureKey(input.caseId);
  await putObject(key, buffer, mime);
  return finalizeUpload({
    caseId: input.caseId,
    storageKey: key,
    uploadedByUserId: input.uploadedByUserId,
    uploadedByLawyerId: input.uploadedByLawyerId,
    kind: "signature",
  });
}

// ── Retrieval (admin viewer) ────────────────────────────────────────

export async function getEvidenceSignedUrl(
  evidenceId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ storageKey: schema.evidenceFiles.storageKey })
    .from(schema.evidenceFiles)
    .where(eq(schema.evidenceFiles.id, evidenceId))
    .limit(1);
  if (!row) return null;
  return await getSignedGetUrl(row.storageKey);
}
