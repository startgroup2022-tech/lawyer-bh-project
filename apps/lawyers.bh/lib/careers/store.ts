import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { PDFDocument } from "pdf-lib";
import { parseApplication, parseJob, parseReview, validatePdfBytes } from "./domain";
import { APPLICATION_STATUSES, CareersError, CV_CHUNK_BYTES, CV_MAX_BYTES, type Application, type Job } from "./types";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function tokenHash(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new CareersError("upload_expired", 404);
  return hash(token);
}
export function validId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new CareersError("not_found", 404);
  return id;
}
function jobRow(row: Record<string, unknown>): Job {
  return { ...(row.content as Job), id: String(row.id), slug: String(row.slug), status: row.status as Job["status"], closesAt: new Date(row.closes_at as string).toISOString(), publishedAt: row.published_at ? new Date(row.published_at as string).toISOString() : null, updatedAt: new Date(row.updated_at as string).toISOString(), version: Number(row.version) };
}
export function createCareersStore(sql: Sql) {
  return {
    async jobOptions() {
      const rows = await sql`SELECT id,content->>'titleAr' AS "titleAr",content->>'titleEn' AS "titleEn" FROM careers_jobs ORDER BY updated_at DESC`;
      return rows.map((r) => ({ id: String(r.id), titleAr: String(r.titleAr), titleEn: String(r.titleEn) }));
    },
    async listJobs(publicOnly = false, page = 1) {
      const offset = (Math.max(1, Math.floor(page) || 1) - 1) * 24;
      const rows = publicOnly
        ? await sql`SELECT * FROM careers_jobs WHERE status='published' AND closes_at>now() ORDER BY published_at DESC,id LIMIT 25 OFFSET ${offset}`
        : await sql`SELECT * FROM careers_jobs ORDER BY updated_at DESC,id LIMIT 25 OFFSET ${offset}`;
      return { jobs: rows.slice(0, 24).map(jobRow), hasMore: rows.length > 24 };
    },
    async sitemapJobs() {
      const rows = await sql`SELECT slug, updated_at FROM careers_jobs WHERE status='published' AND closes_at>now() ORDER BY id`;
      return rows.map((r) => ({ slug: String(r.slug), updatedAt: new Date(r.updated_at).toISOString() }));
    },
    async findPublicJob(slug: string) {
      const [row] = await sql`SELECT * FROM careers_jobs WHERE slug=${slug} AND status IN ('published','closed')`;
      return row ? jobRow(row) : null;
    },
    async saveJob(value: unknown, adminId: string, id?: string, version?: number) {
      const input = parseJob(value);
      // Drizzle shares this client and installs pass-through JSON serializers.
      // Explicit text -> jsonb works with both that client and vanilla postgres-js.
      const content = JSON.stringify(input);
      if (id) {
        validId(id);
        if (!Number.isSafeInteger(version) || Number(version) < 1) throw new CareersError("invalid_version");
        const [row] = await sql`UPDATE careers_jobs SET content=${content}::text::jsonb,status=${input.status},closes_at=${input.closesAt},
          published_at=CASE WHEN ${input.status}='published' THEN coalesce(published_at,now()) ELSE published_at END,
          updated_at=now(),version=version+1,updated_by_admin_id=${adminId} WHERE id=${id} AND version=${version!} RETURNING *`;
        if (!row) throw new CareersError("stale_record", 409);
        return jobRow(row);
      }
      const slug = `${input.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "position"}-${randomUUID().slice(0, 8)}`;
      const [row] = await sql`INSERT INTO careers_jobs(slug,content,status,closes_at,published_at,updated_by_admin_id)
        VALUES (${slug},${content}::text::jsonb,${input.status},${input.closesAt},CASE WHEN ${input.status}='published' THEN now() ELSE NULL END,${adminId}) RETURNING *`;
      return jobRow(row);
    },
    async startApplication(jobId: string, value: unknown, size: number, filename: string, clientKey: string) {
      validId(jobId);
      const data = parseApplication(value);
      if (!Number.isSafeInteger(size) || size < 12 || size > CV_MAX_BYTES || !/\.pdf$/i.test(filename)) throw new CareersError("invalid_cv_size");
      // Commit the rate bucket independently so failed/repeated attempts also consume the quota.
      const [bucket] = await sql`INSERT INTO careers_rate_limits(key) VALUES (${hash(clientKey)}) ON CONFLICT(key) DO UPDATE SET
        attempts=CASE WHEN careers_rate_limits.window_start<now()-interval '1 hour' THEN 1 ELSE careers_rate_limits.attempts+1 END,
        window_start=CASE WHEN careers_rate_limits.window_start<now()-interval '1 hour' THEN now() ELSE careers_rate_limits.window_start END RETURNING attempts`;
      if (Number(bucket.attempts) > 5) throw new CareersError("rate_limited", 429);
      await sql`DELETE FROM careers_uploads WHERE expires_at<now()`;
      await sql`DELETE FROM careers_rate_limits WHERE window_start<now()-interval '2 hours'`;
      const token = randomBytes(32).toString("hex");
      await sql.begin(async (tx) => {
        const [job] = await tx`SELECT id FROM careers_jobs WHERE id=${jobId} AND status='published' AND closes_at>now() FOR SHARE`;
        if (!job) throw new CareersError("job_closed", 409);
        const [existing] = await tx`SELECT id FROM careers_applications WHERE job_id=${jobId} AND email=${data.email}`;
        if (existing) throw new CareersError("already_applied", 409);
        await tx`INSERT INTO careers_uploads(token_hash,job_id,data,expected_size) VALUES (${hash(token)},${jobId},${JSON.stringify(data)}::text::jsonb,${size})`;
      });
      return { token };
    },
    async appendUpload(token: string, offset: number, bytes: Buffer) {
      const key = tokenHash(token);
      if (!Number.isSafeInteger(offset) || offset < 0 || bytes.length < 1 || bytes.length > CV_CHUNK_BYTES) throw new CareersError("invalid_chunk");
      await sql.begin(async (tx) => {
        const [row] = await tx`SELECT bytes,expected_size,application_id FROM careers_uploads WHERE token_hash=${key} AND expires_at>now() FOR UPDATE`;
        if (!row || row.application_id) throw new CareersError("upload_expired", 404);
        const current = Buffer.from(row.bytes);
        if (offset + bytes.length <= current.length && current.subarray(offset, offset + bytes.length).equals(bytes)) return;
        if (offset !== current.length || offset + bytes.length > row.expected_size) throw new CareersError("invalid_chunk", 409);
        await tx`UPDATE careers_uploads SET bytes=bytes || ${bytes} WHERE token_hash=${key}`;
      });
    },
    async finalizeUpload(token: string): Promise<string> {
      const key = tokenHash(token);
      return await sql.begin(async (tx) => {
        const [upload] = await tx`SELECT * FROM careers_uploads WHERE token_hash=${key} AND expires_at>now() FOR UPDATE`;
        if (!upload) throw new CareersError("upload_expired", 404);
        if (upload.application_id) return String(upload.application_id);
        const [job] = await tx`SELECT id FROM careers_jobs WHERE id=${upload.job_id} AND status='published' AND closes_at>now() FOR SHARE`;
        if (!job) throw new CareersError("job_closed", 409);
        const bytes = Buffer.from(upload.bytes);
        if (bytes.length !== upload.expected_size) throw new CareersError("incomplete_upload", 409);
        validatePdfBytes(bytes);
        try { const pdf = await PDFDocument.load(bytes, { updateMetadata: false }); if (!pdf.getPageCount()) throw new Error("empty"); } catch { throw new CareersError("invalid_pdf"); }
        const [saved] = await tx`INSERT INTO careers_applications(job_id,email,data,cv) VALUES (${upload.job_id},${upload.data.email},${JSON.stringify(upload.data)}::text::jsonb,${bytes})
          ON CONFLICT(job_id,email) DO NOTHING RETURNING id`;
        if (!saved) throw new CareersError("already_applied", 409);
        await tx`UPDATE careers_uploads SET application_id=${saved.id},bytes=${Buffer.alloc(0)},data='{}'::jsonb WHERE token_hash=${key}`;
        return String(saved.id);
      }) as string;
    },
    async listApplications(filters: { jobId?: string; status?: string; query?: string; page?: number } = {}) {
      if (filters.jobId) validId(filters.jobId);
      if (filters.status && !APPLICATION_STATUSES.includes(filters.status as Application["status"])) throw new CareersError("invalid_input");
      const query = (filters.query ?? "").trim().slice(0, 150);
      const jobId = filters.jobId || null; const status = filters.status || null;
      const page = Math.max(1, Math.floor(filters.page ?? 1) || 1);
      const rows = await sql`SELECT a.id,a.job_id,a.data,a.status,a.notes,a.version,a.created_at,
        j.content->>'titleAr' AS title_ar,j.content->>'titleEn' AS title_en, count(*) OVER() AS total
        FROM careers_applications a JOIN careers_jobs j ON j.id=a.job_id
        WHERE (${jobId}::uuid IS NULL OR a.job_id=${jobId}::uuid) AND (${status}::text IS NULL OR a.status=${status})
        AND (${query}='' OR strpos(lower(a.data->>'fullName'),lower(${query}))>0 OR strpos(a.email,lower(${query}))>0)
        ORDER BY a.created_at DESC,a.id LIMIT 25 OFFSET ${(page - 1) * 25}`;
      return { total: Number(rows[0]?.total ?? 0), applications: rows.map((r) => ({ ...r.data, id: r.id, jobId: r.job_id, jobTitleAr: r.title_ar, jobTitleEn: r.title_en, status: r.status, notes: r.notes, version: r.version, createdAt: new Date(r.created_at).toISOString() }) as Application) };
    },
    async reviewApplication(id: string, value: unknown, adminId: string) {
      validId(id); const input = parseReview(value);
      const [row] = await sql`UPDATE careers_applications SET status=${input.status},notes=${input.notes},version=version+1,updated_at=now(),updated_by_admin_id=${adminId}
        WHERE id=${id} AND version=${input.version} RETURNING id`;
      if (!row) throw new CareersError("stale_record", 409);
    },
    async getCv(id: string): Promise<Buffer> {
      validId(id);
      const [row] = await sql`SELECT cv FROM careers_applications WHERE id=${id}`;
      if (!row) throw new CareersError("not_found", 404);
      return Buffer.from(row.cv);
    },
  };
}
