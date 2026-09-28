import { describe, expect, it } from "vitest";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type { DocumentAdapter } from "./contracts";
import { createDocumentService, type DocumentRepository } from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const unitId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const applicant: SarayaPrincipal = { userId, sessionId: "otp-session", propertyIds: [], memberships: [] };

function storage(calls: unknown[]): DocumentAdapter {
  return {
    put: async (input) => { calls.push(["put", input]); },
    delete: async (key) => { calls.push(["delete", key]); },
    signedReadUrl: async () => "unused",
  };
}

function repository(calls: unknown[], property: string | null = propertyId) {
  return {
    list: async () => [],
    resolvePublicApplicantUnit: async (value: string) => { calls.push(["resolve", value]); return property ? { propertyId: property, unitId: value } : null; },
    reserveApplicantUpload: async (input: { actorUserId: string; unitId: string; ip: string }) => {
      calls.push(["reserve", input]);
      if (!property) throw new ApiError(404, "PUBLIC_UNIT_NOT_FOUND", "الوحدة غير متاحة", "The unit is not available");
      return { propertyId: property, unitId: input.unitId };
    },
    create: async (input: unknown) => { calls.push(["create", input]); return input; },
    cleanupCreated: async (input: unknown) => { calls.push(["cleanup", input]); },
    update: async () => null,
  } as unknown as DocumentRepository;
}

describe("public applicant document upload", () => {
  it("allows an OTP-created tenant without membership and binds the private document to user and unit", async () => {
    const repositoryCalls: unknown[] = [];
    const storageCalls: unknown[] = [];
    const service = createDocumentService(repository(repositoryCalls), storage(storageCalls), () => documentId);
    const reservation = await service.reserveApplicantUpload(applicant, unitId, "203.0.113.10");

    const result = await service.createApplicant(applicant, reservation, {
      category: "identity",
      title: "Identity card",
      originalName: "identity.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([37, 80, 68, 70]),
    });

    const key = `saraya/${propertyId}/identity/${documentId}/identity.pdf`;
    expect(storageCalls).toEqual([["put", { key, contentType: "application/pdf", body: new Uint8Array([37, 80, 68, 70]) }]]);
    expect(repositoryCalls).toEqual([
      ["reserve", expect.objectContaining({ actorUserId: userId, unitId, ip: "203.0.113.10" })],
      ["create", expect.objectContaining({ id: documentId, propertyId, unitId, actorUserId: userId, category: "identity", storageKey: key })],
    ]);
    expect(result).toEqual({ id: documentId, unitId, category: "identity", title: "Identity card", originalName: "identity.pdf", contentType: "application/pdf", sizeBytes: 4, status: "active" });
    expect(result).not.toHaveProperty("storageKey");
    expect(result).not.toHaveProperty("propertyId");
  });

  it("turns spoofed MIME content failures into safe 422 and cleans partial state", async () => {
    const repositoryCalls: unknown[] = [];
    const storageCalls: unknown[] = [];
    const failedStorage: DocumentAdapter = {
      put: async (input) => { storageCalls.push(["put", input]); throw new Error("INVALID_DOCUMENT_CONTENT"); },
      delete: async (key) => { storageCalls.push(["delete", key]); },
      signedReadUrl: async () => "unused",
    };
    const failedRepository = {
      ...repository(repositoryCalls),
      cleanupCreated: async (input: unknown) => { repositoryCalls.push(["cleanup", input]); },
    } as unknown as DocumentRepository;
    const service = createDocumentService(failedRepository, failedStorage, () => documentId);

    await expect(service.createApplicant(applicant, { propertyId, unitId, actorUserId: userId }, {
      category: "identity",
      title: "Spoofed identity",
      originalName: "identity.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([60, 104, 116, 109, 108, 62]),
    })).rejects.toMatchObject({ status: 422, code: "INVALID_DOCUMENT_CONTENT" });

    const key = `saraya/${propertyId}/identity/${documentId}/identity.pdf`;
    expect(storageCalls).toEqual([
      ["put", expect.objectContaining({ key })],
      ["delete", key],
    ]);
    expect(repositoryCalls).toContainEqual(["cleanup", expect.objectContaining({ id: documentId, propertyId, actorUserId: userId })]);
    expect(repositoryCalls.some((call) => Array.isArray(call) && call[0] === "create")).toBe(false);
  });

  it("allows only identity and commercial-registration categories", async () => {
    const calls: unknown[] = [];
    const service = createDocumentService(repository(calls), storage(calls));
    await expect(service.createApplicant(applicant, { propertyId, unitId, actorUserId: userId }, {
      category: "lease" as never,
      title: "Lease",
      originalName: "lease.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([37, 80, 68, 70]),
    })).rejects.toMatchObject({ status: 422, code: "INVALID_APPLICANT_DOCUMENT_CATEGORY" });
    expect(calls).toEqual([]);
  });

  it("derives the property from an eligible public unit and rejects unavailable units before storage", async () => {
    const calls: unknown[] = [];
    const service = createDocumentService(repository(calls, null), storage(calls));
    await expect(service.reserveApplicantUpload(applicant, unitId, "203.0.113.10")).rejects.toMatchObject({ status: 404, code: "PUBLIC_UNIT_NOT_FOUND" });
    expect(calls).toEqual([["reserve", expect.objectContaining({ actorUserId: userId, unitId, ip: "203.0.113.10" })]]);
  });
});
