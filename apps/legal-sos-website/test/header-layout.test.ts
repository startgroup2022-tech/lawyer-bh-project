import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("header layout", () => {
  it("keeps the brand copy visible and collapses navigation before it overlaps", () => {
    const styles = readFileSync("app/globals.css", "utf8");

    expect(styles).toContain(".header-inner { width: min(1560px, calc(100% - 32px))");
    expect(styles).toContain(".main-nav { white-space: nowrap");
    expect(styles).toContain(".header-actions { flex: 0 0 auto");
    expect(styles).toContain(".main-nav a { white-space: nowrap");
    expect(styles).toContain("@media (max-width: 1280px)");
    expect(styles).toContain(".sign-in, .notification-button { display: none; }");
    expect(styles).toContain(".main-nav { display: none; position: absolute;");
    expect(styles).not.toContain(".brand-lockup span, .sign-in, .notification-button { display: none; }");
    expect(styles).toContain("@media (max-width: 480px)");
    expect(styles).toContain(".brand-lockup strong { font-size: 16px; }");
    expect(styles).toContain(".mobile-menu { width: 38px; height: 38px; }");
  });
});
