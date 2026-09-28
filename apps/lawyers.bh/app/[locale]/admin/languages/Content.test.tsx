import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Content, {
  createDraftLanguage,
  publishManagedLanguage,
  updateManagedLanguage,
} from "./Content";

const draft = {
  code: "fr",
  adminName: "French",
  nativeName: "Français",
  direction: "ltr" as const,
  status: "draft" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("language management presentation", () => {
  it("renders an accessible Arabic RTL catalogue with draft guidance and immutable saved codes", () => {
    const html = renderToStaticMarkup(<Content isAr initialLanguages={[draft]} />);

    expect(html).toContain('dir="rtl"');
    expect(html).toContain("إدارة اللغات");
    expect(html).toContain("النشر في الكتالوج يجعل اللغة متاحة لبيانات الدول فقط");
    expect(html).toContain('aria-label="رمز اللغة"');
    expect(html).toContain("إضافة كمسودة للكتالوج");
    expect(html).toContain("مسودة");
    expect(html).toContain("fr");
    expect(html).not.toContain('value="fr"');
    expect(html).not.toContain("حذف");
    expect(html).toContain("بيانات كتالوج اللغة جاهزة");
    expect(html).toContain("تفعيل اللغة وترجمة اسم كل دولة يتمان من إدارة الدول");
    expect(html).toContain("الواجهة العامة الكاملة غير متاحة");
    expect(html).toContain("نشر في كتالوج اللغات");
    const cataloguePublishButton = html.match(/<button type="button"[^>]*>نشر في كتالوج اللغات<\/button>/)?.[0];
    expect(cataloguePublishButton).toBeDefined();
    expect(cataloguePublishButton).not.toContain(' disabled=""');
  });

  it("renders English LTR copy, a published badge, and direction choices", () => {
    const html = renderToStaticMarkup(<Content isAr={false} initialLanguages={[{...draft, status: "published"}]} />);

    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Language management");
    expect(html).toContain("Published in catalogue");
    expect(html).toContain("Full public interface not ready");
    expect(html).toContain("Left to right (LTR)");
    expect(html).toContain("Right to left (RTL)");
  });

  it("identifies source-controlled locales without implying dynamic public routes", () => {
    const html = renderToStaticMarkup(<Content isAr={false} initialLanguages={[{...draft, code: "ar", adminName: "Arabic", nativeName: "العربية", direction: "rtl", status: "published"}]} />);
    expect(html).toContain("Full public interface ready");
    expect(html).toContain("Public routes remain source-controlled");
  });

  it("disables publishing when required labels are not ready", () => {
    const incomplete = {...draft, nativeName: ""};
    const html = renderToStaticMarkup(<Content isAr initialLanguages={[incomplete]} />);

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*نشر/);
    expect(html).toContain("أكمل الاسم الإداري والاسم الأصلي واتجاه الكتابة قبل النشر في الكتالوج");
  });
});

describe("language management requests", () => {
  it("creates a normalized draft through the language catalogue endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ok: true, language: draft}), {status: 201}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDraftLanguage({code: " FR ", adminName: " French ", nativeName: " Français ", direction: "ltr"})).resolves.toEqual(draft);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/languages", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({code: "fr", adminName: "French", nativeName: "Français", direction: "ltr"}),
    });
  });

  it("rejects invalid codes before sending a create request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDraftLanguage({code: "bad_code", adminName: "French", nativeName: "Français", direction: "ltr"})).rejects.toThrow("INVALID_LANGUAGE_CODE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("edits metadata without sending the immutable code and publishes in a separate request", async () => {
    const updated = {...draft, adminName: "French language"};
    const published = {...updated, status: "published" as const};
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: true, language: updated})))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: true, language: published})));
    vi.stubGlobal("fetch", fetchMock);

    await updateManagedLanguage("fr", {adminName: "French language", nativeName: "Français", direction: "ltr"});
    await publishManagedLanguage(updated);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/admin/languages/fr", {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({adminName: "French language", nativeName: "Français", direction: "ltr"}),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin/languages/fr", {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({publish: true}),
    });
  });
});
