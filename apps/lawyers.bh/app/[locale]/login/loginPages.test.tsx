import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LoginOptions from "./LoginOptions";
import RoleLoginForm from "./RoleLoginForm";

describe("separate login pages", () => {
  it.each(["ar", "en"])("links to both role-specific forms and provider registration (%s)", (locale) => {
    const html = renderToStaticMarkup(<LoginOptions locale={locale} />);
    expect(html).toContain(`href="/${locale}/login/provider"`);
    expect(html).toContain(`href="/${locale}/login/admin"`);
    expect(html).toContain(`href="/${locale}/join"`);
  });
  it.each(["ar", "en"])("provides an email-based admin form without provider registration (%s)", (locale) => {
    const html = renderToStaticMarkup(<RoleLoginForm locale={locale} role="admin" />);
    expect(html).toContain('type="email"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).not.toContain("/join");
  });
  it.each(["ar", "en"])("provides a license-based provider form with registration and recovery (%s)", (locale) => {
    const html = renderToStaticMarkup(<RoleLoginForm locale={locale} role="provider" />);
    expect(html).not.toContain('type="email"');
    expect(html).toContain(`href="/${locale}/join?mode=forgot"`);
    expect(html).toContain(`href="/${locale}/join"`);
  });
});
