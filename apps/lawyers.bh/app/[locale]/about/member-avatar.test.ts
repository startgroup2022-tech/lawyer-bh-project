import { describe, expect, it } from "vitest";
import { getMemberAvatarImageFit } from "./Content";

describe("member avatar image fit", () => {
  it("shows complete organisation logos while keeping person portraits cropped", () => {
    expect(getMemberAvatarImageFit("Organization")).toBe("object-contain p-1");
    expect(getMemberAvatarImageFit("Person")).toBe("object-cover");
    expect(getMemberAvatarImageFit(undefined)).toBe("object-cover");
  });
});
