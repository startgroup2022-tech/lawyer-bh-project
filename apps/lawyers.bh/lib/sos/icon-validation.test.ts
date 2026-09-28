import { describe, expect, it } from "vitest";
import { validateSosCaseIcon } from "./icon-validation";

describe("validateSosCaseIcon", () => {
  it("accepts PNG and SVG", () => {
    expect(validateSosCaseIcon(new File(["png"], "case.png", { type: "image/png" })).extension).toBe("png");
    expect(validateSosCaseIcon(new File(["<svg/>"], "case.svg", { type: "image/svg+xml" })).extension).toBe("svg");
  });
  it("rejects unsupported files", () => {
    expect(() => validateSosCaseIcon(new File(["x"], "case.jpg", { type: "image/jpeg" }))).toThrow("invalid_icon_type");
  });
});
