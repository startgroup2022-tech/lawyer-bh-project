import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("public directory visibility contract", () => {
  it("defines a non-null default-visible lawyer field", () => {
    expect(source("lib/db/schema.ts")).toContain(
      'isPublicDirectoryVisible: boolean("is_public_directory_visible")\n      .default(true)\n      .notNull()',
    );
  });

  it("makes Habib operationally normal and web-hidden by exact UUID", () => {
    const migration = source("drizzle/0057_public_directory_visibility.sql");

    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS is_public_directory_visible boolean NOT NULL DEFAULT true",
    );
    expect(migration).toContain(
      "WHERE id = '3ee97030-bc1a-47c1-b06c-bd2b1acee637'::uuid",
    );
    expect(migration).toContain("is_review_account = false");
    expect(migration).toContain("is_public_directory_visible = false");
  });

  it("uses the visibility field only in the public website lawyer query", () => {
    const fieldName = "isPublicDirectoryVisible";

    expect(source("lib/publicLawyers.ts")).toContain(
      "eq(schema.bahrainLawyers.isPublicDirectoryVisible, true)",
    );
    for (const path of [
      "app/api/mobile/lawyers/route.ts",
      "lib/sos/live-dispatch-store.ts",
      "app/api/sos/lawyer/pickups/check/route.ts",
      "app/api/sos/lawyer/case/[caseRef]/accept/route.ts",
    ]) {
      expect(source(path), path).not.toContain(fieldName);
    }
  });
});
