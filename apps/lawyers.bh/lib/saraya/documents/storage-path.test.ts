import { describe, expect, it } from "vitest";
import { localDocumentPath } from "./storage-path";

describe("local Saraya document storage path", () => {
  it("keeps generated document keys inside the private development root", () => {
    expect(
      localDocumentPath(
        "/tmp/saraya-private",
        "saraya/property-1/other/document-1/file.pdf",
      ),
    ).toBe("/tmp/saraya-private/saraya/property-1/other/document-1/file.pdf");
  });

  it("rejects traversal outside the private development root", () => {
    expect(() => localDocumentPath("/tmp/saraya-private", "../../secret"))
      .toThrowError("INVALID_DOCUMENT_STORAGE_KEY");
  });
});
