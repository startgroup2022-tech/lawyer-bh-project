import { readFileSync } from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import { expect, it } from "vitest";
import { layoutLine, wrapText } from "./shaping";
const font = fontkit.create(readFileSync("public/fonts/Cairo-Full.ttf"));
it("positions joined Arabic using shaping advances rather than unpositioned glyph widths", () => {
  const text = "مُحَمَّد التوقيع الإلكتروني";
  const line = layoutLine(font, text, true);
  expect(line.glyphs.some((g) => g.y !== 0)).toBe(true);
  expect(line.glyphs.every((g) => g.id > 0)).toBe(true);
  expect(line.width).toBeGreaterThan(0);
});
it("keeps a phone number in logical LTR order inside Arabic", () => {
  expect(
    layoutLine(font, "الهاتف +97312345678", true).runs.map((r) => r.text),
  ).toContain("+97312345678");
});
it("wraps even long unbroken content within the specified width", () => {
  const lines = wrapText(font, "long".repeat(100), false, 10, 200);
  expect(lines.length).toBeGreaterThan(1);
  expect(
    lines.every(
      (line) =>
        (layoutLine(font, line, false).width / font.unitsPerEm) * 10 <= 200.01,
    ),
  ).toBe(true);
});
