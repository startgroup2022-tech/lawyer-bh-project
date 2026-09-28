import { AboutManagementError } from "./types";
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export function validateAboutPhoto(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new AboutManagementError("photo_too_large");
  const extension = extensions[file.type];
  if (!extension) throw new AboutManagementError("invalid_photo_type");
  return { contentType: file.type, extension };
}
export const isManagedAboutPhotoKey = (key: string | null | undefined) => Boolean(key?.startsWith("about-members/"));
