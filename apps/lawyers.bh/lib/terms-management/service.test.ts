import { describe, expect, it } from "vitest";
import {
  createTermsService,
  type TermsRepository,
} from "./service";
import type {
  TermsAdminActor,
  TermsDraftInput,
  TermsVersion,
} from "./types";

const actor: TermsAdminActor = { adminId: "admin-1" };

function general(content = "General"): TermsDraftInput {
  return {
    documentType: "general",
    contentAr: `${content} AR`,
    contentEn: `${content} EN`,
    platformPercentageYearOne: null,
    platformPercentageYearTwo: null,
    lawyerPercentageYearOne: null,
    lawyerPercentageYearTwo: null,
  };
}

function memoryRepository(seed: TermsVersion[] = []): TermsRepository {
  let sequence = seed.length;
  const records = seed.map((record) => ({ ...record }));
  const iso = () => new Date(1_800_000_000_000 + sequence++ * 1_000).toISOString();

  const repository: TermsRepository = {
    async list(documentType) {
      return records
        .filter((record) => record.documentType === documentType)
        .sort((a, b) => b.version - a.version)
        .map((record) => ({ ...record }));
    },
    async getPublished(documentType) {
      const found = records.find(
        (record) => record.documentType === documentType && record.status === "published",
      );
      return found ? { ...found } : null;
    },
    async getById(id) {
      const found = records.find((record) => record.id === id);
      return found ? { ...found } : null;
    },
    async nextVersion(documentType) {
      return Math.max(0, ...records.filter((r) => r.documentType === documentType).map((r) => r.version)) + 1;
    },
    async insertDraft(input, version) {
      const now = iso();
      const record: TermsVersion = {
        ...input,
        id: `terms-${version}-${sequence}`,
        version,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        archivedAt: null,
      };
      records.push(record);
      return { ...record };
    },
    async updateDraft(id, expectedUpdatedAt, input) {
      const index = records.findIndex(
        (record) => record.id === id && record.status === "draft" && record.updatedAt === expectedUpdatedAt,
      );
      if (index < 0) return null;
      records[index] = { ...records[index], ...input, updatedAt: iso() };
      return { ...records[index] };
    },
    async archivePublished(documentType, exceptId, archivedAt) {
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (record.documentType === documentType && record.status === "published" && record.id !== exceptId) {
          records[index] = { ...record, status: "archived", archivedAt, updatedAt: archivedAt };
        }
      }
    },
    async publishDraft(id, expectedUpdatedAt, publishedAt) {
      const index = records.findIndex(
        (record) => record.id === id && (record.status === "draft" || record.status === "archived") && record.updatedAt === expectedUpdatedAt,
      );
      if (index < 0) return null;
      records[index] = { ...records[index], status: "published", publishedAt, archivedAt: null, updatedAt: publishedAt };
      return { ...records[index] };
    },
    async archiveVersion(id, expectedUpdatedAt, archivedAt) {
      const index = records.findIndex(
        (record) => record.id === id && record.status !== "archived" && record.updatedAt === expectedUpdatedAt,
      );
      if (index < 0) return null;
      records[index] = { ...records[index], status: "archived", archivedAt, updatedAt: archivedAt };
      return { ...records[index] };
    },
    async transaction(work) {
      const snapshot = records.map((record) => ({ ...record }));
      try {
        return await work(repository);
      } catch (error) {
        records.splice(0, records.length, ...snapshot);
        throw error;
      }
    },
  };
  return repository;
}

