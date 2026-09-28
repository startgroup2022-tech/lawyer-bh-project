import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = resolve(appRoot, "drizzle");

describe("Drizzle migration journal", () => {
  it("registers the Saudi financial isolation migration and verifier", () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(migrationsDirectory, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string }> };
    expect(journal.entries.at(-1)?.tag).toBe("0034_ksa_financial_isolation");
    expect(
      existsSync(resolve(migrationsDirectory, "0034_ksa_financial_isolation.sql")),
    ).toBe(true);
    expect(
      existsSync(
        resolve(
          migrationsDirectory,
          "verify_0034_ksa_financial_isolation.sql",
        ),
      ),
    ).toBe(true);
  });
});
