import { describe, expect, it } from "vitest";
import { documentKey, validateDocumentUpload } from "./contracts";
describe("document adapter contract", () => {
  it("builds property-isolated safe keys", () => expect(documentKey("p1", "lease", "d1", "../../Lease Final.pdf")).toBe("saraya/p1/lease/d1/Lease-Final.pdf"));
  it("rejects unsupported and oversized files", () => { expect(() => validateDocumentUpload({ originalName: "file.html", contentType: "text/html", size: 1 })).toThrowError(/UNSUPPORTED_DOCUMENT_TYPE/); expect(() => validateDocumentUpload({ originalName: "file.pdf", contentType: "application\/pdf", size: 5 * 1024 * 1024 })).toThrowError(/DOCUMENT_TOO_LARGE/); });
  it("requires the filename extension to match the declared MIME type", () => {
    expect(() => validateDocumentUpload({ originalName: "identity.jpg", contentType: "application/pdf", size: 10 })).toThrowError(/DOCUMENT_EXTENSION_MISMATCH/);
    expect(() => validateDocumentUpload({ originalName: "identity.PDF", contentType: "application/pdf", size: 10 })).not.toThrow();
  });
});
