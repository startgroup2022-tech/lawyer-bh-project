import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const state = vi.hoisted(() => ({
  sql: null as unknown,
  cookie: "",
  admin: null as { id: string } | null,
  bytes: new Map<string, Uint8Array>(),
}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: (...args: unknown[]) =>
    (state.sql as (...v: unknown[]) => unknown)(...args),
}));
vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: async () => state.admin,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: state.cookie }),
    set: (_: string, value: string) => {
      state.cookie = value;
    },
  }),
}));
vi.mock("@vercel/blob", () => ({
  issueSignedToken: async (input: unknown) => input,
  presignUrl: async (_: unknown, input: { pathname: string }) => ({
    presignedUrl: `https://storage.invalid/${input.pathname}`,
  }),
  get: async (path: string) =>
    state.bytes.has(path)
      ? { stream: new Blob([state.bytes.get(path)! as BlobPart]).stream() }
      : null,
  put: async (path: string, bytes: Uint8Array) => {
    state.bytes.set(path, bytes);
    return { pathname: path };
  },
  del: async (path: string) => {
    state.bytes.delete(path);
  },
}));
import {
  startDirectUpload,
  readDirectForm,
  validateUploadBytes,
} from "./server";
import { documentOwner, storePrivateDocument } from "./documents";

const url = process.env.UPLOAD_TEST_DATABASE_URL;
describe.skipIf(!url)("isolated direct upload sessions", () => {
  let sql: ReturnType<typeof postgres>;
  const schema = `upload_test_${randomUUID().replaceAll("-", "")}`;
  const request = (body?: FormData) =>
    new Request("https://app.test/api/join", {
      method: "POST",
      headers: { origin: "https://app.test", "x-forwarded-for": randomUUID() },
      body,
    });
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (
      parsed.hostname !== "127.0.0.1" ||
      parsed.port !== "55437" ||
      parsed.pathname !== "/agreement_test"
    )
      throw new Error("Isolated database only");
    sql = postgres(url!, {
      connection: { search_path: schema },
      onnotice: () => {},
    });
    state.sql = sql;
    await sql`CREATE SCHEMA ${sql(schema)}`;
    await sql.unsafe(
      readFileSync("drizzle/0088_private_direct_uploads.sql", "utf8"),
    );
    await sql`CREATE TABLE bahrain_lawyers(id uuid,country_code text,is_active boolean,license_file_url text,notes text,invite_token text,invite_token_expires_at timestamptz,profile_completed boolean)`;
    vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", "test-token");
  });
  beforeEach(() => {
    state.cookie = "";
    state.admin = null;
    state.bytes.clear();
  });
  afterAll(async () => {
    if (sql) {
      await sql`DROP SCHEMA ${sql(schema)} CASCADE`;
      await sql.end();
    }
    vi.unstubAllEnvs();
  });

  it("hydrates a real 5 MiB PDF from a small form, without trusting client URLs", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const raw = Buffer.from(await pdf.save());
    const bytes = Buffer.concat([
      raw,
      Buffer.from("\n%"),
      Buffer.alloc(5242880 - raw.length - 9, 32),
      Buffer.from("\n%%EOF\n"),
    ]);
    const session = await startDirectUpload(request(), {
      workflow: "join",
      files: ["licenseFile", "ibanCertificateFile"].map((field) => ({
        field,
        name: "test.pdf",
        type: "application/pdf",
        size: bytes.length,
      })),
    });
    const path = new URL(session.files[0].url).pathname.slice(1);
    state.bytes.set(path, bytes);
    state.bytes.set(new URL(session.files[1].url).pathname.slice(1), bytes);
    const form = new FormData();
    form.set("uploadSession", session.session);
    form.set("licenseFile", `direct:${session.files[0].id}`);
    form.set("email", "synthetic@example.test");
    form.set("ibanCertificateFile", `direct:${session.files[1].id}`);
    expect((await request(form).arrayBuffer()).byteLength).toBeLessThan(2000);
    const hydrated = await readDirectForm(request(form), "join");
    expect((hydrated.get("licenseFile") as File).size).toBe(5242880);
    expect((hydrated.get("ibanCertificateFile") as File).size).toBe(5242880);
    expect(hydrated.get("email")).toBe("synthetic@example.test");
    form.set("licenseFile", "https://arbitrary.invalid/file.pdf");
    await expect(readDirectForm(request(form), "join")).rejects.toThrow(
      "invalid_upload_reference",
    );
    form.set("licenseFile", `direct:${session.files[0].id}`);
    state.cookie = "another-browser";
    await expect(readDirectForm(request(form), "join")).rejects.toThrow(
      "upload_expired",
    );
  });
  it("rejects anonymous import and invalid invitations before issuing storage access", async () => {
    const files = [{ field: "file", name: "test.xlsx", type: "", size: 100 }];
    await expect(
      startDirectUpload(request(), { workflow: "import", files }),
    ).rejects.toThrow("Forbidden");
    await expect(
      startDirectUpload(request(), {
        workflow: "complete",
        files: [
          { field: "licenseFile", name: "test.pdf", type: "", size: 100 },
        ],
        inviteToken: "a".repeat(64),
      }),
    ).rejects.toThrow("Invalid invitation");
  });
  it("rejects expiry and another administrator on submission", async () => {
    state.admin = { id: "admin-one" };
    const session = await startDirectUpload(request(), {
      workflow: "import",
      files: [{ field: "file", name: "test.xlsx", type: "", size: 100 }],
    });
    const form = new FormData();
    form.set("uploadSession", session.session);
    form.set("file", `direct:${session.files[0].id}`);
    state.admin = { id: "admin-two" };
    await expect(readDirectForm(request(form), "import")).rejects.toThrow(
      "upload_expired",
    );
    state.admin = { id: "admin-one" };
    await sql`UPDATE direct_upload_sessions SET expires_at=now()-interval '1 second' WHERE id=${session.session}`;
    await expect(readDirectForm(request(form), "import")).rejects.toThrow(
      "upload_expired",
    );
  });
  it("rejects forged PDF and image contents", async () => {
    await expect(
      validateUploadBytes(
        Buffer.from("<html>not a PDF</html>"),
        "application/pdf",
      ),
    ).rejects.toThrow();
    await expect(
      validateUploadBytes(Buffer.from("<svg/>"), "image/png"),
    ).rejects.toThrow();
    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    await expect(validateUploadBytes(jpeg, "image/png")).rejects.toThrow();
  });
  it("requires an actual document column to establish ownership", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const stored = await storePrivateDocument(
      "bahrain/lawyers/license-files",
      Buffer.from(await pdf.save()),
      "application/pdf",
    );
    const documentId = stored.url.split("/").pop()!;
    const provider = randomUUID();
    await sql`INSERT INTO bahrain_lawyers(id,country_code,is_active,notes) VALUES (${provider},'BH',true,${stored.url})`;
    expect(await documentOwner(documentId)).toBeNull();
    await sql`UPDATE bahrain_lawyers SET license_file_url=${stored.url} WHERE id=${provider}`;
    expect(await documentOwner(documentId)).toMatchObject({
      id: provider,
      country_code: "BH",
      is_active: true,
    });
  });
});
