import { describe, expect, it } from "vitest";
import { isManagedAboutPhotoKey, validateAboutPhoto } from "./photo";

describe("About member photos", () => {
  it("accepts supported images and protects unrelated storage keys", () => {
    expect(validateAboutPhoto(new File(["x"], "a.webp", { type: "image/webp" }))).toEqual({ contentType: "image/webp", extension: "webp" });
    expect(isManagedAboutPhotoKey("about-members/id/a.webp")).toBe(true);
    expect(isManagedAboutPhotoKey("admin-avatars/id/a.webp")).toBe(false);
  });
  it("rejects unsupported and oversized files", () => {
    expect(() => validateAboutPhoto(new File(["x"], "a.svg", { type: "image/svg+xml" }))).toThrowError("invalid_photo_type");
    expect(() => validateAboutPhoto({ size: 5 * 1024 * 1024 + 1, type: "image/png" } as File)).toThrowError("photo_too_large");
  });
});