describe("terms lifecycle service", () => {
  it("creates incrementing drafts and lists newest versions first", async () => {
    const service = createTermsService(memoryRepository());
    const first = await service.createTermsDraft(general("First"), actor);
    const second = await service.createTermsDraft(general("Second"), actor);

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect((await service.listTermsVersions("general")).map((item) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("updates drafts but keeps published versions immutable", async () => {
    const service = createTermsService(memoryRepository());
    const draft = await service.createTermsDraft(general("First"), actor);
    const updated = await service.updateTermsDraft(draft.id, general("Changed"), actor);
    expect(updated.contentEn).toBe("Changed EN");

    const published = await service.publishTermsVersion(updated.id, actor);
    await expect(
      service.updateTermsDraft(published.id, general("Forbidden"), actor),
    ).rejects.toThrow("immutable_version");
  });

  it("publishes atomically and archives the prior published version", async () => {
    const service = createTermsService(memoryRepository());
    const first = await service.createTermsDraft(general("First"), actor);
    await service.publishTermsVersion(first.id, actor);
    const second = await service.createTermsDraft(general("Second"), actor);
    const current = await service.publishTermsVersion(second.id, actor);

    expect((await service.getPublishedTerms("general"))?.id).toBe(current.id);
    expect((await service.listTermsVersions("general")).find((item) => item.id === first.id)?.status).toBe(
      "archived",
    );
  });

  it("rolls back the prior archive when publishing the replacement fails", async () => {
    const repository = memoryRepository();
    const service = createTermsService(repository);
    const first = await service.createTermsDraft(general("First"), actor);
    await service.publishTermsVersion(first.id, actor);
    const second = await service.createTermsDraft(general("Second"), actor);
    repository.publishDraft = async () => {
      throw new Error("database_write_failed");
    };

    await expect(service.publishTermsVersion(second.id, actor)).rejects.toThrow(
      "database_write_failed",
    );
    expect((await service.getPublishedTerms("general"))?.id).toBe(first.id);
  });

  it.each(["general", "lawyer_registration"] as const)("republishes archived %s terms without changing drafts or other documents", async (documentType) => {
    const repository = memoryRepository();
    const service = createTermsService(repository);
    const input = { ...general("Original"), documentType };
    const original = await service.createTermsDraft(input, actor);
    await service.publishTermsVersion(original.id, actor);
    const replacement = await service.createTermsDraft({ ...input, contentAr: "Replacement AR" }, actor);
    await service.publishTermsVersion(replacement.id, actor);
    const draft = await service.createTermsDraft({ ...input, contentAr: "Keep draft" }, actor);
    const other = await service.createTermsDraft({ ...general(), documentType: documentType === "general" ? "lawyer_registration" : "general" }, actor);
    await service.publishTermsVersion(other.id, actor);

    const republished = await service.publishTermsVersion(original.id, actor);
    expect(republished).toMatchObject({ id: original.id, version: original.version, status: "published", archivedAt: null, contentAr: original.contentAr, contentEn: original.contentEn });
    expect(await repository.getById(draft.id)).toEqual(draft);
    expect((await repository.getById(other.id))?.status).toBe("published");
    expect((await repository.getById(replacement.id))?.status).toBe("archived");
    expect((await service.listTermsVersions(documentType)).filter(v => v.status === "published")).toHaveLength(1);
    await expect(service.publishTermsVersion(original.id, actor)).rejects.toThrow("immutable_version");
  });

  it("rolls back archiving the current publication if republishing fails", async () => {
    const repository = memoryRepository();
    const service = createTermsService(repository);
    const first = await service.createTermsDraft(general(), actor);
    await service.publishTermsVersion(first.id, actor);
    const second = await service.createTermsDraft(general(), actor);
    await service.publishTermsVersion(second.id, actor);
    repository.publishDraft = async () => null;
    await expect(service.publishTermsVersion(first.id, actor)).rejects.toThrow("stale_draft");
    expect((await service.getPublishedTerms("general"))?.id).toBe(second.id);
    expect((await repository.getById(first.id))?.status).toBe("archived");
  });

  it("keeps current terms available when an admin tries to archive the publication", async () => {
    const service = createTermsService(memoryRepository());
    const draft = await service.createTermsDraft(general(), actor);
    await service.publishTermsVersion(draft.id, actor);
    await expect(service.archiveTermsVersion(draft.id, actor)).rejects.toThrow("published_version_required");
    expect((await service.getPublishedTerms("general"))?.id).toBe(draft.id);
  });

  it("returns stable not-found, stale-draft, and immutable errors", async () => {
    const repository = memoryRepository();
    const service = createTermsService(repository);
    await expect(service.publishTermsVersion("missing", actor)).rejects.toThrow("not_found");

    const draft = await service.createTermsDraft(general(), actor);
    const originalUpdate = repository.updateDraft;
    repository.updateDraft = async () => null;
    await expect(service.updateTermsDraft(draft.id, general("Race"), actor)).rejects.toThrow(
      "stale_draft",
    );
    repository.updateDraft = originalUpdate;

    const archived = await service.archiveTermsVersion(draft.id, actor);
    expect(archived.status).toBe("archived");
    await expect(service.archiveTermsVersion(draft.id, actor)).rejects.toThrow("immutable_version");
  });
});
