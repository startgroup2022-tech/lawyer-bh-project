import { describe, expect, it } from "vitest";

import { moderationCategoryLabel, moderationStatusLabel } from "./presentation";

describe("moderation presentation", () => {
  it("presents categories in Arabic and English", () => {
    expect(moderationCategoryLabel("harassment", true)).toBe("مضايقة أو إساءة");
    expect(moderationCategoryLabel("harassment", false)).toBe("Harassment or abuse");
    expect(moderationCategoryLabel("unknown", true)).toBe("أخرى");
  });

  it("presents report statuses in Arabic and English", () => {
    expect(moderationStatusLabel("open", true)).toBe("مفتوح");
    expect(moderationStatusLabel("actioned", false)).toBe("Actioned");
  });
});
