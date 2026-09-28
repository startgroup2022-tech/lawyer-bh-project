import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import JoinPage from "./Content";

vi.mock("next-intl", () => ({ useLocale: () => "ar" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
vi.mock("react", async original => {
  const react = await original<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => react.useState(initial === true ? false : initial) };
});

describe("registration-only join page", () => {
  it("offers new registration and links existing accounts to the single login entry", () => {
    const html = renderToStaticMarkup(<JoinPage registrationTerms={null} />);
    expect(html).toContain("انضم إلى المنصة");
    expect(html).toContain('href="/login"');
    expect(html).toContain("لديك حساب بالفعل؟");
    expect(html).not.toMatch(/<button\b[^>]*>\s*(?:تسجيل الدخول|تسجيل جديد)\s*<\/button>/);
  });
});
