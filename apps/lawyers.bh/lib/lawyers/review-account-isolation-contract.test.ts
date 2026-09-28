import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("review account server-side isolation contract", () => {
  it("excludes review accounts from the public web directory query", () => {
    expect(source("lib/publicLawyers.ts")).toContain(
      "eq(schema.bahrainLawyers.isReviewAccount, false)",
    );
  });

  it("excludes review accounts from the mobile directory", () => {
    const route = source("app/api/mobile/lawyers/route.ts");
    expect(route).toContain(
      "eq(schema.bahrainLawyers.isReviewAccount, false)",
    );
    expect(route).not.toContain("mobile-directory-review-visibility");
    expect(route).not.toContain("MOBILE_DIRECTORY_REVIEW_LAWYER_IDS");
  });

  it("excludes review accounts from live dispatch candidates", () => {
    expect(source("lib/sos/live-dispatch-store.ts")).toContain(
      "AND lawyers.is_review_account = false",
    );
  });

  it("excludes review accounts from lawyer notification audiences", () => {
    expect(source("lib/admin/mobile-notifications/store.ts")).toContain(
      "COALESCE(lawyer.is_review_account, false) = false",
    );
  });

  it.each([
    "app/api/sos/lawyer/pickups/check/route.ts",
    "app/api/sos/lawyer/case/[caseRef]/accept/route.ts",
  ])("guards review accounts at the authenticated request boundary in %s", (path) => {
    expect(source(path)).toContain("auth.advocate.isReviewAccount");
  });

  it("keeps review isolation in centralized request eligibility", () => {
    expect(source("lib/sos/lawyer-request-eligibility.ts")).toContain(
      "!state.isReviewAccount",
    );
  });
});
