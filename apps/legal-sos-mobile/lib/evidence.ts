// Evidence upload from the mobile app to Cloudflare R2.
//
// Two-phase flow (matches admin's lib/services/evidence.ts):
//   1. Ask admin for a signed PUT URL
//   2. PUT the file bytes directly to R2 (no proxy through admin)
//   3. Ask admin to finalize — admin HEADs R2 + writes evidence_files row
//
// Usage:
//   const result = await uploadEvidence({
//     caseId: "...",
//     fileUri: "file:///path/to/local/photo.jpg",
//     fileName: "evidence-01.jpg",
//     mimeType: "image/jpeg",
//   });

import { apiFetch, ApiError } from "./api";

interface SignPutResponse {
  ok: true;
  signedUrl: string;
  storageKey: string;
  expiresAt: string;
}

interface FinalizeResponse {
  ok: true;
  evidenceId: string;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadEvidenceArgs {
  caseId: string;
  /** Local file URI from expo-image-picker, expo-document-picker, etc. */
  fileUri: string;
  fileName: string;
  mimeType: string;
  /** Optional caption shown in the admin viewer. */
  caption?: string;
  /** Progress 0..1; called repeatedly during upload. */
  onProgress?: (frac: number) => void;
}

export interface UploadEvidenceResult {
  evidenceId: string;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadEvidence(
  args: UploadEvidenceArgs,
): Promise<UploadEvidenceResult> {
  // 1) Resolve size — fetch metadata via HEAD on the file URI (RN's
  //    fetch can do this for file:// URIs on iOS; on Android we read
  //    the file as a blob and measure).
  const blob = await uriToBlob(args.fileUri);

  // 2) Ask admin for a signed URL.
  const sign = await apiFetch<SignPutResponse>(
    "/api/mobile/evidence/sign-put",
    {
      method: "POST",
      json: {
        caseId: args.caseId,
        fileName: args.fileName,
        mimeType: args.mimeType,
        sizeBytes: blob.size,
      },
    },
  );

  // 3) PUT directly to R2 with progress events.
  await putWithProgress(sign.signedUrl, blob, args.mimeType, args.onProgress);

  // 4) Confirm with admin → writes evidence_files row.
  const finalize = await apiFetch<FinalizeResponse>(
    "/api/mobile/evidence/finalize",
    {
      method: "POST",
      json: {
        caseId: args.caseId,
        storageKey: sign.storageKey,
        ...(args.caption ? { caption: args.caption } : {}),
      },
    },
  );

  return {
    evidenceId: finalize.evidenceId,
    sizeBytes: finalize.sizeBytes,
    mimeType: finalize.mimeType,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

async function uriToBlob(uri: string): Promise<Blob> {
  // RN's fetch handles file:// URIs (and content:// on Android via
  // expo-file-system). For very large files we'd want to stream;
  // for now this is fine up to ~50MB.
  const res = await fetch(uri);
  if (!res.ok) {
    throw new ApiError("Could not read local file.", 0, null);
  }
  return await res.blob();
}

function putWithProgress(
  url: string,
  blob: Blob,
  mimeType: string,
  onProgress?: (frac: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mimeType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded / e.total);
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new ApiError(
            `R2 upload failed (${xhr.status})`,
            xhr.status,
            xhr.responseText,
          ),
        );
      }
    };
    xhr.onerror = () =>
      reject(new ApiError("R2 upload network error", 0, null));
    xhr.send(blob);
  });
}
