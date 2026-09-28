import { describe, expect, it } from "vitest";
import { readDocumentUpload } from "./upload-form";

describe("document upload form", () => {
  it("reads the title and selected file bytes", async () => {
    const form = new FormData();
    form.set("title", "  Commercial registration  ");
    form.set("file", new File([new Uint8Array([1, 2, 3])], "cr.pdf", { type: "application/pdf" }));
    const request = new Request("https://example.test/api/saraya/v1/documents", { method: "POST", body: form });

    await expect(readDocumentUpload(request)).resolves.toEqual({
      title: "Commercial registration",
      originalName: "cr.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([1, 2, 3]),
    });
  });

  it("rejects a request without a real file", async () => {
    const form = new FormData();
    form.set("title", "Missing file");
    const request = new Request("https://example.test/api/saraya/v1/documents", { method: "POST", body: form });

    await expect(readDocumentUpload(request)).rejects.toMatchObject({
      status: 422,
      code: "DOCUMENT_FILE_REQUIRED",
    });
  });
});
