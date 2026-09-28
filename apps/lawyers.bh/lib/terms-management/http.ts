import { NextResponse } from "next/server";

const badRequest = new Set([
  "invalid_content_ar",
  "invalid_content_en",
  "invalid_document_type",
  "invalid_percentage",
  "invalid_lawyer",
  "invalid_effective_date",
]);
const conflict = new Set(["immutable_version", "stale_draft", "published_version_required"]);

export function termsManagementError(error: unknown) {
  const code = error instanceof Error ? error.message : "internal_error";
  const status = code === "not_found" ? 404 : conflict.has(code) ? 409 : badRequest.has(code) ? 400 : 500;
  if (status === 500) console.error("[terms-management]", error);
  return NextResponse.json(
    { ok: false, error: status === 500 ? "internal_error" : code },
    { status },
  );
}
