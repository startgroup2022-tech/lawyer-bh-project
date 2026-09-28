import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import type { DocumentAdapter } from "./contracts";
import { createDocumentService, type DocumentRepository } from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const tenantId = "33333333-3333-4333-8333-333333333333";
const ownerId = "44444444-4444-4444-8444-444444444444";

function principal(role: "super_admin" | "property_manager" | "tenant" | "owner") {
  return {
    userId,
    sessionId: "session-1",
    propertyIds: [propertyId],
    memberships: [{
      propertyId,
      role,
      ...(role === "tenant" ? { tenantId } : {}),
      ...(role === "owner" ? { ownerId } : {}),
    }],
  } satisfies SarayaPrincipal;
}

function repository(calls: unknown[]): DocumentRepository {
  return {
    list: async (scope) => { calls.push(scope); return []; },
    resolvePublicApplicantUnit: async () => null,
    reserveApplicantUpload: async () => { throw new Error("unused"); },
    create: async (input) => { calls.push(input); return input; },
    cleanupCreated: async (input) => { calls.push(["cleanup", input]); },
    update: async (input) => { calls.push(input); return input; },
  };
}

function storage(calls: unknown[]): DocumentAdapter {
  return {
    put: async (input) => { calls.push(["put", input]); },
    delete: async (key) => { calls.push(["delete", key]); },
    signedReadUrl: async () => "https://example.test/document",
  };
}

describe("document list scope", () => {
  it("allows property management to see all property documents", async () => {
    const calls: unknown[] = [];
    await createDocumentService(repository(calls)).list(
      principal("property_manager"),
      propertyId,
    );
    expect(calls).toEqual([{ propertyId }]);
  });

  it("limits tenants and owners to their own records", async () => {
    const calls: unknown[] = [];
    const service = createDocumentService(repository(calls));
    await service.list(principal("tenant"), propertyId);
    await service.list(principal("owner"), propertyId);
    expect(calls).toEqual([
      { propertyId, tenantId },
      { propertyId, ownerId },
    ]);
  });

  it("allows property management to update document metadata", async () => {
    const calls: unknown[] = [];
    await createDocumentService(repository(calls)).update(
      principal("property_manager"),
      propertyId,
      "document-1",
      { title: "Signed lease", category: "lease", status: "archived", expiresOn: null },
    );
    expect(calls).toEqual([{ propertyId, id: "document-1", actorUserId: userId, title: "Signed lease", category: "lease", status: "archived", expiresOn: null }]);
  });

  it("stores a validated document and creates its active metadata record", async () => {
    const repositoryCalls: unknown[] = [];
    const storageCalls: unknown[] = [];
    const service = createDocumentService(
      repository(repositoryCalls),
      storage(storageCalls),
      () => "55555555-5555-4555-8555-555555555555",
    );

    await service.create(principal("property_manager"), propertyId, {
      title: "Insurance certificate",
      originalName: "insurance.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([37, 80, 68, 70]),
    });

    const key = `saraya/${propertyId}/other/55555555-5555-4555-8555-555555555555/insurance.pdf`;
    expect(storageCalls).toEqual([["put", {
      key,
      contentType: "application/pdf",
      body: new Uint8Array([37, 80, 68, 70]),
    }]]);
    expect(repositoryCalls).toEqual([{
      id: "55555555-5555-4555-8555-555555555555",
      propertyId,
      actorUserId: userId,
      title: "Insurance certificate",
      originalName: "insurance.pdf",
      contentType: "application/pdf",
      sizeBytes: 4,
      storageKey: key,
      category: "other",
      status: "active",
    }]);
  });

  it("rejects tenant uploads before touching storage", async () => {
    const calls: unknown[] = [];
    const service = createDocumentService(repository(calls), storage(calls));

    await expect(service.create(principal("tenant"), propertyId, {
      title: "Identity",
      originalName: "identity.png",
      contentType: "image/png",
      body: new Uint8Array([1]),
    })).rejects.toMatchObject({ status: 403, code: "DOCUMENT_CREATE_DENIED" });
    expect(calls).toEqual([]);
  });

  it("removes the private blob when database creation fails", async () => {
    const storageCalls: unknown[] = [];
    const failedRepository: DocumentRepository = {
      list: async () => [],
      resolvePublicApplicantUnit: async () => null,
      reserveApplicantUpload: async () => { throw new Error("unused"); },
      create: async () => { throw new Error("database unavailable"); },
      cleanupCreated: async () => undefined,
      update: async () => null,
    };
    const service = createDocumentService(
      failedRepository,
      storage(storageCalls),
      () => "55555555-5555-4555-8555-555555555555",
    );

    await expect(service.create(principal("super_admin"), propertyId, {
      title: "Receipt",
      originalName: "receipt.jpg",
      contentType: "image/jpeg",
      body: new Uint8Array([1, 2]),
    })).rejects.toThrow("database unavailable");

    const key = `saraya/${propertyId}/other/55555555-5555-4555-8555-555555555555/receipt.jpg`;
    expect(storageCalls).toEqual([
      ["put", { key, contentType: "image/jpeg", body: new Uint8Array([1, 2]) }],
      ["delete", key],
    ]);
  });
});
