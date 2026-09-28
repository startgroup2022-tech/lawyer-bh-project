import "server-only";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { get, issueSignedToken, presignUrl } from "@vercel/blob";
import sharp from "sharp";
import { sqlClient as sql } from "@/lib/db/client";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { validatePdf } from "@/lib/training/domain";
import { parseManifest, type UploadItem, type UploadWorkflow } from "./policy";
import { withDocumentField } from "./document-error";
import { readBounded, validateSession } from "./validation";

const COOKIE = "private_upload_browser";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const uploadId = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      value,
    )
  )
    throw new Error("invalid_upload");
  return value;
};
export function privateToken() {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Private uploads are not configured");
  return token;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
async function principal(workflow: UploadWorkflow, invitation: unknown) {
  if (workflow === "import") {
    const admin = await requireAdminPermission("manage_lawyers");
    if (!admin) throw new Error("Forbidden");
    return String(admin.id);
  }
  if (workflow === "complete") {
    if (typeof invitation !== "string" || !/^[a-f0-9]{64}$/.test(invitation))
      throw new Error("Invalid invitation");
    const rows =
      await sql`SELECT id FROM bahrain_lawyers WHERE invite_token=${invitation} AND invite_token_expires_at>now() AND profile_completed=false LIMIT 1`;
    if (!rows[0]) throw new Error("Invalid invitation");
    return hash(invitation);
  }
  return "";
}
type StoredItem = UploadItem & { id: string; path: string };
export async function startDirectUpload(
  request: Request,
  input: { workflow?: unknown; files?: unknown; inviteToken?: unknown },
) {
  if (!sameOrigin(request)) throw new Error("Forbidden");
  privateToken();
  const manifest = parseManifest(input.workflow, input.files),
    workflow = input.workflow as UploadWorkflow;
  const owner = await principal(workflow, input.inviteToken);
  const key = hash(
    `${workflow}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}`,
  );
  const [quota] =
    await sql`INSERT INTO direct_upload_limits(key) VALUES (${key}) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN direct_upload_limits.window_start<now()-interval '1 hour' THEN 1 ELSE direct_upload_limits.attempts+1 END, window_start=CASE WHEN direct_upload_limits.window_start<now()-interval '1 hour' THEN now() ELSE direct_upload_limits.window_start END RETURNING attempts`;
  if (quota.attempts > 10) throw new Error("rate_limited");
  const jar = await cookies();
  let browser = jar.get(COOKIE)?.value;
  if (!browser || !/^[a-f0-9]{64}$/.test(browser)) {
    browser = randomBytes(32).toString("hex");
    jar.set(COOKIE, browser, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 86400,
    });
  }
  const session = randomUUID();
  const stored = manifest.map((item) => {
    const id = randomUUID();
    return { ...item, id, path: `direct-staging/${session}/${id}` };
  });
  await sql`INSERT INTO direct_upload_sessions(id,browser_hash,workflow,principal,files) VALUES (${session},${hash(browser)},${workflow},${owner},${JSON.stringify(stored)}::text::jsonb)`;
  const files = await Promise.all(
    stored.map(async (item) => {
      const validUntil = Date.now() + 10 * 60 * 1000;
      const signed = await issueSignedToken({
        token: privateToken(),
        pathname: item.path,
        operations: ["put"],
        maximumSizeInBytes: item.size,
        allowedContentTypes: [item.type],
        validUntil,
      });
      const { presignedUrl } = await presignUrl(signed, {
        operation: "put",
        access: "private",
        pathname: item.path,
        maximumSizeInBytes: item.size,
        allowedContentTypes: [item.type],
        allowOverwrite: false,
        addRandomSuffix: false,
        validUntil,
      });
      return {
        id: item.id,
        field: item.field,
        type: item.type,
        url: presignedUrl,
      };
    }),
  );
  return { session, files };
}
export async function validateUploadBytes(bytes: Buffer, type: string) {
  if (type === "application/pdf") await validatePdf(bytes);
  else if (type.startsWith("image/")) {
    const metadata = await sharp(bytes, {
      limitInputPixels: 40_000_000,
    }).metadata();
    const expected = ["image/avif", "image/heic", "image/heif"].includes(type)
      ? "heif"
      : type.slice(6);
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.format === "svg" ||
      metadata.format !== expected
    )
      throw new Error("invalid_upload_type");
  } else if (
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    if (!bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
      throw new Error("invalid_upload_type");
  } else throw new Error("invalid_upload_type");
}
export async function readDirectForm(
  request: Request,
  workflow: UploadWorkflow,
) {
  const form = await request.formData();
  if (!form.has("uploadSession")) return form;
  if (!sameOrigin(request)) throw new Error("Forbidden");
  const id = uploadId(form.get("uploadSession"));
  const browser = (await cookies()).get(COOKIE)?.value || "";
  const owner = await principal(workflow, form.get("token"));
  const [session] =
    await sql`SELECT * FROM direct_upload_sessions WHERE id=${id}`;
  validateSession(session as never, workflow, hash(browser), owner);
  const items = session.files as StoredItem[];
  parseManifest(workflow, items);
  for (const item of items) {
    if (form.get(item.field) !== `direct:${item.id}`)
      throw new Error("invalid_upload_reference");
    const blob = await get(item.path, {
      access: "private",
      token: privateToken(),
      useCache: false,
    });
    if (!blob || !blob.stream) throw new Error("upload_missing");
    const bytes = await readBounded(blob.stream, item.size);
    if (bytes.length !== item.size) throw new Error("invalid_upload_size");
    await withDocumentField(item.field, () => validateUploadBytes(bytes, item.type));
    form.set(
      item.field,
      new File([new Uint8Array(bytes)], item.name, { type: item.type }),
    );
  }
  return form;
}
