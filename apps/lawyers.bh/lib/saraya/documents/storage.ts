import "server-only";
import { del, issueSignedToken, presignUrl, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { privateToken, validateUploadBytes } from "@/lib/uploads/server";
import type { DocumentAdapter } from "./contracts";
import { localDocumentPath } from "./storage-path";

const privateBlobToken = () => process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
const localRoot = () =>
  process.env.SARAYA_LOCAL_DOCUMENT_ROOT?.trim() ||
  join(process.cwd(), ".data", "saraya-documents");

export const documentStorage: DocumentAdapter = {
  async put(input) {
    const bytes = Buffer.from(input.body);
    try {
      await validateUploadBytes(bytes, input.contentType);
    } catch {
      throw new Error("INVALID_DOCUMENT_CONTENT");
    }
    const token = privateBlobToken();
    if (!token && process.env.NODE_ENV !== "production") {
      const path = localDocumentPath(localRoot(), input.key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes, { flag: input.allowOverwrite ? "w" : "wx" });
      return;
    }
    await put(input.key, bytes, {
      access: "private",
      token: token || privateToken(),
      contentType: input.contentType,
      addRandomSuffix: false,
      allowOverwrite: input.allowOverwrite ?? false,
    });
  },
  async signedReadUrl(key, expiresInSeconds) {
    if (!privateBlobToken() && process.env.NODE_ENV !== "production") {
      throw new Error("LOCAL_DOCUMENT_DOWNLOAD_UNAVAILABLE");
    }
    const validUntil = Date.now() + expiresInSeconds * 1000;
    const signed = await issueSignedToken({
      token: privateToken(),
      pathname: key,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signed, {
      access: "private",
      operation: "get",
      pathname: key,
      validUntil,
    });
    return presignedUrl;
  },
  async delete(key) {
    const token = privateBlobToken();
    if (!token && process.env.NODE_ENV !== "production") {
      await rm(localDocumentPath(localRoot(), key), { force: true });
      return;
    }
    await del(key, { token: token || privateToken() });
  },
};

export async function readDocumentBytes(key: string): Promise<Uint8Array> {
  if (!privateBlobToken() && process.env.NODE_ENV !== "production") {
    return new Uint8Array(await readFile(localDocumentPath(localRoot(), key)));
  }
  const url = await documentStorage.signedReadUrl(key, 60);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("DOCUMENT_DOWNLOAD_FAILED");
  return new Uint8Array(await response.arrayBuffer());
}
