import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lawyer portal responsive styles", () => {
  it("defines the embedded login, dashboard, request groups, and mobile breakpoint", () => {
    const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");

    for (const selector of [
      ".lawyer-login-form",
      ".lawyer-dashboard",
      ".lawyer-dashboard-summary",
      ".lawyer-request-groups",
      ".lawyer-request-card",
    ]) {
      expect(css).toContain(selector);
    }
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)/);
  });
});
