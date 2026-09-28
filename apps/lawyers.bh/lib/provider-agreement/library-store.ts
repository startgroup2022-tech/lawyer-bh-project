import type { Sql } from "postgres";
import { AgreementError } from "./model";
import { uuid, revision } from "./store";

export type AgreementLibrary = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  revision: number;
  activeVersionId: string | null;
  versionCount: number;
};
function metadata(input: { name: unknown; description: unknown }) {
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 120 ||
    typeof input.description !== "string" ||
    input.description.length > 600 ||
    /[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/.test(
      input.name + input.description,
    )
  )
    throw new AgreementError("invalid_library");
  return { name: input.name.trim(), description: input.description.trim() };
}
function record(row: Record<string, unknown>): AgreementLibrary {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    archived: row.archived === true,
    revision: Number(row.revision),
    activeVersionId: row.active_version_id
      ? String(row.active_version_id)
      : null,
    versionCount: Number(row.version_count ?? 0),
  };
}
export function createAgreementLibrary(sql: Sql) {
  return {
    async list(): Promise<AgreementLibrary[]> {
      return (
        await sql`SELECT l.*, (SELECT id FROM provider_agreement_versions v WHERE v.template_id=l.id AND v.status='published') AS active_version_id, (SELECT count(*) FROM provider_agreement_versions v WHERE v.template_id=l.id) AS version_count FROM provider_agreement_library l ORDER BY l.created_at DESC,l.id`
      ).map(record);
    },
    async create(
      input: { name: unknown; description: unknown },
      actorValue: string,
    ) {
      const m = metadata(input),
        actor = uuid(actorValue);
      return sql.begin(async (tx) => {
        const [row] =
          await tx`INSERT INTO provider_agreement_library(name,description,created_by,updated_by) VALUES (${m.name},${m.description},${actor},${actor}) RETURNING *`;
        await tx`INSERT INTO provider_agreement_audit(template_id,actor_id,action) VALUES (${row.id},${actor},'create')`;
        return record(row);
      });
    },
    async copy(
      input: { versionId: string; name: unknown; description: unknown },
      actorValue: string,
    ) {
      const m = metadata(input),
        actor = uuid(actorValue),
        source = uuid(input.versionId);
      return sql.begin(async (tx) => {
        const [version] =
          await tx`SELECT template FROM provider_agreement_versions WHERE id=${source} FOR SHARE`;
        if (!version) throw new AgreementError("not_found", 404);
        const [row] =
          await tx`INSERT INTO provider_agreement_library(name,description,created_by,updated_by) VALUES (${m.name},${m.description},${actor},${actor}) RETURNING *`;
        const [copy] =
          await tx`INSERT INTO provider_agreement_versions(template_id,template,created_by) VALUES (${row.id},${JSON.stringify(version.template)}::text::jsonb,${actor}) RETURNING id`;
        await tx`INSERT INTO provider_agreement_audit(template_id,version_id,actor_id,action) VALUES (${row.id},${copy.id},${actor},'copy')`;
        return record({ ...row, version_count: 1 });
      });
    },
    async update(
      input: {
        id: string;
        revision: number;
        name: unknown;
        description: unknown;
        archived: boolean;
      },
      actorValue: string,
    ) {
      const m = metadata(input),
        actor = uuid(actorValue),
        key = uuid(input.id),
        expected = revision(input.revision);
      if (typeof input.archived !== "boolean")
        throw new AgreementError("invalid_library");
      return sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(840084)`;
        const [old] =
          await tx`SELECT * FROM provider_agreement_library WHERE id=${key} FOR UPDATE`;
        if (!old || old.revision !== expected)
          throw new AgreementError("stale_draft", 409);
        const [active] =
          await tx`SELECT id FROM provider_agreement_versions WHERE template_id=${key} AND status='published'`;
        if (input.archived && active)
          throw new AgreementError("active_template", 409);
        const [row] =
          await tx`UPDATE provider_agreement_library SET name=${m.name},description=${m.description},archived=${input.archived},revision=revision+1,updated_at=now(),updated_by=${actor} WHERE id=${key} RETURNING *`;
        const action =
          old.archived !== input.archived
            ? input.archived
              ? "archive"
              : "restore"
            : "update";
        await tx`INSERT INTO provider_agreement_audit(template_id,actor_id,action) VALUES (${key},${actor},${action})`;
        return record({ ...row, active_version_id: active?.id });
      });
    },
  };
}
