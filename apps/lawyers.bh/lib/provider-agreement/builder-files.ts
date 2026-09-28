import { createHash, randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import sharp from "sharp";
import { validatePdf } from "@/lib/training/domain";
import { AgreementError } from "./model";
import type { BuilderField } from "./builder-model";
import { uuid } from "./store";
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
function tokenHash(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))
    throw new AgreementError("upload_expired", 404);
  return hash(value);
}
export const AGREEMENT_CHUNK_BYTES = 1024 * 1024;
export function createAgreementFiles(sql: Sql) {
  return {
    async start(versionId: string, clientKey: string) {
      const [quota] =
        await sql`INSERT INTO provider_agreement_upload_limits(key) VALUES (${hash(clientKey)}) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN provider_agreement_upload_limits.window_start<now()-interval '1 hour' THEN 1 ELSE provider_agreement_upload_limits.attempts+1 END,window_start=CASE WHEN provider_agreement_upload_limits.window_start<now()-interval '1 hour' THEN now() ELSE provider_agreement_upload_limits.window_start END RETURNING attempts`;
      if (quota.attempts > 5) throw new AgreementError("rate_limited", 429);
      const [v] =
        await sql`SELECT template FROM provider_agreement_versions WHERE id=${uuid(versionId)} AND status='published'`;
      if (!v?.template.builder)
        throw new AgreementError("agreement_version_stale", 409);
      const token = randomBytes(32).toString("hex");
      await sql`INSERT INTO provider_agreement_uploads(token_hash,version_id) VALUES (${hash(token)},${versionId})`;
      return { token };
    },
    async beginFile(
      token: string,
      input: { fieldId: unknown; name: unknown; mime: unknown; size: unknown },
    ) {
      const key = tokenHash(token);
      if (
        typeof input.name !== "string" ||
        !input.name.trim() ||
        input.name.length > 255 ||
        typeof input.mime !== "string" ||
        !["application/pdf", "image/png", "image/jpeg"].includes(input.mime) ||
        !Number.isSafeInteger(input.size) ||
        Number(input.size) < 1 ||
        Number(input.size) > 5 * 1024 * 1024 ||
        typeof input.fieldId !== "string"
      )
        throw new AgreementError("invalid_file");
      const name = input.name.replace(
          /[\u0000-\u001f\u007f/\\\u202a-\u202e\u2066-\u2069]/g,
          "_",
        ),
        mime = input.mime,
        fieldId = input.fieldId,
        size = Number(input.size);
      return sql.begin(async (tx) => {
        const [session] =
          await tx`SELECT * FROM provider_agreement_uploads WHERE token_hash=${key} AND expires_at>now() AND provider_id IS NULL FOR UPDATE`;
        if (!session) throw new AgreementError("upload_expired", 404);
        const [v] =
          await tx`SELECT template FROM provider_agreement_versions WHERE id=${session.version_id} AND status='published'`;
        const fields = (v?.template?.builder?.fields ?? []) as BuilderField[];
        if (!fields.some((f) => f.id === fieldId && f.kind === "file"))
          throw new AgreementError("invalid_file_reference");
        // A new selection replaces only this request's still-unclaimed temporary file.
        await tx`DELETE FROM provider_agreement_files WHERE token_hash=${key} AND field_id=${fieldId} AND provider_id IS NULL`;
        const [count] =
          await tx`SELECT count(*)::int AS n FROM provider_agreement_files WHERE token_hash=${key}`;
        if (count.n >= 3) throw new AgreementError("too_many_files");
        const [file] =
          await tx`INSERT INTO provider_agreement_files(token_hash,field_id,name,mime,size) VALUES (${key},${fieldId},${name},${mime},${size}) RETURNING id`;
        return { id: String(file.id) };
      });
    },
    async append(token: string, fileId: string, offset: number, bytes: Buffer) {
      const key = tokenHash(token),
        id = uuid(fileId);
      if (
        !Number.isSafeInteger(offset) ||
        offset < 0 ||
        !bytes.length ||
        bytes.length > AGREEMENT_CHUNK_BYTES
      )
        throw new AgreementError("invalid_chunk");
      await sql.begin(async (tx) => {
        const [session] =
          await tx`SELECT * FROM provider_agreement_uploads WHERE token_hash=${key} AND expires_at>now() AND provider_id IS NULL FOR UPDATE`;
        if (!session) throw new AgreementError("upload_expired", 404);
        const [f] =
          await tx`SELECT * FROM provider_agreement_files WHERE id=${id} AND token_hash=${key} AND provider_id IS NULL FOR UPDATE`;
        if (!f) throw new AgreementError("invalid_file_reference");
        const current = Buffer.from(f.bytes);
        if (
          offset + bytes.length <= current.length &&
          current.subarray(offset, offset + bytes.length).equals(bytes)
        )
          return;
        if (
          f.verified ||
          offset !== current.length ||
          offset + bytes.length > f.size
        )
          throw new AgreementError("invalid_chunk", 409);
        await tx`UPDATE provider_agreement_files SET bytes=bytes||${bytes} WHERE id=${id}`;
      });
    },
    async finish(token: string, fileId: string) {
      const key = tokenHash(token),
        id = uuid(fileId);
      return sql.begin(async (tx) => {
        const [session] =
          await tx`SELECT * FROM provider_agreement_uploads WHERE token_hash=${key} AND expires_at>now() AND provider_id IS NULL FOR UPDATE`;
        if (!session) throw new AgreementError("upload_expired", 404);
        const [f] =
          await tx`SELECT * FROM provider_agreement_files WHERE id=${id} AND token_hash=${key} AND provider_id IS NULL FOR UPDATE`;
        if (!f || f.size !== f.bytes.length)
          throw new AgreementError("incomplete_upload", 409);
        const bytes = Buffer.from(f.bytes);
        try {
          if (f.mime === "application/pdf") await validatePdf(bytes);
          else {
            const image = sharp(bytes, {
                limitInputPixels: 8000000,
                failOn: "warning",
              }),
              meta = await image.metadata();
            if (`image/${meta.format}` !== f.mime || (meta.pages ?? 1) > 1)
              throw new Error();
            await image.stats();
          }
        } catch {
          throw new AgreementError("invalid_file");
        }
        await tx`UPDATE provider_agreement_files SET verified=true,sha256=${hash(bytes)} WHERE id=${id}`;
        return { id, name: String(f.name) };
      });
    },
    async validateReferences(
      token: unknown,
      versionId: string,
      values: Record<string, string>,
      fields: BuilderField[],
    ) {
      const selected = fields.filter((f) => f.kind === "file" && values[f.id]);
      const fileNames: Record<string, string> = {};
      if (!selected.length) return { tokenHash: null, fileNames };
      const key = tokenHash(token);
      const [session] =
        await sql`SELECT * FROM provider_agreement_uploads WHERE token_hash=${key} AND version_id=${uuid(versionId)} AND expires_at>now() AND provider_id IS NULL`;
      if (!session) throw new AgreementError("upload_expired", 404);
      for (const field of selected) {
        const [file] =
          await sql`SELECT id,name FROM provider_agreement_files WHERE id=${uuid(values[field.id])} AND token_hash=${key} AND field_id=${field.id} AND verified AND provider_id IS NULL`;
        if (!file) throw new AgreementError("invalid_file_reference");
        fileNames[String(file.id)] = String(file.name);
      }
      return { tokenHash: key, fileNames };
    },
    /** Maintenance-only: never called by public upload/signing requests. Keeps every claimed file. */
    async cleanupExpired() {
      return sql.begin(async (tx) => {
        const expired =
          await tx`SELECT token_hash FROM provider_agreement_uploads u WHERE expires_at<now()-interval '1 day' AND provider_id IS NULL AND NOT EXISTS(SELECT 1 FROM provider_agreement_files f WHERE f.token_hash=u.token_hash AND f.provider_id IS NOT NULL) ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED`;
        for (const row of expired) {
          await tx`DELETE FROM provider_agreement_files WHERE token_hash=${row.token_hash} AND provider_id IS NULL`;
          await tx`DELETE FROM provider_agreement_uploads WHERE token_hash=${row.token_hash} AND provider_id IS NULL`;
        }
        return expired.length;
      });
    },
    async download(fileId: string, providerId: string) {
      const [f] =
        await sql`SELECT name,mime,bytes FROM provider_agreement_files WHERE id=${uuid(fileId)} AND provider_id=${uuid(providerId)} AND verified`;
      if (!f) throw new AgreementError("not_found", 404);
      return {
        name: String(f.name),
        mime: String(f.mime),
        bytes: Buffer.from(f.bytes),
      };
    },
  };
}
