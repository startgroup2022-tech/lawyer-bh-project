import { resolve, sep } from "node:path";

export function localDocumentPath(root: string, key: string) {
  const normalizedRoot = resolve(root);
  const candidate = resolve(normalizedRoot, key);
  if (!candidate.startsWith(`${normalizedRoot}${sep}`)) {
    throw new Error("INVALID_DOCUMENT_STORAGE_KEY");
  }
  return candidate;
}
