import { describe, expect, it } from "vitest";
import {
  InvalidDocumentUploadError,
  invalidDocumentResponse,
  withDocumentField,
} from "./document-error";

describe("registration document errors", () => {
  it("attributes a rejected PDF to its allowlisted upload field", async () => {
    await expect(withDocumentField("licenseFile", async () => {
      throw new Error("invalid_pdf");
    })).rejects.toMatchObject({
      name: "InvalidDocumentUploadError",
      field: "licenseFile",
    });
  });

  it("returns a safe client error without filename or raw exception", async () => {
    const response = invalidDocumentResponse(
      new InvalidDocumentUploadError("ibanCertificateFile"),
    );
    expect(response?.status).toBe(400);
    expect(await response?.json()).toEqual({
      ok: false,
      error: "invalid_document",
      field: "ibanCertificateFile",
    });
  });

  it("does not relabel an unrelated upload failure", async () => {
    await expect(withDocumentField("licenseFile", async () => {
      throw new Error("upload_missing");
    })).rejects.toThrow("upload_missing");
    expect(invalidDocumentResponse(new Error("upload_missing"))).toBeNull();
  });

  it("does not expose an arbitrary field name", async () => {
    await expect(withDocumentField("password", async () => {
      throw new Error("invalid_pdf");
    })).rejects.toThrow("invalid_pdf");
  });
});
