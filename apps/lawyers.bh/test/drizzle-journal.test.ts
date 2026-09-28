import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = resolve(appRoot, "drizzle");

describe("Drizzle migration journal", () => {
  it("registers the typed payment request migration and verification", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    expect(journal.entries.map(({ tag }) => tag)).toContain(
      "0035_polymorphic_payment_requests",
    );
    expect(() =>
      readFileSync(
        resolve(
          migrationsDirectory,
          "0035_polymorphic_payment_requests.sql",
        ),
        "utf8",
      ),
    ).not.toThrow();
    expect(() =>
      readFileSync(
        resolve(
          migrationsDirectory,
          "verify_0035_polymorphic_payment_requests.sql",
        ),
        "utf8",
      ),
    ).not.toThrow();
  });

  it("registers a migration that makes lawyer working hours optional", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    const migration = readFileSync(
      resolve(
        migrationsDirectory,
        "0036_optional_lawyer_working_hours.sql",
      ),
      "utf8",
    );
    const verification = readFileSync(
      resolve(
        migrationsDirectory,
        "verify_0036_optional_lawyer_working_hours.sql",
      ),
      "utf8",
    );

    expect(journal.entries.map(({ tag }) => tag)).toContain(
      "0036_optional_lawyer_working_hours",
    );
    expect(migration).toContain("ALTER COLUMN working_hours DROP NOT NULL");
    expect(migration).toContain("ALTER COLUMN working_hours DROP DEFAULT");
    expect(verification).toContain("column_name = 'working_hours'");
    expect(verification).toContain("is_nullable <> 'YES'");
  });

  it("registers delayed provider settlement exactly once", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    const tag = "0037_delayed_provider_payables";
    const matchingEntries = journal.entries.filter((entry) => entry.tag === tag);

    expect(matchingEntries).toHaveLength(1);
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `${tag}.sql`), "utf8"),
    ).not.toThrow();
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `verify_${tag}.sql`), "utf8"),
    ).not.toThrow();
  });

  it("registers consultation method pricing exactly once", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    const tag = "0038_update_consultation_method_prices";
    const matchingEntries = journal.entries.filter((entry) => entry.tag === tag);

    expect(matchingEntries).toHaveLength(1);
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `${tag}.sql`), "utf8"),
    ).not.toThrow();
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `verify_${tag}.sql`), "utf8"),
    ).not.toThrow();
  });

  it("registers the video consultation price exactly once", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    const tag = "0039_update_video_consultation_price";
    const matchingEntries = journal.entries.filter((entry) => entry.tag === tag);

    expect(matchingEntries).toHaveLength(1);
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `${tag}.sql`), "utf8"),
    ).not.toThrow();
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `verify_${tag}.sql`), "utf8"),
    ).not.toThrow();
  });

  it("registers admin mobile notifications exactly once", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    const tag = "0042_admin_mobile_notifications";
    const matchingEntries = journal.entries.filter((entry) => entry.tag === tag);

    expect(matchingEntries).toHaveLength(1);
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `${tag}.sql`), "utf8"),
    ).not.toThrow();
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `verify_${tag}.sql`), "utf8"),
    ).not.toThrow();
  });

  it("registers communication safety exactly once", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    const tag = "0106_communication_safety";
    const matchingEntries = journal.entries.filter((entry) => entry.tag === tag);

    expect(matchingEntries).toHaveLength(1);
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `${tag}.sql`), "utf8"),
    ).not.toThrow();
    expect(() =>
      readFileSync(resolve(migrationsDirectory, `verify_${tag}.sql`), "utf8"),
    ).not.toThrow();
  });

  it("registers moderation admin alerts exactly once", () => {
    const journal = JSON.parse(readFileSync(resolve(migrationsDirectory, "meta", "_journal.json"), "utf8")) as { entries: Array<{ tag: string }> };
    const tag = "0107_moderation_admin_alerts";
    expect(journal.entries.filter((entry) => entry.tag === tag)).toHaveLength(1);
    expect(() => readFileSync(resolve(migrationsDirectory, `${tag}.sql`), "utf8")).not.toThrow();
    expect(() => readFileSync(resolve(migrationsDirectory, `verify_${tag}.sql`), "utf8")).not.toThrow();
  });
});
