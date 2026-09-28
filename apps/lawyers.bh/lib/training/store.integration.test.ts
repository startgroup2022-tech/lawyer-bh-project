import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { PDFDocument } from "pdf-lib";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createTrainingStore } from "./store";

const url = process.env.TRAINING_TEST_DATABASE_URL;
const applicant = { type: "law", fullName: "Training Test", email: "training@example.invalid", phone: "+97333333333", location: "Manama", university: "University", qualification: "Student", specialization: "Law", startDate: "2099-10-01", durationWeeks: 4, message: "Test notes", consent: true };
const admin = "00000000-0000-4000-8000-000000000001";
let sql: ReturnType<typeof postgres>, store: ReturnType<typeof createTrainingStore>, pdf: Buffer;
const key = (t: string) => createHash("sha256").update(t).digest("hex");
describe.skipIf(!url)("training isolated persistence", () => {
  beforeAll(async () => {
    const u = new URL(url!);
    if (u.hostname !== "127.0.0.1" || u.port !== "55437" || u.pathname !== "/training_test") throw new Error("Isolated training_test only");
    sql = postgres(url!, { max: 4, onnotice: () => {} }); store = createTrainingStore(sql);
    await sql.unsafe("DROP TABLE IF EXISTS training_uploads, training_attachments, training_applications, training_rate_limits");
    const migration = readFileSync("drizzle/0083_training_applications.sql", "utf8");
    await sql.unsafe(migration); await sql.unsafe(migration);
    const document = await PDFDocument.create(); document.addPage(); pdf = Buffer.from(await document.save());
  });
  afterAll(async () => { await sql?.end(); });
  async function begin(letter = false, client = crypto.randomUUID()) {
    return store.startUpload(applicant, [{ kind: "cv", name: "cv.pdf", size: pdf.length }, ...(letter ? [{ kind: "university_letter", name: "university.pdf", size: pdf.length }] : [])], client);
  }
  it("atomically completes both files and retries without duplicate applications", async () => {
    const { token } = await begin(true);
    await store.appendUpload(token, "cv", 0, pdf); await store.appendUpload(token, "cv", 0, pdf);
    await expect(store.finalizeUpload(token)).rejects.toThrow("incomplete_upload");
    expect((await store.listApplications({})).total).toBe(0);
    await store.appendUpload(token, "university_letter", 0, pdf);
    const [first, retry] = await Promise.all([store.finalizeUpload(token), store.finalizeUpload(token)]);
    expect(first).toEqual(retry); expect(first.reference).toMatch(/^TRN-[A-F0-9]{16}$/);
    const list = await store.listApplications({}); expect(list.total).toBe(1);
    expect(list.applications[0]).not.toHaveProperty("files");
    const detail = await store.getApplication(list.applications[0].id);
    expect(detail.files).toHaveLength(2); expect(detail.message).toBe("Test notes");
    expect((await store.attachment(detail.id, "cv")).bytes).toEqual(pdf);
    expect((await store.attachment(detail.id, "university_letter")).bytes).toEqual(pdf);
    const [session] = await sql`SELECT cv_bytes,letter_bytes FROM training_uploads WHERE token_hash=${key(token)}`;
    expect(session.cv_bytes.length + session.letter_bytes.length).toBe(0);
  });
  it("supports CV-only completion but rejects undeclared files", async () => {
    const { token } = await begin();
    await expect(store.appendUpload(token, "university_letter", 0, pdf)).rejects.toThrow("invalid_files");
    await store.appendUpload(token, "cv", 0, pdf);
    const done = await store.finalizeUpload(token);
    const list = await store.listApplications({ query: done.reference });
    expect(list.total).toBe(1);
    await expect(store.attachment(list.applications[0].id, "university_letter")).rejects.toThrow("not_found");
  });
  it("preserves status and attachments through archive/restore, rejects stale saves", async () => {
    const row = (await store.listApplications({})).applications[0];
    const changed = await store.reviewApplication(row.id, { version: row.version, status: "accepted", notes: "private" }, admin);
    await expect(store.reviewApplication(row.id, { version: row.version, status: "rejected" }, admin)).rejects.toThrow("stale_record");
    const archived = await store.reviewApplication(row.id, { version: changed.version, action: "archive" }, admin);
    expect(archived.status).toBe("accepted"); expect(archived.archivedAt).not.toBeNull();
    expect((await store.listApplications({ archived: true, query: row.reference })).total).toBe(1);
    expect((await store.listApplications({ query: row.reference })).total).toBe(0);
    const restored = await store.reviewApplication(row.id, { version: archived.version, action: "restore" }, admin);
    expect(restored.status).toBe("accepted"); expect(restored.notes).toBe("private"); expect(restored.archivedAt).toBeNull();
    expect((await store.attachment(row.id, "cv")).bytes).toEqual(pdf);
  });
  it("rejects malformed, oversized and out-of-order chunks", async () => {
    const { token } = await begin();
    await expect(store.appendUpload(token, "cv", 1, pdf)).rejects.toThrow("invalid_chunk");
    await expect(store.appendUpload(token, "cv", 0, Buffer.alloc(1048577))).rejects.toThrow("invalid_chunk");
    await expect(store.appendUpload("bad", "cv", 0, pdf)).rejects.toThrow("upload_expired");
    const bad = Buffer.from("%PDF-1.7 not really a PDF %%EOF");
    const upload = await store.startUpload(applicant, [{ kind: "cv", name: "cv.pdf", size: bad.length }], crypto.randomUUID());
    await store.appendUpload(upload.token, "cv", 0, bad);
    await expect(store.finalizeUpload(upload.token)).rejects.toThrow("invalid_pdf");
  });
  it("expires uploads and limits starts across store instances", async () => {
    const { token } = await begin();
    await sql`UPDATE training_uploads SET expires_at=now()-interval '1 minute' WHERE token_hash=${key(token)}`;
    await expect(store.finalizeUpload(token)).rejects.toThrow("upload_expired");
    const client = crypto.randomUUID();
    for (let n = 0; n < 5; n++) await begin(false, client);
    await expect(createTrainingStore(sql).startUpload(applicant, [{ kind: "cv", name: "cv.pdf", size: pdf.length }], client)).rejects.toThrow("rate_limited");
  });
});
