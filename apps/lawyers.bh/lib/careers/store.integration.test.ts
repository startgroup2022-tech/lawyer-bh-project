import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PDFDocument } from "pdf-lib";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createCareersStore } from "./store";
import { parseJob } from "./domain";

const url = process.env.CAREERS_TEST_DATABASE_URL;
let sql: ReturnType<typeof postgres>;
let store: ReturnType<typeof createCareersStore>;
const actor = randomUUID();
const input = { titleAr: "وظيفة اختبار", titleEn: "Test position", descriptionAr: "وصف الوظيفة", descriptionEn: "Job description", requirementsAr: "المتطلبات", requirementsEn: "Requirements", country: "BH", cityAr: "المنامة", cityEn: "Manama", employmentType: "FULL_TIME", workMode: "onsite", salary: "", closesAt: "2030-12-31T20:59:59Z", status: "published" };
const applicant = { fullName: "Local Applicant", email: "local@example.invalid", phone: "+97333333333", location: "Manama", qualification: "Law", yearsExperience: 2, message: "Test only", consent: true, website: "" };
let pdf: Buffer;

describe.skipIf(!url)("careers isolated PostgreSQL lifecycle", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55437" || parsed.pathname !== "/careers_test") throw new Error("Only the dedicated local careers_test database is allowed");
    sql = postgres(url!, { max: 4, prepare: false, onnotice: () => {} });
    drizzle(sql); // Match lib/db/client: Drizzle replaces JSON/date serializers on this shared client.
    await sql.unsafe("DROP TABLE IF EXISTS careers_uploads, careers_rate_limits, careers_applications, careers_jobs");
    const migration = readFileSync("drizzle/0078_careers.sql", "utf8");
    await sql.unsafe(migration); await sql.unsafe(migration);
    store = createCareersStore(sql);
    const doc = await PDFDocument.create(); doc.addPage(); pdf = Buffer.from(await doc.save());
  });
  afterAll(async () => { await sql?.end(); });

  it("publishes only open jobs and prevents stale edits", async () => {
    const job = await store.saveJob(input, actor);
    expect((await store.listJobs(true)).jobs.map((j) => j.id)).toContain(job.id);
    const closed = await store.saveJob({ ...job, status: "closed" }, actor, job.id, job.version);
    expect((await store.listJobs(true)).jobs.map((j) => j.id)).not.toContain(job.id);
    expect(closed.version).toBe(2);
    await expect(store.saveJob(job, actor, job.id, job.version)).rejects.toThrow("stale_record");
  });
  it("accepts a chunked PDF once and retains applications when a job is archived", async () => {
    const job = await store.saveJob(input, actor);
    const upload = await store.startApplication(job.id, applicant, pdf.length, "cv.pdf", "ip1");
    await store.appendUpload(upload.token, 0, pdf.subarray(0, 200));
    await store.appendUpload(upload.token, 0, pdf.subarray(0, 200)); // network retry
    await expect(store.finalizeUpload(upload.token)).rejects.toThrow("incomplete_upload");
    await store.appendUpload(upload.token, 200, pdf.subarray(200));
    const [a, b] = await Promise.all([store.finalizeUpload(upload.token), store.finalizeUpload(upload.token)]);
    expect(a).toBe(b);
    expect((await store.getCv(a)).equals(pdf)).toBe(true);
    const listed = await store.listApplications({ jobId: job.id });
    expect(listed.total).toBe(1);
    expect(listed.applications[0]).not.toHaveProperty("cv");
    await store.reviewApplication(a, { status: "interview", notes: "Schedule a call", version: 1 }, actor);
    await expect(store.reviewApplication(a, { status: "rejected", notes: "", version: 1 }, actor)).rejects.toThrow("stale_record");
    await store.saveJob({ ...job, status: "archived" }, actor, job.id, job.version);
    expect((await store.listApplications({ query: "Schedule a call" })).total).toBe(0);
    expect((await store.listApplications({ jobId: job.id, status: "interview" })).total).toBe(1);
    expect(await store.findPublicJob(job.slug)).toBeNull();
  });
  it("rejects closed/expired jobs on both start and final submission", async () => {
    const job = await store.saveJob(input, actor);
    const upload = await store.startApplication(job.id, applicant, pdf.length, "cv.pdf", "ip2");
    await store.appendUpload(upload.token, 0, pdf);
    await sql`UPDATE careers_jobs SET closes_at=now()-interval '1 minute' WHERE id=${job.id}`;
    await expect(store.finalizeUpload(upload.token)).rejects.toThrow("job_closed");
    await expect(store.startApplication(job.id, applicant, pdf.length, "cv.pdf", "ip3")).rejects.toThrow("job_closed");
  });
  it("rejects invalid capabilities, non-PDF content and oversized chunks", async () => {
    await expect(store.appendUpload("0".repeat(64), 0, pdf)).rejects.toThrow("upload_expired");
    const job = await store.saveJob(parseJob(input), actor);
    const upload = await store.startApplication(job.id, applicant, pdf.length, "cv.pdf", "ip4");
    await expect(store.appendUpload(upload.token, 0, Buffer.alloc(1048577))).rejects.toThrow("invalid_chunk");
    await store.appendUpload(upload.token, 0, Buffer.alloc(pdf.length, 65));
    await expect(store.finalizeUpload(upload.token)).rejects.toThrow("invalid_pdf");
    await sql`UPDATE careers_uploads SET expires_at=now()-interval '1 minute'`;
    await expect(store.finalizeUpload(upload.token)).rejects.toThrow("upload_expired");
  });
  it("limits upload starts durably and rejects duplicate email applications", async () => {
    const job = await store.saveJob(input, actor);
    const upload = await store.startApplication(job.id, applicant, pdf.length, "cv.pdf", "duplicate-test");
    await store.appendUpload(upload.token, 0, pdf); await store.finalizeUpload(upload.token);
    await expect(store.startApplication(job.id, applicant, pdf.length, "cv.pdf", "duplicate-test")).rejects.toThrow("already_applied");
    for (let i = 0; i < 5; i++) await store.startApplication(job.id, { ...applicant, email: `limit${i}@example.invalid` }, pdf.length, "cv.pdf", "rate-test");
    await expect(store.startApplication(job.id, { ...applicant, email: "six@example.invalid" }, pdf.length, "cv.pdf", "rate-test")).rejects.toThrow("rate_limited");
  });
});
