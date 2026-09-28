import type { Font, GlyphRun } from "@pdf-lib/fontkit";
import bidiFactory from "bidi-js";
const bidi = bidiFactory();
export function layoutLine(font: Font, text: string, rtl: boolean) {
  // Phone prefixes are LTR data, even when the surrounding paragraph is Arabic.
  text = text.replace(
    /\+[0-9][0-9 ()-]*[0-9]/g,
    (value) => `\u200e${value}\u200e`,
  );
  const embedding = bidi.getEmbeddingLevels(text, rtl ? "rtl" : "ltr");
  const logical: { text: string; level: number }[] = [];
  const ids: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const level = embedding.levels[i];
    if (!logical.length || logical[logical.length - 1].level !== level)
      logical.push({ text: "", level });
    logical[logical.length - 1].text += text[i];
    ids.push(logical.length - 1);
  }
  for (const [start, end] of bidi.getReorderSegments(text, embedding)) {
    const flipped = ids.slice(start, end + 1).reverse();
    ids.splice(start, flipped.length, ...flipped);
  }
  const order = [...new Set(ids)];
  let width = 0;
  const glyphs: { id: number; x: number; y: number }[] = [];
  const runs = order.map((id) => ({
    ...logical[id],
    text: logical[id].text.replace(/\u200e/g, ""),
  }));
  for (const run of runs) {
    const value =
      run.level % 2
        ? [...run.text].map((c) => bidi.getMirroredCharacter(c) || c).join("")
        : run.text;
    const shaped = (
      font.layout as (
        text: string,
        features: undefined,
        script: undefined,
        language: undefined,
        direction: string,
      ) => GlyphRun
    )(value, undefined, undefined, undefined, run.level % 2 ? "rtl" : "ltr");
    shaped.glyphs.forEach((glyph, i) => {
      const p = shaped.positions[i];
      glyphs.push({ id: glyph.id, x: width + p.xOffset, y: p.yOffset });
      width += p.xAdvance;
    });
  }
  return { glyphs, width, runs };
}
export function wrapText(
  font: Font,
  text: string,
  rtl: boolean,
  size: number,
  maxWidth: number,
): string[] {
  const fits = (value: string) =>
    (layoutLine(font, value, rtl).width / font.unitsPerEm) * size <= maxWidth;
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) {
        line = next;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (fits(word)) {
        line = word;
        continue;
      }
      for (const char of word) {
        if (line && !fits(line + char)) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
