import type {
  TermsAdminActor,
  TermsDocumentType,
  TermsDraftInput,
  TermsVersion,
} from "./types";

export type TermsRepository = {
  list(documentType: TermsDocumentType): Promise<TermsVersion[]>;
  getPublished(documentType: TermsDocumentType, options?: { countryCode?: string }): Promise<TermsVersion | null>;
  getById(id: string): Promise<TermsVersion | null>;
  nextVersion(documentType: TermsDocumentType): Promise<number>;
  insertDraft(
    input: TermsDraftInput,
    version: number,
    actor: TermsAdminActor,
  ): Promise<TermsVersion>;
  updateDraft(
    id: string,
    expectedUpdatedAt: string,
    input: TermsDraftInput,
    actor: TermsAdminActor,
  ): Promise<TermsVersion | null>;
  archivePublished(
    documentType: TermsDocumentType,
    exceptId: string,
    archivedAt: string,
    actor: TermsAdminActor,
  ): Promise<void>;
  publishDraft(
    id: string,
    expectedUpdatedAt: string,
    publishedAt: string,
    actor: TermsAdminActor,
  ): Promise<TermsVersion | null>;
  archiveVersion(
    id: string,
    expectedUpdatedAt: string,
    archivedAt: string,
    actor: TermsAdminActor,
  ): Promise<TermsVersion | null>;
  transaction<T>(work: (repository: TermsRepository) => Promise<T>): Promise<T>;
};

function failure(code: "not_found" | "immutable_version" | "stale_draft"): never {
  throw new Error(code);
}

export function createTermsService(repository: TermsRepository) {
  return {
    listTermsVersions(documentType: TermsDocumentType) {
      return repository.list(documentType);
    },

    getPublishedTerms(documentType: TermsDocumentType, options?: { countryCode?: string }) {
      return repository.getPublished(documentType, options);
    },

    async createTermsDraft(input: TermsDraftInput, actor: TermsAdminActor) {
      return repository.transaction(async (tx) => {
        const version = await tx.nextVersion(input.documentType);
        return tx.insertDraft(input, version, actor);
      });
    },

    async updateTermsDraft(id: string, input: TermsDraftInput, actor: TermsAdminActor) {
      const current = await repository.getById(id);
      if (!current) failure("not_found");
      if (current.status !== "draft") failure("immutable_version");
      if (current.documentType !== input.documentType) failure("immutable_version");
      return (
        (await repository.updateDraft(id, current.updatedAt, input, actor)) ??
        failure("stale_draft")
      );
    },

    async publishTermsVersion(id: string, actor: TermsAdminActor) {
      return repository.transaction(async (tx) => {
        const current = await tx.getById(id);
        if (!current) failure("not_found");
        if (current.status !== "draft" && current.status !== "archived") failure("immutable_version");
        const publishedAt = new Date().toISOString();
        await tx.archivePublished(current.documentType, current.id, publishedAt, actor);
        return (
          (await tx.publishDraft(id, current.updatedAt, publishedAt, actor)) ??
          failure("stale_draft")
        );
      });
    },

    async archiveTermsVersion(id: string, actor: TermsAdminActor) {
      const current = await repository.getById(id);
      if (!current) failure("not_found");
      if (current.status === "archived") failure("immutable_version");
      if (current.status === "published") throw new Error("published_version_required");
      const archivedAt = new Date().toISOString();
      return (
        (await repository.archiveVersion(id, current.updatedAt, archivedAt, actor)) ??
        failure("stale_draft")
      );
    },
  };
}

type SqlRow = {
  id: string;
  document_type: TermsDocumentType;
  country_code: string | null;
  version: number;
  status: TermsVersion["status"];
  content_ar: string;
  content_en: string;
  platform_percentage_year_one: string | null;
  platform_percentage_year_two: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  published_at: Date | string | null;
  archived_at: Date | string | null;
};

