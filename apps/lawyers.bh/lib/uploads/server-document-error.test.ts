import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const browser = "a".repeat(64);
const id = "00000000-0000-4000-8000-000000000001";
const fileId = "00000000-0000-4000-8000-000000000002";
const bytes = Buffer.from("%PDF-1.7\nnot a real PDF\n%%EOF");
const session = {
  workflow: "join",
  browser_hash: createHash("sha256").update(browser).digest("hex"),
  principal: "",
  expires_at: new Date(Date.now() + 60_000),
  files: [{
    field: "licenseFile",
    id: fileId,
    path: `direct-staging/${id}/${fileId}`,
    name: "license.pdf",
    size: bytes.length,
    type: "application/pdf",
  }],
};

vi.mock("@/lib/db/client", () => ({ sqlClient: async () => [session] }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: browser }) }),
}));
vi.mock("@vercel/blob", () => ({
  get: async () => ({ stream: new Blob([bytes]).stream() }),
}));

import { readDirectForm } from "./server";

describe("direct registration upload validation", () => {
  it("identifies a malformed PDF by its upload field", async () => {
    vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", "test-token");
    try {
    const form = new FormData();
    form.set("uploadSession", id);
    form.set("licenseFile", `direct:${fileId}`);
    const request = new Request("https://example.test/api/join", {
      method: "POST",
      headers: { origin: "https://example.test" },
      body: form,
    });
    await expect(readDirectForm(request, "join")).rejects.toMatchObject({
      name: "InvalidDocumentUploadError",
      field: "licenseFile",
    });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
