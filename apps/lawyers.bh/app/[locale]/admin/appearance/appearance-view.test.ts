import { describe, expect, it } from "vitest";
import {
  appearancePatchBody,
  backgroundStateLabel,
  clampPercent,
  type AppearanceCountry,
} from "./appearance-view";

const country: AppearanceCountry = {
  code: "BH", nameAr: "البحرين", nameEn: "Bahrain",
  backgroundUrl: null, backgroundOpacity: 100, backgroundOverlayOpacity: 0, backgroundColor: null,
  tablesProvisioned: true,
};

describe("appearance view", () => {
  it("clamps opacity to whole percentages", () => {
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(45.6)).toBe(46);
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(120)).toBe(100);
    expect(clampPercent(Number.NaN)).toBe(0);
  });

  it("labels the background state bilingually", () => {
    expect(backgroundStateLabel(country, true)).toBe("الخلفية الافتراضية");
    expect(backgroundStateLabel(country, false)).toBe("Default background");
    expect(backgroundStateLabel({ ...country, backgroundUrl: "https://cdn.example/bg.webp" }, true)).toBe("خلفية مخصّصة مفعّلة");
    expect(backgroundStateLabel({ ...country, backgroundUrl: "https://cdn.example/bg.webp" }, false)).toBe("Custom background active");
  });

  it("builds a patch body keyed by the country code", () => {
    expect(appearancePatchBody(country, { backgroundOpacity: 60 })).toEqual({ code: "BH", backgroundOpacity: 60 });
    expect(appearancePatchBody(country, { backgroundColor: "#F5F4F1", backgroundOverlayOpacity: 20 }))
      .toEqual({ code: "BH", backgroundColor: "#F5F4F1", backgroundOverlayOpacity: 20 });
  });
});
