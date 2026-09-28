import { readFileSync } from "node:fs";
import postgres from "postgres";
import sharp from "sharp";
import { beforeAll, afterAll, expect, it, describe } from "vitest";
import { createAgreementStore } from "./store";
import { legacyTemplate, modernDraft } from "./model";
import { createAgreementLibrary } from "./library-store";
import { createAgreementFiles } from "./builder-files";
import { importBuilder } from "./builder-model";
const url = process.env.AGREEMENT_TEST_DATABASE_URL;
let sql: ReturnType<typeof postgres>,
  store: ReturnType<typeof createAgreementStore>;
describe.skipIf(!url)(
  "isolated agreement publication and atomic signing",
  () => {
    beforeAll(async () => {
      const u = new URL(url!);
      if (
        u.hostname !== "127.0.0.1" ||
        u.port !== "55437" ||
        u.pathname !== "/agreement_test"
      )
        throw new Error("Isolated database only");
      sql = postgres(url!, { onnotice: () => {} });
      await sql.unsafe(
        "DROP TABLE IF EXISTS bahrain_lawyers,provider_agreement_snapshots,provider_agreement_versions,provider_agreement_library,provider_agreement_audit,provider_agreement_files,provider_agreement_uploads,provider_agreement_upload_limits CASCADE",
      );
      await sql.unsafe(
        "CREATE TABLE bahrain_lawyers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),full_name_ar text,full_name_en text,email text,phone text,registration_no text,signature_data_url text,agreement_accepted boolean DEFAULT false,created_at timestamptz DEFAULT now(),completed_profile_at timestamptz)",
      );
      const migration = readFileSync(
        "drizzle/0084_provider_agreements.sql",
        "utf8",
      );
      await sql`INSERT INTO bahrain_lawyers(id,full_name_ar,signature_data_url,agreement_accepted,created_at) VALUES ('00000000-0000-4000-8000-000000000080','سجل سابق','old-signature',true,'2026-01-01T00:00:00Z')`;
      await sql.unsafe(migration);
      await sql.unsafe(migration);
      await sql.unsafe(
        readFileSync("drizzle/0086_agreement_template_library.sql", "utf8"),
      );
      await sql.unsafe(
        readFileSync("drizzle/0087_agreement_builder_signing.sql", "utf8"),
      );
      store = createAgreementStore(sql);
    });
    afterAll(async () => {
      await sql?.end();
    });
    it("backfills existing signatures once using frozen legacy content", async () => {
      const snapshot = await store.snapshot(
        "00000000-0000-4000-8000-000000000080",
      );
      expect(snapshot.legacy).toBe(true);
      expect(snapshot.template).toBeNull();
      expect(snapshot.data.fullNameAr).toBe("سجل سابق");
      expect(snapshot.data.signatureDataUrl).toBe("old-signature");
      expect(new Date(snapshot.data.signedAt).toISOString()).toBe(
        "2026-01-01T00:00:00.000Z",
      );
    });
    it("publishes atomically and locks published content against editing", async () => {
      const a = await store.save(
        { template: legacyTemplate() },
        "00000000-0000-4000-8000-000000000001",
      );
      const b = await store.save(
        { template: { ...legacyTemplate(), titleAr: "عنوان جديد" } },
        "00000000-0000-4000-8000-000000000001",
      );
      await Promise.all([
        store.publish(a.id, a.revision),
        store.publish(b.id, b.revision),
      ]);
      const list = await store.list();
      expect(list.filter((v) => v.status === "published")).toHaveLength(1);
      await expect(
        store.save(
          { id: a.id, revision: 1, template: legacyTemplate() },
          "00000000-0000-4000-8000-000000000001",
        ),
      ).rejects.toThrow("immutable_version");
    });
    it("captures signed content and identity and refuses a stale template atomically", async () => {
      const current = (await store.current())!;
      const [row] =
        await sql`INSERT INTO bahrain_lawyers(full_name_ar,email,signature_data_url,agreement_accepted,provider_agreement_version_id) VALUES ('محمد','test@example.invalid','data:image/png;base64,AAAA',true,${current.id}) RETURNING id`;
      const before = await store.snapshot(row.id);
      expect(before.data.fullNameAr).toBe("محمد");
      expect(before.template?.titleAr).toBe(current.template.titleAr);
      await sql`UPDATE bahrain_lawyers SET full_name_ar='Changed',signature_data_url='changed' WHERE id=${row.id}`;
      expect(await store.snapshot(row.id)).toEqual(before);
      const next = await store.save(
        { template: legacyTemplate() },
        "00000000-0000-4000-8000-000000000001",
      );
      await store.publish(next.id, next.revision);
      expect(await store.snapshot(row.id)).toEqual(before);
      await expect(
        sql`INSERT INTO bahrain_lawyers(signature_data_url,agreement_accepted,provider_agreement_version_id) VALUES ('x',true,${current.id})`,
      ).rejects.toThrow("agreement_version_stale");
      await expect(
        sql`UPDATE provider_agreement_snapshots SET data='{}' WHERE provider_id=${row.id}`,
      ).rejects.toThrow("immutable_agreement");
    });
    it("does not assign a newly published template to legacy callers", async () => {
      await expect(
        sql`INSERT INTO bahrain_lawyers(signature_data_url,agreement_accepted,provider_agreement_disclosed) VALUES ('x',true,true)`,
      ).rejects.toThrow("agreement_version_stale");
      const [row] =
        await sql`INSERT INTO bahrain_lawyers(full_name_ar,signature_data_url,agreement_accepted) VALUES ('قديم','x',true) RETURNING id`;
      const snap = await store.snapshot(row.id);
      expect(snap.legacy).toBe(true);
      expect(snap.template).toBeNull();
    });
    it("freezes platform assets with the signed version and keeps asset bytes out of lists", async () => {
      const template = modernDraft(legacyTemplate());
      template.presentation!.firstParty.nameAr = "مفوض النسخة الأولى";
      template.presentation!.firstParty.stampDataUrl =
        "data:image/png;base64," +
        (
          await sharp({
            create: {
              width: 10,
              height: 10,
              channels: 4,
              background: "transparent",
            },
          })
            .png()
            .toBuffer()
        ).toString("base64");
      const saved = await store.save(
        { template },
        "00000000-0000-4000-8000-000000000001",
      );
      await store.publish(saved.id, saved.revision);
      const [row] =
        await sql`INSERT INTO bahrain_lawyers(signature_data_url,agreement_accepted,provider_agreement_version_id) VALUES ('test',true,${saved.id}) RETURNING id`;
      const original = await store.snapshot(row.id);
      expect(original.template?.presentation?.firstParty.nameAr).toBe(
        "مفوض النسخة الأولى",
      );
      template.presentation!.firstParty.nameAr = "مفوض جديد";
      template.presentation!.firstParty.stampDataUrl = "";
      const next = await store.save(
        { template },
        "00000000-0000-4000-8000-000000000001",
      );
      await store.publish(next.id, next.revision);
      expect(await store.snapshot(row.id)).toEqual(original);
      expect((await store.list())[0].template.presentation).toBeUndefined();
      expect(
        (await store.get(next.id)).template.presentation?.firstParty.nameAr,
      ).toBe("مفوض جديد");
    });
    it("creates independent libraries, archives inactive groups and protects the active one", async () => {
      const library = createAgreementLibrary(sql),
        actor = "00000000-0000-4000-8000-000000000001";
      const a = await library.create(
        { name: "محامون", description: "القالب الأول" },
        actor,
      );
      const av = await store.save(
        { template: legacyTemplate(), templateId: a.id },
        actor,
      );
      await store.publish(av.id, av.revision, actor);
      await expect(
        library.update(
          {
            id: a.id,
            revision: a.revision,
            name: a.name,
            description: a.description,
            archived: true,
          },
          actor,
        ),
      ).rejects.toThrow("active_template");
      const b = await library.copy(
        { versionId: av.id, name: "استشاريون", description: "نسخة مستقلة" },
        actor,
      );
      expect(b.id).not.toBe(a.id);
      const copies = await store.list(b.id);
      expect(copies).toHaveLength(1);
      expect(copies[0].status).toBe("draft");
      expect((await store.get(copies[0].id)).template).toEqual(
        (await store.get(av.id)).template,
      );
      const archived = await library.update({ ...b, archived: true }, actor);
      await expect(
        store.publish(copies[0].id, copies[0].revision, actor),
      ).rejects.toThrow("archived_template");
      await expect(
        store.save({ template: legacyTemplate(), templateId: b.id }, actor),
      ).rejects.toThrow("archived_template");
      const restored = await library.update(
        { ...archived, archived: false },
        actor,
      );
      await expect(
        library.update({ ...b, name: "Stale", archived: false }, actor),
      ).rejects.toThrow("stale_draft");
      await store.publish(copies[0].id, copies[0].revision, actor);
      const list = await library.list();
      expect(list.find((g) => g.id === restored.id)?.activeVersionId).toBe(
        copies[0].id,
      );
      expect(list.filter((g) => g.activeVersionId)).toHaveLength(1);
      const audit =
        await sql`SELECT actor_id,action FROM provider_agreement_audit WHERE template_id=${b.id} ORDER BY created_at`;
      expect(audit.map((r) => r.action)).toEqual([
        "copy",
        "archive",
        "restore",
        "publish",
      ]);
      expect(audit.every((r) => r.actor_id === actor)).toBe(true);
    });
    it("reruns library backfill without changing signed snapshots or existing group assignments", async () => {
      const before =
        await sql`SELECT * FROM provider_agreement_snapshots ORDER BY provider_id`;
      const versions =
        await sql`SELECT id,template_id,template FROM provider_agreement_versions ORDER BY number`;
      await sql.unsafe(
        readFileSync("drizzle/0086_agreement_template_library.sql", "utf8"),
      );
      expect(
        await sql`SELECT * FROM provider_agreement_snapshots ORDER BY provider_id`,
      ).toEqual(before);
      expect(
        await sql`SELECT id,template_id,template FROM provider_agreement_versions ORDER BY number`,
      ).toEqual(versions);
    });
    it("binds uploads to a version and signing request and freezes files atomically", async () => {
      const files = createAgreementFiles(sql),
        builder = importBuilder(legacyTemplate()),
        actor = "00000000-0000-4000-8000-000000000001";
      builder.fields = [
        {
          id: "document",
          kind: "file",
          required: true,
          label: { ar: "المستند", en: "Document" },
          help: { ar: "", en: "" },
          options: [],
        },
      ];
      const version = await store.save({ template: { builder } }, actor);
      await store.publish(version.id, version.revision, actor);
      const png = await sharp({
        create: { width: 10, height: 10, channels: 4, background: "white" },
      })
        .png()
        .toBuffer();
      const session = await files.start(version.id, "test-client");
      const file = await files.beginFile(session.token, {
        fieldId: "document",
        name: "test.png",
        mime: "image/png",
        size: png.length,
      });
      await files.append(session.token, file.id, 0, png);
      await files.finish(session.token, file.id);
      const other = await files.start(version.id, "test-client");
      await expect(
        files.validateReferences(
          other.token,
          version.id,
          { document: file.id },
          builder.fields,
        ),
      ).rejects.toThrow("invalid_file_reference");
      const checked = await files.validateReferences(
        session.token,
        version.id,
        { document: file.id },
        builder.fields,
      );
      const [provider] =
        await sql`INSERT INTO bahrain_lawyers(signature_data_url,agreement_accepted,provider_agreement_version_id,provider_agreement_disclosed,provider_agreement_extras,provider_agreement_upload_hash) VALUES ('test',true,${version.id},true,${JSON.stringify({ document: file.id })}::text::jsonb,${checked.tokenHash}) RETURNING id`;
      const snapshot = await store.snapshot(provider.id);
      expect(snapshot.data.extraValues).toEqual({ document: file.id });
      expect(snapshot.data.fileNames).toEqual({ [file.id]: "test.png" });
      expect((await files.download(file.id, provider.id)).bytes).toEqual(png);
      await expect(
        files.download(file.id, "00000000-0000-4000-8000-000000000099"),
      ).rejects.toThrow("not_found");
      await expect(
        files.append(session.token, file.id, png.length, png),
      ).rejects.toThrow();
      await expect(
        sql`UPDATE provider_agreement_files SET name='changed' WHERE id=${file.id}`,
      ).rejects.toThrow("immutable_agreement_file");
      await expect(
        sql`INSERT INTO bahrain_lawyers(signature_data_url,agreement_accepted,provider_agreement_version_id,provider_agreement_disclosed,provider_agreement_extras,provider_agreement_upload_hash) VALUES ('test',true,${version.id},true,${JSON.stringify({ document: file.id })}::text::jsonb,${checked.tokenHash})`,
      ).rejects.toThrow("invalid_agreement_files");
    });
    it("rejects excessive file sizes, malformed bytes, invalid offsets and exhausted upload quotas", async () => {
      const files = createAgreementFiles(sql),
        v = (await store.current())!;
      const { token } = await files.start(v.id, "negative-client");
      await expect(
        files.beginFile(token, {
          fieldId: "document",
          name: "too-big.pdf",
          mime: "application/pdf",
          size: 5242881,
        }),
      ).rejects.toThrow("invalid_file");
      await expect(
        files.beginFile(token, {
          fieldId: "not_defined",
          name: "a.pdf",
          mime: "application/pdf",
          size: 20,
        }),
      ).rejects.toThrow("invalid_file_reference");
      const file = await files.beginFile(token, {
        fieldId: "document",
        name: "a.png",
        mime: "image/png",
        size: 4,
      });
      await expect(
        files.append(token, file.id, 2, Buffer.from("fake")),
      ).rejects.toThrow("invalid_chunk");
      await files.append(token, file.id, 0, Buffer.from("fake"));
      await expect(files.finish(token, file.id)).rejects.toThrow(
        "invalid_file",
      );
      for (let i = 0; i < 4; i++) await files.start(v.id, "negative-client");
      await expect(files.start(v.id, "negative-client")).rejects.toThrow(
        "rate_limited",
      );
    });
    it('cleans only expired unclaimed uploads and preserves signed attachments',async()=>{
      const files=createAgreementFiles(sql);
      const before=await sql`SELECT id,bytes FROM provider_agreement_files WHERE provider_id IS NOT NULL`;
      await sql`UPDATE provider_agreement_uploads SET expires_at=now()-interval '2 days'`;
      expect(await files.cleanupExpired()).toBeGreaterThan(0);
      expect(await sql`SELECT id,bytes FROM provider_agreement_files WHERE provider_id IS NOT NULL`).toEqual(before);
      expect((await sql`SELECT count(*)::int AS n FROM provider_agreement_uploads WHERE provider_id IS NULL`)[0].n).toBe(0);
    });
  },
);
