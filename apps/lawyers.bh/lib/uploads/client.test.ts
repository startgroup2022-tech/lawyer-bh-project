import { afterEach, expect, it, vi } from "vitest";
import { prepareDirectForm } from "./client";
afterEach(() => vi.unstubAllGlobals());
it("replaces large files with references and preserves the original on retry", async () => {
  const form = new FormData();
  form.set(
    "licenseFile",
    new File([new Uint8Array(5242880)], "license.pdf", {
      type: "application/pdf",
    }),
  );
  form.set("email", "test@example.test");
  let uploadedBytes = 0;
  vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
    if (url === "/api/uploads/direct")
      return Response.json({
        session: "session-id",
        files: [
          {
            field: "licenseFile",
            id: "file-id",
            url: "https://upload.example.test",
            type: "application/pdf",
          },
        ],
      });
    uploadedBytes = (options.body as File).size;
    return new Response("", { status: 200 });
  });
  const submitted = await prepareDirectForm(form, "join");
  expect(uploadedBytes).toBe(5242880);
  expect(submitted.get("licenseFile")).toBe("direct:file-id");
  expect(submitted.get("email")).toBe("test@example.test");
  expect(submitted.get("uploadSession")).toBe("session-id");
  expect(form.get("licenseFile")).toBeInstanceOf(File);
  vi.stubGlobal("fetch", async () => new Response("", { status: 503 }));
  await expect(prepareDirectForm(form, "join")).rejects.toThrow();
  expect((form.get("licenseFile") as File).size).toBe(5242880);
});
