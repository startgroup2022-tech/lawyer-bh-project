import { ApiError } from "../auth/contracts";
import { maxDocumentBytes } from "./contracts";
import type { ApplicantDocumentUploadInput, DocumentUploadInput } from "./service";

const maxMultipartBytes = maxDocumentBytes + 64 * 1024;

function bodyTooLarge(): never {
  throw new ApiError(413, "DOCUMENT_BODY_TOO_LARGE", "حجم طلب المستند كبير جدًا", "The document request body is too large");
}

async function readStream(stream: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        bodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readBoundedFormData(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxMultipartBytes) bodyTooLarge();
  }
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data")) {
    throw new ApiError(415, "MULTIPART_REQUIRED", "يجب إرسال نموذج مستند", "A multipart document form is required");
  }
  if (!request.body) {
    throw new ApiError(422, "DOCUMENT_FILE_REQUIRED", "الملف مطلوب", "A file is required");
  }
  const bytes = await readStream(request.body, maxMultipartBytes);
  try {
    return await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new ApiError(400, "INVALID_MULTIPART", "صيغة نموذج المستند غير صالحة", "Invalid multipart document form");
  }
}

async function readUpload(form: FormData): Promise<DocumentUploadInput> {
  const title = form.get("title");
  const file = form.get("file");
  if (typeof title !== "string" || !title.trim()) {
    throw new ApiError(422, "DOCUMENT_TITLE_REQUIRED", "اسم المستند مطلوب", "Document name is required");
  }
  if (!(file instanceof File) || !file.name.trim() || file.size < 1) {
    throw new ApiError(422, "DOCUMENT_FILE_REQUIRED", "الملف مطلوب", "A file is required");
  }
  return {
    title: title.trim(),
    originalName: file.name,
    contentType: file.type,
    body: await readStream(file.stream(), maxDocumentBytes),
  };
}

export async function readDocumentUpload(request: Request): Promise<DocumentUploadInput> {
  return readUpload(await readBoundedFormData(request));
}

export async function readApplicantDocumentUpload(request: Request): Promise<ApplicantDocumentUploadInput> {
  const form = await readBoundedFormData(request);
  const category = form.get("category");
  if (category !== "identity" && category !== "commercial_registration") {
    throw new ApiError(422, "INVALID_APPLICANT_DOCUMENT_CATEGORY", "فئة المستند غير صالحة", "Invalid applicant document category");
  }
  return { ...(await readUpload(form)), category };
}
