import { describe, expect, it } from "vitest";
import {
  normalizeCompleteProfileSignature,
  preserveOrReplaceFile,
  normalizeCompleteProfileSubscriptionTypes,
  normalizeCompleteProfileText,
} from "./complete-profile-update";

describe("normalizeCompleteProfileSignature", () => {
  it("accepts an image data URL and rejects an invalid stored signature", () => {
    expect(normalizeCompleteProfileSignature(" data:image/png;base64,abc ")).toBe(
      "data:image/png;base64,abc",
    );
    expect(normalizeCompleteProfileSignature("data:application/pdf;base64,abc")).toBe("");
    expect(normalizeCompleteProfileSignature("https://example.com/signature.png")).toBe("");
  });
});

describe("normalizeCompleteProfileSubscriptionTypes", () => {
  it("keeps unique supported roles and chooses lawyer as the primary role", () => {
    expect(
      normalizeCompleteProfileSubscriptionTypes(
        JSON.stringify(["Consultant", "Lawyer", "Consultant"]),
        "consultant",
      ),
    ).toEqual({
      subscriptionTypes: ["consultant", "lawyer"],
      subscriptionType: "lawyer",
    });
  });

  it("falls back to the stored primary role", () => {
    expect(normalizeCompleteProfileSubscriptionTypes("", "expert")).toEqual({
      subscriptionTypes: ["expert"],
      subscriptionType: "expert",
    });
  });
});

describe("complete profile update", () => {
  it("normalizes all editable text fields", () => {
    expect(
      normalizeCompleteProfileText({
        subscriptionType: " Lawyer ",
        fullNameAr: "  محام تجريبي ",
        fullNameEn: " Test Lawyer ",
        email: " LAWYER@EXAMPLE.COM ",
        phone: " +97333334444 ",
        ibanNumber: "bh00 test 1234 5678 9012",
        crNumber: " CR-10 ",
      }),
    ).toEqual({
      subscriptionType: "lawyer",
      fullNameAr: "محام تجريبي",
      fullNameEn: "Test Lawyer",
      email: "lawyer@example.com",
      phone: "+97333334444",
      ibanNumber: "BH00TEST123456789012",
      crNumber: "CR-10",
    });
  });

  it("preserves untouched files and replaces only supplied metadata", () => {
    const existing = {
      fileName: "old.pdf",
      mimeType: "application/pdf",
      url: "https://blob.example/old.pdf",
      blobPath: "lawyers/old.pdf",
    };

    expect(preserveOrReplaceFile(existing, null)).toEqual(existing);
    expect(
      preserveOrReplaceFile(existing, {
        fileName: "new.png",
        mimeType: "image/png",
        url: "https://blob.example/new.png",
        blobPath: "lawyers/new.png",
      }),
    ).toEqual({
      fileName: "new.png",
      mimeType: "image/png",
      url: "https://blob.example/new.png",
      blobPath: "lawyers/new.png",
    });
  });
});
