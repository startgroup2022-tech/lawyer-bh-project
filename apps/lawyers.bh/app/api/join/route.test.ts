import { describe, expect, it, vi } from "vitest";
import { InvalidDocumentUploadError } from "@/lib/uploads/document-error";

vi.mock("@/lib/db/client", () => ({ sqlClient: vi.fn() }));
vi.mock("@/lib/uploads/server", () => ({
  readDirectForm: vi.fn(async () => {
    throw new InvalidDocumentUploadError("licenseFile");
  }),
}));

import { POST } from "./route";

describe("provider registration invalid document response", () => {
  it("reports the rejected upload field without creating an application", async () => {
    const response = await POST(new Request("https://example.test/api/join", {
      method: "POST",
      body: new FormData(),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_document",
      field: "licenseFile",
    });
  });
});
