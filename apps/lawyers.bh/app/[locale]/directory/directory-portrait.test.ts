import { describe, expect, it } from "vitest";

import { getDirectoryDetailPortraitSize } from "./directory-portrait";

describe("directory detail portrait sizing", () => {
  it("preserves the directory card's 96:110 portrait ratio", () => {
    expect(getDirectoryDetailPortraitSize()).toEqual({ width: 176, height: 202 });
    expect(getDirectoryDetailPortraitSize(96)).toEqual({ width: 96, height: 110 });
  });
});
