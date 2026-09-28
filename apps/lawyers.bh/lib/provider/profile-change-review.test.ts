import { describe, expect, it } from "vitest";
import { buildApprovedProviderPatch } from "./profile-change-review";

describe("profile change approval patch", () => {
  it("maps only allowed scalars and proposed files to provider columns", () => {
    expect(
      buildApprovedProviderPatch(
        {
          fullNameAr: "اسم جديد",
          ibanNumber: "BH02BBKU00000076000101",
          unsafe: "ignored",
        },
        {
          profileImage: { fileName: "new.jpg", mimeType: "image/jpeg", url: "https://blob/new.jpg", blobPath: "new.jpg" },
          licenseFile: { fileName: "license.pdf", mimeType: "application/pdf", url: "https://blob/license.pdf", blobPath: "license.pdf" },
        },
      ),
    ).toEqual({
      fullNameAr: "اسم جديد",
      ibanNumber: "BH02BBKU00000076000101",
      profileImageFileName: "new.jpg",
      profileImageMimeType: "image/jpeg",
      profileImageBase64: null,
      profileImageUrl: "https://blob/new.jpg",
      profileImageBlobPath: "new.jpg",
      licenseFileName: "license.pdf",
      licenseFileMimeType: "application/pdf",
      licenseFileBase64: null,
      licenseFileUrl: "https://blob/license.pdf",
      licenseFileBlobPath: "license.pdf",
    });
  });

  it("never permits account, approval, or Tap state through proposed values", () => {
    expect(
      buildApprovedProviderPatch(
        { status: "suspended", isActive: false, tapRetailerId: "bad" },
        {},
      ),
    ).toEqual({});
  });

  it("keeps the primary role consistent with approved role changes", () => {
    expect(
      buildApprovedProviderPatch({ subscriptionTypes: ["consultant", "mediator"] }, {}),
    ).toEqual({
      subscriptionTypes: ["consultant", "mediator"],
      subscriptionType: "consultant",
    });
  });
});
