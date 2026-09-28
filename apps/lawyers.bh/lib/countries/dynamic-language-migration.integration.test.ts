import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.CLIENT_AUTH_TEST_DATABASE_URL;

describe.skipIf(!url)(
  "dynamic language migration in isolated PostgreSQL",
  { timeout: 30_000 },
  () => {
    if (url) {
      const parsed = new URL(url);
      const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (!localHost || !parsed.pathname.endsWith("/client_auth_test")) {
        throw new Error("Use the dedicated local client_auth_test database only");
      }
      const socket = parsed.searchParams.get("host");
      if (socket && !socket.startsWith("/private/tmp/country-migration.")) {
        throw new Error("Unexpected test database socket");
      }
    }

    const schema = `country_language_test_${randomUUID().replaceAll("-", "")}`;
    const connection = new URL(url ?? "postgres://localhost/client_auth_test");
    const socket = connection.searchParams.get("host");
    connection.searchParams.delete("host");
    const sql = postgres(connection.toString(), {
      host: socket ?? "localhost",
      max: 4,
      connection: { search_path: schema },
      onnotice: () => {},
    });

    beforeAll(async () => {
      await sql.unsafe(`CREATE SCHEMA ${schema}`);
      await sql.unsafe(`
        CREATE TABLE ${schema}.admin_users (id uuid PRIMARY KEY);
        CREATE TABLE ${schema}.countries (
          code varchar(2) PRIMARY KEY,
          table_prefix varchar(16) NOT NULL UNIQUE,
          name_ar text NOT NULL,
          name_en text NOT NULL,
          default_locale varchar(35) NOT NULL,
          is_active boolean NOT NULL DEFAULT false,
          tables_provisioned boolean NOT NULL DEFAULT false,
          provision_count integer NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE ${schema}.country_channel_settings (
          code varchar(2) PRIMARY KEY,
          app_enabled boolean NOT NULL DEFAULT false,
          website_enabled boolean NOT NULL DEFAULT false,
          website_url text,
          background_url text,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE FUNCTION ${schema}.test_country_provisioning()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.is_active AND NOT NEW.tables_provisioned THEN
            NEW.tables_provisioned := true;
            NEW.provision_count := OLD.provision_count + 1;
          END IF;
          RETURN NEW;
        END;
        $$;
        CREATE TRIGGER test_country_provisioning_trigger
        BEFORE UPDATE ON ${schema}.countries
        FOR EACH ROW EXECUTE FUNCTION ${schema}.test_country_provisioning();
        INSERT INTO ${schema}.countries
          (code, table_prefix, name_ar, name_en, default_locale)
        VALUES
          ('ZZ', 'zztest', 'اختبار', 'Test', 'ps-Arab'),
          ('ZY', 'zytest', 'اختبار ثان', 'Second Test', 'ar'),
          ('XA', 'xatest', 'اختبار نكو', 'NKo Test', 'nqo'),
          ('XB', 'xbtest', 'اختبار سرياني', 'Syriac Test', 'syr'),
          ('XC', 'xctest', 'اختبار أدلم', 'Adlam Test', 'ff-Adlm'),
          ('XD', 'xdtest', 'اختبار تانا', 'Thaana Test', 'dv-Thaa'),
          ('XE', 'xetest', 'اختبار نكو وسم', 'NKo Script Test', 'nqo-Nkoo'),
          ('XF', 'xftest', 'اختبار سرياني وسم', 'Syriac Script Test', 'syr-Syrc'),
          ('XG', 'xgtest', 'اختبار فولاني', 'Fula Test', 'ff');
      `);

      const source = await readFile(
        new URL("../../drizzle/0112_dynamic_languages_country_platforms.sql", import.meta.url),
        "utf8",
      );
      const isolated = source.replaceAll("public.", `${schema}.`);
      for (const statement of isolated.split("--> statement-breakpoint")) {
        if (statement.trim()) await sql.unsafe(statement);
      }
    });

    afterAll(async () => {
      try {
        await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await sql.end();
      }
    });

    it("provisions once and preserves the other product flag", async () => {
      await sql`SELECT * FROM activate_country_platform('ZZ', 'lawyers')`;
      await sql`SELECT * FROM activate_country_platform('ZZ', 'lawyers')`;

      expect(await sql`
        SELECT tables_provisioned, provision_count
        FROM countries WHERE code = 'ZZ'
      `).toEqual([{ tables_provisioned: true, provision_count: 1 }]);
      expect(await sql`
        SELECT lawyers_platform_enabled, legal_sos_enabled
        FROM country_channel_settings WHERE code = 'ZZ'
      `).toEqual([{ lawyers_platform_enabled: true, legal_sos_enabled: false }]);

      await sql`SELECT * FROM activate_country_platform('ZZ', 'legal_sos')`;
      await sql`SELECT * FROM activate_country_platform('ZZ', 'lawyers')`;

      expect(await sql`
        SELECT lawyers_platform_enabled, legal_sos_enabled
        FROM country_channel_settings WHERE code = 'ZZ'
      `).toEqual([{ lawyers_platform_enabled: true, legal_sos_enabled: true }]);
      expect(await sql`
        SELECT provision_count FROM countries WHERE code = 'ZZ'
      `).toEqual([{ provision_count: 1 }]);
      expect(await sql`
        SELECT l.direction, cls.is_default
        FROM platform_languages l
        JOIN country_language_settings cls ON cls.language_code = l.code
        WHERE cls.country_code = 'ZZ' AND l.code = 'ps-arab'
      `).toEqual([{ direction: "rtl", is_default: true }]);
      expect(await sql`
        SELECT code, direction
        FROM platform_languages
        WHERE code IN ('nqo', 'syr', 'ff-adlm', 'dv-thaa', 'nqo-nkoo', 'syr-syrc', 'ff')
        ORDER BY code
      `).toEqual([
        { code: "dv-thaa", direction: "rtl" },
        { code: "ff", direction: "ltr" },
        { code: "ff-adlm", direction: "rtl" },
        { code: "nqo", direction: "rtl" },
        { code: "nqo-nkoo", direction: "rtl" },
        { code: "syr", direction: "rtl" },
        { code: "syr-syrc", direction: "rtl" },
      ]);
    });

    it("rejects drafts and serializes a concurrent downgrade with membership", async () => {
      await sql`
        INSERT INTO platform_languages
          (code, admin_name, native_name, direction, status)
        VALUES ('zzx', 'Draft', 'Draft', 'ltr', 'draft')
      `;
      await expect(sql`
        INSERT INTO country_language_settings
          (country_code, language_code, is_default)
        VALUES ('ZY', 'zzx', false)
      `).rejects.toMatchObject({ code: "P0001" });

      await sql`
        INSERT INTO platform_languages
          (code, admin_name, native_name, direction, status)
        VALUES ('zzy', 'Race', 'Race', 'ltr', 'published')
      `;

      const membershipConnection = await sql.reserve();
      let releaseDowngrade: () => void = () => {};
      let downgrade: Promise<unknown> | undefined;
      try {
        const pidRows = await membershipConnection`SELECT pg_backend_pid()::int AS pid`;
        const membershipPid = Number(pidRows[0]?.pid);
        let downgradeStarted!: () => void;
        const release = new Promise<void>((resolve) => { releaseDowngrade = resolve; });
        const started = new Promise<void>((resolve) => { downgradeStarted = resolve; });
        downgrade = sql.begin(async (tx) => {
          await tx`UPDATE platform_languages SET status = 'draft' WHERE code = 'zzy'`;
          downgradeStarted();
          await release;
        });

        await started;
        const membership = membershipConnection`
          INSERT INTO country_language_settings
            (country_code, language_code, is_default)
          VALUES ('ZY', 'zzy', false)
        `.then(
          () => ({ state: "fulfilled" as const, error: null }),
          (error: unknown) => ({ state: "rejected" as const, error }),
        );

        const lockDeadline = Date.now() + 3_000;
        let observedLockWait = false;
        while (Date.now() < lockDeadline) {
          const activity = await sql`
            SELECT wait_event_type
            FROM pg_stat_activity
            WHERE pid = ${membershipPid}
          `;
          if (activity[0]?.wait_event_type === "Lock") {
            observedLockWait = true;
            break;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 20));
        }
        expect(observedLockWait).toBe(true);

        releaseDowngrade();
        await downgrade;
        const result = await membership;
        expect(result.state).toBe("rejected");
        expect(result.error).toMatchObject({ code: "P0001" });
        expect(await sql`
          SELECT 1 FROM country_language_settings WHERE language_code = 'zzy'
        `).toHaveLength(0);
      } finally {
        releaseDowngrade();
        await downgrade?.catch(() => undefined);
        membershipConnection.release();
      }
    });
  },
);
