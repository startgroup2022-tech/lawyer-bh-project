import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import proxy from "./proxy";

// Locale routing is not reached for rejected admin requests.
vi.mock("next-intl/middleware", () => ({ default: () => () => { throw new Error("Unexpected locale routing"); } }));

describe("admin login redirect", () => {
  it.each(["ar", "en"])("sends unauthenticated admin visits to the dedicated login (%s)", (locale) => {
    const response = proxy(new NextRequest(`https://www.lawyers.bh/${locale}/admin/terms`));
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe(`/${locale}/login/admin`);
    expect(target.searchParams.get("next")).toBe(`/${locale}/admin/terms`);
  });
});
