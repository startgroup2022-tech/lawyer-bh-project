// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import BuilderEditor from "@/app/[locale]/admin/provider-agreement/BuilderEditor";
import { importBuilder } from "./builder-model";
import { legacyTemplate } from "./model";
it("adds independent fields and exposes footer controls through tabs", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const holder = document.createElement("div"),
    root = createRoot(holder);
  function Harness() {
    const [value, setValue] = useState(importBuilder(legacyTemplate()));
    return (
      <BuilderEditor
        ar
        value={value}
        disabled={false}
        onChange={setValue}
        onUpload={async () => {}}
      />
    );
  }
  try {
    await act(async () => root.render(<Harness />));
    const click = async (label: string) => {
      const button = [...holder.querySelectorAll("button")].find(
        (b) => b.textContent === label,
      );
      expect(button).toBeDefined();
      await act(async () => button!.click());
    };
    await click("حقول التسجيل");
    await click("إضافة حقل");
    await click("إضافة حقل");
    expect(holder.querySelectorAll("[data-field-id]")).toHaveLength(2);
    const ids = [...holder.querySelectorAll("[data-field-id]")].map((e) =>
      e.getAttribute("data-field-id"),
    );
    expect(new Set(ids).size).toBe(2);
    await click("الفوتر");
    expect(holder.textContent).toContain("ترقيم الصفحات");
    await click("إضافة سطر للفوتر");
    expect(holder.textContent).toContain("مصدر القيمة");
    await click("مواد الاتفاقية");
    expect(
      holder.querySelector('option[value="provider_name"]')?.textContent,
    ).toBe("اسم مقدم الخدمة");
  } finally {
    await act(async () => root.unmount());
  }
});
it("selects PDF languages and adds an editable manual language", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const holder = document.createElement("div"), root = createRoot(holder);
  let latest = importBuilder(legacyTemplate());
  latest.fields = [{ id: "degree", kind: "select", required: false, label: { ar: "المؤهل", en: "Degree" }, help: { ar: "", en: "" }, options: [{ id: "llb", label: { ar: "بكالوريوس", en: "Bachelor" } }] }];
  function Harness() {
    const [value, setValue] = useState(latest);
    return <BuilderEditor ar value={value} disabled={false} onChange={(next) => { latest = next; setValue(next); }} onUpload={async () => {}} />;
  }
  try {
    await act(async () => root.render(<Harness />));
    const button = (text: string) => [...holder.querySelectorAll("button")].find((item) => item.textContent === text)!;
    await act(async () => button("لغات PDF").click());
    const english = holder.querySelector<HTMLInputElement>('input[aria-label="تضمين الإنجليزية في PDF"]')!;
    expect(english.checked).toBe(true);
    await act(async () => english.click());
    expect(latest.pdfLanguages).toEqual(["ar"]);
    await act(async () => button("معلومات الاتفاقية").click());
    expect(holder.textContent).not.toContain("عنوان الاتفاقية · English");
    await act(async () => button("لغات PDF").click());
    const code = holder.querySelector<HTMLInputElement>('input[aria-label="رمز اللغة"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(code, "fr"); code.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => button("إضافة لغة").click());
    expect(latest.pdfLanguages).toEqual(["ar", "fr"]);
    expect(holder.querySelector('textarea[aria-label="نص الاتفاقية fr"]')).toBeTruthy();
    expect(holder.querySelector('textarea[aria-label="تفاصيل الطرف الأول fr"]')).toBeTruthy();
    expect(holder.querySelector('textarea[aria-label="تفاصيل الطرف الثاني fr"]')).toBeTruthy();
    expect(holder.querySelector('input[aria-label="ترجمة خيار llb fr"]')).toBeTruthy();
  } finally { await act(async () => root.unmount()); }
});
