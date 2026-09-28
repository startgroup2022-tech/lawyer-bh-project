import type { Sql } from "postgres";
import {
  AgreementError,
  parseTemplate,
  type Version,
  type Snapshot,
} from "./model";
import { validateTemplateAssets } from "./assets";
import { renderBuilderPdf } from "./builder-pdf";
import { previewBuilderValues } from "./builder-preview";
import { sampleData } from "./model";
export const uuid = (value: unknown) => {
  if (
    typeof value !== "string" ||
    !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)
  )
    throw new AgreementError("invalid_id");
  return value;
};
export const revision = (v: unknown) => {
  if (!Number.isSafeInteger(v) || Number(v) < 1)
    throw new AgreementError("stale_draft", 409);
  return Number(v);
};
function version(row: Record<string, unknown>): Version {
  return {
    id: String(row.id),
    templateId: row.template_id ? String(row.template_id) : undefined,
    number: Number(row.number),
    revision: Number(row.revision),
    status: row.status as Version["status"],
    template: row.template as Version["template"],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
export function createAgreementStore(sql: Sql) {
  return {
    async list(templateId?: string) {
      if (templateId)
        return (
          await sql`SELECT id,template_id,number,revision,status,created_at,template-'presentation'-'builder' AS template FROM provider_agreement_versions WHERE template_id=${uuid(templateId)} ORDER BY number DESC LIMIT 100`
        ).map(version);
      return (
        await sql`SELECT id,template_id,number,revision,status,created_at,template-'presentation'-'builder' AS template FROM provider_agreement_versions ORDER BY number DESC LIMIT 100`
      ).map(version);
    },
    async get(id: string) {
      const [row] =
        await sql`SELECT * FROM provider_agreement_versions WHERE id=${uuid(id)}`;
      if (!row) throw new AgreementError("not_found", 404);
      return version(row);
    },
    async current() {
      const [row] =
        await sql`SELECT * FROM provider_agreement_versions WHERE status='published'`;
      return row ? version(row) : null;
    },
    async save(
      input: {
        id?: string;
        revision?: number;
        templateId?: string;
        template: unknown;
      },
      actor: string,
    ) {
      const template = await validateTemplateAssets(
        parseTemplate(input.template),
      );
      const actorId = uuid(actor);
      return sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(840084)`;
        let groupId = input.templateId
          ? uuid(input.templateId)
          : "84008400-0000-4000-8000-000000000001";
        if (input.id) {
          const [existing] =
            await tx`SELECT template_id FROM provider_agreement_versions WHERE id=${uuid(input.id)}`;
          if (existing) groupId = existing.template_id;
        }
        const [group] =
          await tx`SELECT archived FROM provider_agreement_library WHERE id=${groupId} FOR UPDATE`;
        if (!group) throw new AgreementError("not_found", 404);
        if (group.archived) throw new AgreementError("archived_template", 409);
        if (!input.id) {
          const [row] =
            await tx`INSERT INTO provider_agreement_versions(template_id,template,created_by) VALUES (${groupId},${JSON.stringify(template)}::text::jsonb,${actorId}) RETURNING *`;
          await tx`INSERT INTO provider_agreement_audit(template_id,version_id,actor_id,action) VALUES (${groupId},${row.id},${actorId},'save')`;
          return version(row);
        }
        const id = uuid(input.id);
        const expected = revision(input.revision);
        const [row] =
          await tx`UPDATE provider_agreement_versions SET template=${JSON.stringify(template)}::text::jsonb,revision=revision+1,updated_at=now() WHERE id=${id} AND revision=${expected} AND status='draft' RETURNING *`;
        if (!row) {
          const [existing] =
            await tx`SELECT status FROM provider_agreement_versions WHERE id=${id}`;
          throw new AgreementError(
            existing && existing.status !== "draft"
              ? "immutable_version"
              : "stale_draft",
            409,
          );
        }
        await tx`INSERT INTO provider_agreement_audit(template_id,version_id,actor_id,action) VALUES (${groupId},${row.id},${actorId},'save')`;
        return version(row);
      });
    },
    async publish(idValue: string, expectedValue: number, actorValue?: string) {
      const id = uuid(idValue),
        expected = revision(expectedValue);
      return await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(840084)`;
        const [row] =
          await tx`SELECT * FROM provider_agreement_versions WHERE id=${id} FOR UPDATE`;
        if (!row || row.revision !== expected)
          throw new AgreementError("stale_draft", 409);
        const [group] =
          await tx`SELECT archived FROM provider_agreement_library WHERE id=${row.template_id} FOR UPDATE`;
        if (!group || group.archived)
          throw new AgreementError("archived_template", 409);
        if (row.status === "published") return version(row);
        if (row.template.builder) {
          const template = parseTemplate(row.template).builder!;
          const sample = previewBuilderValues(template.fields);
          await renderBuilderPdf(
            template,
            sampleData,
            sample.values,
            true,
            id,
            sample.fileNames,
          );
        }
        await tx`UPDATE provider_agreement_versions SET status='archived',revision=revision+1,updated_at=now() WHERE status='published'`;
        const [published] =
          await tx`UPDATE provider_agreement_versions SET status='published',revision=revision+1,updated_at=now() WHERE id=${id} RETURNING *`;
        await tx`INSERT INTO provider_agreement_audit(template_id,version_id,actor_id,action) VALUES (${row.template_id},${id},${uuid(actorValue ?? row.created_by)},'publish')`;
        return version(published);
      });
    },
    async snapshot(id: string): Promise<Snapshot> {
      const [row] =
        await sql`SELECT * FROM provider_agreement_snapshots WHERE provider_id=${uuid(id)}`;
      if (!row) throw new AgreementError("not_found", 404);
      return {
        providerId: String(row.provider_id),
        versionId: row.version_id ?? null,
        template: row.template ?? null,
        data: row.data,
        legacy: row.legacy,
      };
    },
  };
}
