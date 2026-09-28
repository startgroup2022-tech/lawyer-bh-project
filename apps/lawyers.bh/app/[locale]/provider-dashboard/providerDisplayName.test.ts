import { describe, expect, it } from "vitest";
import { providerDisplayName } from "./providerDisplayName";

describe("providerDisplayName", () => {
  it("shows the stored Arabic name without a subscription title", () => {
    expect(providerDisplayName({ fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed" }, true)).toBe("حبيب محمد");
  });

  it("shows the stored English name without a subscription title", () => {
    expect(providerDisplayName({ fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed" }, false)).toBe("Habib Mohammed");
  });

  it("falls back to the other localized stored name", () => {
    expect(providerDisplayName({ fullNameAr: "حبيب محمد", fullNameEn: "" }, false)).toBe("حبيب محمد");
  });
});