function iso(value: Date | string | null) {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function lawyerShare(value: string | null) {
  return value === null ? null : (100 - Number(value)).toFixed(2);
}

function mapRow(row: SqlRow): TermsVersion {
  return {
    id: row.id,
    documentType: row.document_type,
    countryCode: row.country_code,
    version: row.version,
    status: row.status,
    contentAr: row.content_ar,
    contentEn: row.content_en,
    platformPercentageYearOne: row.platform_percentage_year_one,
    platformPercentageYearTwo: row.platform_percentage_year_two,
    lawyerPercentageYearOne: lawyerShare(row.platform_percentage_year_one),
    lawyerPercentageYearTwo: lawyerShare(row.platform_percentage_year_two),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    publishedAt: iso(row.published_at),
    archivedAt: iso(row.archived_at),
  };
}

// postgres-js tagged-template shape; kept structural so transaction clients share it.
type SqlExecutor = {
  <T extends readonly Record<string, unknown>[] = Record<string, unknown>[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  begin<T>(work: (sql: SqlExecutor) => Promise<T>): Promise<T>;
};

function sqlRepository(sql: SqlExecutor): TermsRepository {
  return {
    async list(documentType) {
      const rows = await sql<SqlRow[]>`
        SELECT id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
        FROM terms_versions
        WHERE document_type = ${documentType}
        ORDER BY version DESC
      `;
      return rows.map(mapRow);
    },
    async getPublished(documentType, options) {
      const countryCode = options?.countryCode ?? null;
      const rows = await sql<SqlRow[]>`
        SELECT id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
        FROM terms_versions
        WHERE document_type = ${documentType} AND status = 'published'
          AND (
            ${documentType} <> 'legalsos_lawyer_agreement'
            OR country_code = ${countryCode}
          )
        ORDER BY published_at DESC
        LIMIT 1
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async getById(id) {
      const rows = await sql<SqlRow[]>`
        SELECT id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
        FROM terms_versions WHERE id = ${id}::uuid LIMIT 1
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async nextVersion(documentType) {
      const rows = await sql<Array<{ next_version: number }>>`
        SELECT COALESCE(MAX(version), 0)::integer + 1 AS next_version
        FROM terms_versions WHERE document_type = ${documentType}
      `;
      return rows[0]?.next_version ?? 1;
    },
    async insertDraft(input, version, actor) {
      const rows = await sql<SqlRow[]>`
        INSERT INTO terms_versions (
          document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_by_admin_id, updated_by_admin_id
        ) VALUES (
          ${input.documentType}, ${input.countryCode ?? null}, ${version}, 'draft', ${input.contentAr}, ${input.contentEn},
          ${input.platformPercentageYearOne}, ${input.platformPercentageYearTwo},
          ${actor.adminId}::uuid, ${actor.adminId}::uuid
        ) RETURNING id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
      `;
      return mapRow(rows[0]);
    },
    async updateDraft(id, expectedUpdatedAt, input, actor) {
      const rows = await sql<SqlRow[]>`
        UPDATE terms_versions SET
          content_ar = ${input.contentAr}, content_en = ${input.contentEn},
          platform_percentage_year_one = ${input.platformPercentageYearOne},
          platform_percentage_year_two = ${input.platformPercentageYearTwo},
          updated_by_admin_id = ${actor.adminId}::uuid, updated_at = now()
        WHERE id = ${id}::uuid AND status = 'draft' AND updated_at = ${expectedUpdatedAt}::timestamptz
        RETURNING id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async archivePublished(documentType, exceptId, archivedAt, actor) {
      await sql`
        UPDATE terms_versions SET status = 'archived', archived_at = ${archivedAt}::timestamptz,
          archived_by_admin_id = ${actor.adminId}::uuid, updated_by_admin_id = ${actor.adminId}::uuid,
          updated_at = ${archivedAt}::timestamptz
        WHERE document_type = ${documentType} AND status = 'published' AND id <> ${exceptId}::uuid
      `;
    },
    async publishDraft(id, expectedUpdatedAt, publishedAt, actor) {
      const rows = await sql<SqlRow[]>`
        UPDATE terms_versions SET status = 'published', published_at = ${publishedAt}::timestamptz,
          published_by_admin_id = ${actor.adminId}::uuid, updated_by_admin_id = ${actor.adminId}::uuid,
          archived_at = NULL, archived_by_admin_id = NULL,
          updated_at = ${publishedAt}::timestamptz
        WHERE id = ${id}::uuid AND status IN ('draft', 'archived') AND updated_at = ${expectedUpdatedAt}::timestamptz
        RETURNING id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async archiveVersion(id, expectedUpdatedAt, archivedAt, actor) {
      const rows = await sql<SqlRow[]>`
        UPDATE terms_versions SET status = 'archived', archived_at = ${archivedAt}::timestamptz,
          archived_by_admin_id = ${actor.adminId}::uuid, updated_by_admin_id = ${actor.adminId}::uuid,
          updated_at = ${archivedAt}::timestamptz
        WHERE id = ${id}::uuid AND status = 'draft' AND updated_at = ${expectedUpdatedAt}::timestamptz
        RETURNING id, document_type, country_code, version, status, content_ar, content_en,
          platform_percentage_year_one, platform_percentage_year_two,
          created_at, updated_at, published_at, archived_at
      `;
      return rows[0] ? mapRow(rows[0]) : null;
    },
    transaction(work) {
      return sql.begin(async (transactionSql) => {
        // Serialize infrequent version-allocation/publication writes across instances.
        // The lock is transaction-scoped, including rollback and failed publication.
        await transactionSql`SELECT pg_advisory_xact_lock(197903, 1)`;
        return work(sqlRepository(transactionSql));
      });
    },
  };
}

async function defaultService() {
  const { sqlClient } = await import("@/lib/db/client");
  return createTermsService(sqlRepository(sqlClient as unknown as SqlExecutor));
}

export async function listTermsVersions(documentType: TermsDocumentType) {
  return (await defaultService()).listTermsVersions(documentType);
}

export async function getPublishedTerms(documentType: TermsDocumentType, options?: { countryCode?: string }) {
  return (await defaultService()).getPublishedTerms(documentType, options);
}

export async function createTermsDraft(input: TermsDraftInput, actor: TermsAdminActor) {
  return (await defaultService()).createTermsDraft(input, actor);
}

export async function updateTermsDraft(id: string, input: TermsDraftInput, actor: TermsAdminActor) {
  return (await defaultService()).updateTermsDraft(id, input, actor);
}

export async function publishTermsVersion(id: string, actor: TermsAdminActor) {
  return (await defaultService()).publishTermsVersion(id, actor);
}

export async function archiveTermsVersion(id: string, actor: TermsAdminActor) {
  return (await defaultService()).archiveTermsVersion(id, actor);
}
