import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readIcoDimensions(buffer: Buffer) {
  const imageCount = buffer.readUInt16LE(4);

  return Array.from({ length: imageCount }, (_, index) => {
    const entryOffset = 6 + index * 16;
    const width = buffer[entryOffset] || 256;
    const height = buffer[entryOffset + 1] || 256;
    return { width, height };
  });
}

describe("browser tab icon", () => {
  it("contains square standard favicon sizes", () => {
    const favicon = readFileSync(new URL("./favicon.ico", import.meta.url));

    const dimensions = readIcoDimensions(favicon).sort(
      (a, b) => a.width - b.width,
    );

    expect(dimensions).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
  });
});
