import "server-only";
import { randomUUID } from "node:crypto";
import { put, del, issueSignedToken, presignUrl } from "@vercel/blob";
import { sqlClient as sql } from "@/lib/db/client";
import { countryTableName } from "@/lib/db/country-tables";
import { privateToken, uploadId, validateUploadBytes } from "./server";

export async function storePrivateDocument(
  folder: string,
  file: File | Buffer,
  contentType: string,
) {
  const prefix = folder.split("/")[0];
  countryTableName(prefix, "lawyers");
  const bytes = Buffer.isBuffer(file)
    ? file
    : Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new Error("invalid_upload_size");
  await validateUploadBytes(bytes, contentType);
  const id = randomUUID(),
    pathname = `provider-documents/${id}`;
  // Record before writing so interrupted uploads can be discovered by cleanup.
  await sql`INSERT INTO private_provider_documents(id,table_prefix,pathname) VALUES (${id},${prefix},${pathname})`;
  await put(pathname, bytes, {
    access: "private",
    token: privateToken(),
    contentType,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return { url: `/api/provider-documents/${id}`, pathname };
}
export async function documentOwner(value: string) {
  const id = uploadId(value);
  const [document] =
    await sql`SELECT * FROM private_provider_documents WHERE id=${id}`;
  if (!document) return null;
  const table = countryTableName(document.table_prefix, "lawyers");
  const url = `/api/provider-documents/${id}`;
  // Only actual document columns establish ownership, never arbitrary profile text.
  const [owner] =
    await sql`SELECT id,country_code,is_active FROM ${sql(table)} AS l WHERE
    to_jsonb(l)->>'license_file_url'=${url} OR
    to_jsonb(l)->>'iban_certificate_file_url'=${url} OR
    to_jsonb(l)->>'institution_license_file_url'=${url} OR
    to_jsonb(l)->>'personal_id_file_url'=${url} OR
    to_jsonb(l)->>'signature_image_url'=${url} LIMIT 1`;
  return owner || null;
}
export async function privateDownload(value: string) {
  const id = uploadId(value);
  const [document] =
    await sql`SELECT pathname FROM private_provider_documents WHERE id=${id}`;
  if (!document) throw new Error("not_found");
  const validUntil = Date.now() + 60_000;
  const signed = await issueSignedToken({
    token: privateToken(),
    pathname: document.pathname,
    operations: ["get"],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(signed, {
    access: "private",
    operation: "get",
    pathname: document.pathname,
    validUntil,
  });
  return presignedUrl;
}
export async function cleanupPrivateUploads() {
  // Session lifetime is 30 minutes. The extra day prevents racing an in-flight submission.
  const sessions =
    await sql`SELECT id,files FROM direct_upload_sessions WHERE expires_at<now()-interval '1 day' ORDER BY expires_at LIMIT 50`;
  for (const session of sessions) {
    for (const item of session.files as { path: string }[])
      await del(item.path, { token: privateToken() });
    await sql`DELETE FROM direct_upload_sessions WHERE id=${session.id}`;
  }
  const documents =
    await sql`SELECT id,pathname FROM private_provider_documents WHERE retained=false AND created_at<now()-interval '1 day' ORDER BY created_at LIMIT 50`;
  for (const document of documents) {
    if (await documentOwner(document.id))
      await sql`UPDATE private_provider_documents SET retained=true WHERE id=${document.id}`;
    else {
      await del(document.pathname, { token: privateToken() });
      await sql`DELETE FROM private_provider_documents WHERE id=${document.id}`;
    }
  }
  await sql`DELETE FROM direct_upload_limits WHERE window_start<now()-interval '2 days'`;
  return { sessions: sessions.length, documents: documents.length };
}
