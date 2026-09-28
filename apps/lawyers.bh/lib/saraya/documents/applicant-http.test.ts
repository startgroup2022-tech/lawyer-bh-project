import { describe, expect, it } from "vitest";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { createApplicantDocumentHandler } from "./applicant-http";

const principal: SarayaPrincipal = {
  userId: "33333333-3333-4333-8333-333333333333",
  sessionId: "otp-session",
  propertyIds: [],
  memberships: [],
};

describe("public applicant document HTTP", () => {
  it("authenticates and uses only the route unit id, never a client property id", async () => {
    let captured: unknown;
    const reservation = { propertyId: "11111111-1111-4111-8111-111111111111", unitId: "22222222-2222-4222-8222-222222222222", actorUserId: principal.userId };
    const handler = createApplicantDocumentHandler({
      authenticate: async () => principal,
      clientIp: () => "203.0.113.10",
      findReplay: async () => null,
      reserveApplicantUpload: async (...args) => { captured = ["reserve", ...args]; return reservation; },
      createApplicant: async (...args) => { captured = [captured, ["create", ...args]]; return { id: "document-1" }; },
    });
    const form = new FormData();
    form.set("propertyId", "attacker-property");
    form.set("category", "commercial_registration");
    form.set("title", "Commercial registration");
    form.set("file", new File([new Uint8Array([37, 80, 68, 70])], "cr.pdf", { type: "application/pdf" }));

    const response = await handler(
      new Request("https://sq.lawyers.bh/api/saraya/v1/public/units/22222222-2222-4222-8222-222222222222/documents", { method: "POST", headers: { "idempotency-key": "document-1" }, body: form }),
      "22222222-2222-4222-8222-222222222222",
    );

    expect(response.status).toBe(201);
    expect(captured).toMatchObject([
      ["reserve", principal, "22222222-2222-4222-8222-222222222222", "203.0.113.10"],
      ["create", principal, reservation, {
        category: "commercial_registration", title: "Commercial registration",
        originalName: "cr.pdf", contentType: "application/pdf",
        body: new Uint8Array([37, 80, 68, 70]),
      }, "document-1", expect.any(String)],
    ]);
    expect(JSON.stringify(captured)).not.toContain("attacker-property");
  });

  it("rejects an oversized declared body before multipart parsing or storage", async () => {
    let created = false;
    const handler = createApplicantDocumentHandler({
      authenticate: async () => principal,
      clientIp: () => "203.0.113.10",
      findReplay: async () => null,
      reserveApplicantUpload: async () => ({ propertyId: "11111111-1111-4111-8111-111111111111", unitId: "22222222-2222-4222-8222-222222222222", actorUserId: principal.userId }),
      createApplicant: async () => { created = true; return {}; },
    });
    const response = await handler(new Request("https://sq.lawyers.bh/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(6 * 1024 * 1024), "idempotency-key": "document-2" },
      body: "--x--\r\n",
    }), "22222222-2222-4222-8222-222222222222");

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "DOCUMENT_BODY_TOO_LARGE" } });
    expect(created).toBe(false);
  });

  it("caps chunked multipart bodies when content-length is absent", async () => {
    let created = false;
    const handler = createApplicantDocumentHandler({
      authenticate: async () => principal,
      clientIp: () => "203.0.113.10",
      findReplay: async () => null,
      reserveApplicantUpload: async () => ({ propertyId: "11111111-1111-4111-8111-111111111111", unitId: "22222222-2222-4222-8222-222222222222", actorUserId: principal.userId }),
      createApplicant: async () => { created = true; return {}; },
    });
    const form = new FormData();
    form.set("category", "identity");
    form.set("title", "Oversized identity");
    form.set("file", new File([new Uint8Array(5 * 1024 * 1024)], "identity.pdf", { type: "application/pdf" }));
    const request = new Request("https://sq.lawyers.bh/upload", { method: "POST", body: form });
    request.headers.set("idempotency-key", "document-3");
    expect(request.headers.get("content-length")).toBeNull();

    const response = await handler(request, "22222222-2222-4222-8222-222222222222");

    expect(response.status).toBe(413);
    expect(created).toBe(false);
  });

  it("returns an idempotent replay before consuming durable quota", async () => {
    let created = false;
    let reserved = false;
    const handler = createApplicantDocumentHandler({
      authenticate: async () => principal,
      clientIp: () => "203.0.113.10",
      findReplay: async () => ({ id: "document-existing" }),
      reserveApplicantUpload: async () => { reserved = true; throw new ApiError(429, "APPLICANT_UPLOAD_RATE_LIMITED", "محاولات كثيرة", "Too many attempts"); },
      createApplicant: async () => { created = true; return {}; },
    });
    const form = new FormData();
    form.set("category", "identity");
    form.set("title", "Identity");
    form.set("file", new File([new Uint8Array([37, 80, 68, 70])], "id.pdf", { type: "application/pdf" }));
    const response = await handler(new Request("https://sq.lawyers.bh/upload", {
      method: "POST", headers: { "idempotency-key": "identity-1" }, body: form,
    }), "22222222-2222-4222-8222-222222222222");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "document-existing" });
    expect(reserved).toBe(false);
    expect(created).toBe(false);
  });
});
