import { describe, expect, it } from "vitest";

import {
  sarayaRedirectUrl,
  sarayaRewritePath,
} from "./lib/saraya/routing";

describe("Saraya public routing", () => {
  it("serves the Flutter index at the sq.lawyers.bh root", () => {
    expect(sarayaRewritePath("sq.lawyers.bh", "/")).toBe(
      "/saraya/index.html",
    );
  });

  it.each(["/saraya", "/saraya/", "/ar/saraya", "/en/saraya/"])(
    "redirects the legacy path %s to the canonical subdomain",
    (path) => {
      expect(sarayaRedirectUrl("www.lawyers.bh", path)).toBe(
        "https://sq.lawyers.bh",
      );
    },
  );

  it("does not redirect the canonical subdomain", () => {
    expect(sarayaRedirectUrl("sq.lawyers.bh", "/")).toBeNull();
  });

  it("rewrites root static assets into the Flutter bundle", () => {
    expect(sarayaRewritePath("sq.lawyers.bh", "/main.dart.js")).toBe(
      "/saraya/main.dart.js",
    );
    expect(sarayaRewritePath("sq.lawyers.bh", "/assets/AssetManifest.bin")).toBe(
      "/saraya/assets/AssetManifest.bin",
    );
  });

  it("serves the Flutter index for canonical deep links", () => {
    expect(sarayaRewritePath("sq.lawyers.bh", "/account")).toBe(
      "/saraya/index.html",
    );
  });

  it("does not rewrite internal Saraya asset paths twice", () => {
    expect(sarayaRewritePath("sq.lawyers.bh", "/saraya/main.dart.js")).toBeNull();
  });
});
