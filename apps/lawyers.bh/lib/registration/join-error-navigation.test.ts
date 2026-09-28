import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { focusJoinField } from "./join-error-navigation";

describe("focusJoinField", () => {
  it("focuses and scrolls the first matching field", () => {
    const control = { scrollIntoView: vi.fn(), focus: vi.fn() };
    const root = { querySelector: vi.fn(() => control) } as unknown as HTMLElement;

    expect(focusJoinField("profileImage", root)).toBe(true);
    expect(root.querySelector).toHaveBeenCalledWith('[data-join-field="profileImage"]');
    expect(control.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(control.focus).toHaveBeenCalled();
  });

  it("scrolls a non-focusable upload group without throwing", () => {
    const group = { scrollIntoView: vi.fn() };
    const root = { querySelector: vi.fn(() => group) } as unknown as HTMLElement;

    expect(focusJoinField("licenseFile", root)).toBe(true);
    expect(group.scrollIntoView).toHaveBeenCalledOnce();
  });

  it("returns false when the field is not rendered", () => {
    const root = { querySelector: vi.fn(() => null) } as unknown as HTMLElement;
    expect(focusJoinField("missing", root)).toBe(false);
  });

  it("falls back to a safely escaped id after checking data-join-field", () => {
    const control = { scrollIntoView: vi.fn(), focus: vi.fn() };
    const root = {
      querySelector: vi
        .fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(control),
    } as unknown as HTMLElement;

    expect(focusJoinField("experienceYears", root)).toBe(true);
    expect(root.querySelector).toHaveBeenNthCalledWith(
      1,
      '[data-join-field="experienceYears"]',
    );
    expect(root.querySelector).toHaveBeenNthCalledWith(2, "#experienceYears");
    expect(control.focus).toHaveBeenCalledOnce();
  });

  it("returns true without throwing when the matching element has no browser methods", () => {
    const root = {
      querySelector: vi.fn(() => ({})),
    } as unknown as HTMLElement;

    expect(() => focusJoinField("specialties", root)).not.toThrow();
    expect(focusJoinField("specialties", root)).toBe(true);
  });

  it("escapes field names before building the selector", () => {
    const root = { querySelector: vi.fn(() => null) } as unknown as HTMLElement;
    focusJoinField('field"\\name', root);
    expect(root.querySelector).toHaveBeenCalledWith('[data-join-field="field\\"\\\\name"]');
  });
});

describe("join form navigation integration", () => {
  const source = readFileSync(resolve(process.cwd(), "app/[locale]/join/Content.tsx"), "utf8");

  it("schedules focus after validation state and step updates", () => {
    expect(source).toContain("requestAnimationFrame(() => {");
    expect(source).toContain("focusJoinField(field, form)");
    expect(source.match(/scheduleJoinFieldFocus\(firstError\.field\)/g)).toHaveLength(2);
  });

  it("disables future step headers", () => {
    expect(source).toContain("disabled={item.number > registerStep}");
  });
});
