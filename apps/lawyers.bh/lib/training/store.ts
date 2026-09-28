import { createHash, randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { fileKind, parseApplication, parseFilters, parseManifest, parseReview, validatePdf } from "./domain";
import { CHUNK_BYTES, TrainingError, type FileKind, type ManifestFile, type TrainingApplication, type TrainingSummary } from "./types";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function tokenHash(value: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new TrainingError("upload_expired", 404);
  return hash(value);
}
function validId(id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new TrainingError("not_found", 404);
}
function summary(row: Record<string, unknown>): TrainingSummary {
  return { id: String(row.id), reference: String(row.reference), fullName: String(row.full_name), email: String(row.email), type: row.type as TrainingSummary["type"], status: row.status as TrainingSummary["status"], version: Number(row.version), createdAt: new Date(row.created_at as string).toISOString(), archivedAt: row.archived_at ? new Date(row.archived_at as string).toISOString() : null };
}
export function createTrainingStore(sql: Sql) {
  async function getApplication(id: string): Promise<TrainingApplication> {
    validId(id);
    const [row] = await sql`SELECT *, data->>'fullName' AS full_name FROM training_applications WHERE id=${id}`;
    if (!row) throw new TrainingError("not_found", 404);
    const files = await sql`SELECT kind,name,octet_length(bytes) AS size FROM training_attachments WHERE application_id=${id} ORDER BY kind`;
    return { ...row.data, ...summary(row), notes: row.notes, updatedAt: new Date(row.updated_at).toISOString(), files: files.map(f => ({ kind: f.kind, name: f.name, size: Number(f.size) })) };
  }
  return {
    getApplication,
    async startUpload(value: unknown, files: unknown, clientKey: string) {
      // Quota is committed separately, including failed starts; never trust client-supplied identity.
      const [bucket] = await sql`INSERT INTO training_rate_limits(key) VALUES (${hash(clientKey)}) ON CONFLICT(key) DO UPDATE SET
        attempts=CASE WHEN training_rate_limits.window_start<now()-interval '1 hour' THEN 1 ELSE training_rate_limits.attempts+1 END,
        window_start=CASE WHEN training_rate_limits.window_start<now()-interval '1 hour' THEN now() ELSE training_rate_limits.window_start END RETURNING attempts`;
      if (Number(bucket.attempts) > 5) throw new TrainingError("rate_limited", 429);
      const data = parseApplication(value); const manifest = parseManifest(files);
      await sql`DELETE FROM training_uploads WHERE token_hash IN (SELECT token_hash FROM training_uploads WHERE expires_at<now() ORDER BY expires_at LIMIT 100)`;
      await sql`DELETE FROM training_rate_limits WHERE key IN (SELECT key FROM training_rate_limits WHERE window_start<now()-interval '2 hours' LIMIT 100)`;
      const token = randomBytes(32).toString("hex");
      await sql`INSERT INTO training_uploads(token_hash,data,manifest) VALUES (${hash(token)},${JSON.stringify(data)}::text::jsonb,${JSON.stringify(manifest)}::text::jsonb)`;
      return { token };
    },
    async appendUpload(token: string, kindValue: string, offset: number, bytes: Buffer) {
      const key = tokenHash(token); const kind = fileKind(kindValue);
      if (!Number.isSafeInteger(offset) || offset < 0 || bytes.length < 1 || bytes.length > CHUNK_BYTES) throw new TrainingError("invalid_chunk");
      await sql.begin(async tx => {
        const [row] = await tx`SELECT * FROM training_uploads WHERE token_hash=${key} AND expires_at>now() FOR UPDATE`;
        if (!row || row.application_id) throw new TrainingError("upload_expired", 404);
        const file = (row.manifest as ManifestFile[]).find(f => f.kind === kind);
        if (!file) throw new TrainingError("invalid_files");
        const column = kind === "cv" ? "cv_bytes" : "letter_bytes";
        const current = Buffer.from(row[column]);
        if (offset + bytes.length <= current.length && current.subarray(offset, offset + bytes.length).equals(bytes)) return;
        if (offset !== current.length || offset + bytes.length > file.size) throw new TrainingError("invalid_chunk", 409);
        await tx`UPDATE training_uploads SET ${tx(column)}=${tx(column)} || ${bytes} WHERE token_hash=${key}`;
      });
    },
    async finalizeUpload(token: string): Promise<{ reference: string }> {
      const key = tokenHash(token);
      return await sql.begin(async tx => {
        const [upload] = await tx`SELECT * FROM training_uploads WHERE token_hash=${key} AND expires_at>now() FOR UPDATE`;
        if (!upload) throw new TrainingError("upload_expired", 404);
        if (upload.application_id) {
          const [existing] = await tx`SELECT reference FROM training_applications WHERE id=${upload.application_id}`;
          return { reference: String(existing.reference) };
        }
        const files = upload.manifest as ManifestFile[];
        for (const f of files) {
          const bytes = Buffer.from(f.kind === "cv" ? upload.cv_bytes : upload.letter_bytes);
          if (bytes.length !== f.size) throw new TrainingError("incomplete_upload", 409);
          await validatePdf(bytes);
        }
        const reference = `TRN-${randomBytes(8).toString("hex").toUpperCase()}`;
        const [application] = await tx`INSERT INTO training_applications(reference,type,email,data) VALUES (${reference},${upload.data.type},${upload.data.email},${JSON.stringify(upload.data)}::text::jsonb) RETURNING id`;
        for (const f of files) await tx`INSERT INTO training_attachments(application_id,kind,name,bytes) VALUES (${application.id},${f.kind},${f.name},${Buffer.from(f.kind === "cv" ? upload.cv_bytes : upload.letter_bytes)})`;
        // Retain only the completion receipt for retries, not a second copy of the personal data/files.
        await tx`UPDATE training_uploads SET application_id=${application.id},cv_bytes=${Buffer.alloc(0)},letter_bytes=${Buffer.alloc(0)},data='{}'::jsonb,manifest='[]'::jsonb WHERE token_hash=${key}`;
        return { reference };
      });
    },
    async listApplications(value: unknown) {
      const f = parseFilters(value);
      const condition = sql`(archived_at IS NOT NULL)=${f.archived} AND (${f.type}='' OR type=${f.type}) AND (${f.status}='' OR status=${f.status})
        AND (${f.query}='' OR position(lower(${f.query}) in lower(data->>'fullName'))>0 OR position(lower(${f.query}) in lower(email))>0 OR position(lower(${f.query}) in lower(reference))>0)`;
      const [rows, count] = await Promise.all([
        sql`SELECT id,reference,type,email,status,version,created_at,archived_at,data->>'fullName' AS full_name FROM training_applications WHERE ${condition} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ${(f.page-1)*25}`,
        sql`SELECT count(*)::int AS total FROM training_applications WHERE ${condition}`,
      ]);
      return { applications: rows.map(summary), total: Number(count[0].total) };
    },
    async reviewApplication(id: string, value: unknown, adminId: string) {
      validId(id); const change = parseReview(value);
      const rows = "action" in change
        ? await sql`UPDATE training_applications SET archived_at=CASE WHEN ${change.action}='archive' THEN now() ELSE NULL END,
            archived_by_admin_id=CASE WHEN ${change.action}='archive' THEN ${adminId}::uuid ELSE NULL END,version=version+1,updated_at=now(),updated_by_admin_id=${adminId}
            WHERE id=${id} AND version=${change.version} RETURNING id`
        : await sql`UPDATE training_applications SET status=${change.status},notes=${change.notes},version=version+1,updated_at=now(),updated_by_admin_id=${adminId}
            WHERE id=${id} AND version=${change.version} RETURNING id`;
      if (!rows.length) throw new TrainingError("stale_record", 409);
      return getApplication(id);
    },
    async attachment(id: string, kindValue: string): Promise<{ bytes: Buffer; kind: FileKind; reference: string }> {
      validId(id); const kind = fileKind(kindValue);
      const [row] = await sql`SELECT a.bytes,r.reference FROM training_attachments a JOIN training_applications r ON r.id=a.application_id WHERE a.application_id=${id} AND a.kind=${kind}`;
      if (!row) throw new TrainingError("not_found", 404);
      return { bytes: Buffer.from(row.bytes), kind, reference: String(row.reference) };
    },
  };
}
