import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";

vi.mock("@/lib/db/client", () => ({ sqlClient: () => { throw new Error("unused"); } }));

import { documentStorage } from "./storage";
import { createDocumentService, type DocumentRepository } from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const unitId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const principal: SarayaPrincipal = { userId, sessionId: "otp", propertyIds: [], memberships: [] };

describe("public applicant document content validation", () => {
  it("rejects HTML spoofed as PDF with a safe 422 before creating metadata", async () => {
    let created = false;
    const repository = {
      list: async () => [],
      resolvePublicApplicantUnit: async () => ({ propertyId, unitId }),
      reserveApplicantUpload: async () => ({ propertyId, unitId }),
      create: async () => { created = true; return {}; },
      cleanupCreated: async () => undefined,
      update: async () => null,
    } satisfies DocumentRepository;
    const service = createDocumentService(repository, documentStorage, () => documentId);

    await expect(service.createApplicant(principal, { propertyId, unitId, actorUserId: userId }, {
      category: "identity",
      title: "Identity",
      originalName: "identity.pdf",
      contentType: "application/pdf",
      body: new TextEncoder().encode("<html>not a pdf</html>"),
    })).rejects.toMatchObject({ status: 422, code: "INVALID_DOCUMENT_CONTENT" });
    expect(created).toBe(false);
  });
});
