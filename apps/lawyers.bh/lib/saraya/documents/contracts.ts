export const allowedDocumentTypes = ["application/pdf", "image/jpeg", "image/png"] as const;
export const maxDocumentBytes = 4 * 1024 * 1024;
export interface DocumentUpload { originalName: string; contentType: string; size: number }
export interface DocumentAdapter { put(input: { key: string; contentType: string; body: Uint8Array; allowOverwrite?: boolean }): Promise<void>; signedReadUrl(key: string, expiresInSeconds: number): Promise<string>; delete(key: string): Promise<void> }
const extensionsByType: Record<(typeof allowedDocumentTypes)[number], readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};
export function validateDocumentUpload(input: DocumentUpload) {
  if (!(allowedDocumentTypes as readonly string[]).includes(input.contentType)) throw new Error("UNSUPPORTED_DOCUMENT_TYPE");
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > maxDocumentBytes) throw new Error("DOCUMENT_TOO_LARGE");
  const extension = input.originalName.split(".").at(-1)?.toLowerCase();
  if (!extension || !extensionsByType[input.contentType as keyof typeof extensionsByType].includes(extension)) throw new Error("DOCUMENT_EXTENSION_MISMATCH");
}
export function documentKey(propertyId: string, category: string, documentId: string, originalName: string) { const name = originalName.split(/[\\/]/).at(-1)!.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "document"; return `saraya/${propertyId}/${category}/${documentId}/${name}`; }
