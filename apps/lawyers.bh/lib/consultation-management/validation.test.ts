import { describe, expect, it } from "vitest";
import { parseConsultationTypeInput, parseReorderInput } from "./validation";

const valid = { code: " Video Call ", nameAr: " مكالمة فيديو ", nameEn: " Video call ", price: "35.000", currencyCode: "bhd", durationMinutes: 30, iconKey: "video" };

describe("consultation type validation", () => {
  it("normalizes a valid create payload", () => {
    expect(parseConsultationTypeInput(valid, { includeCode: true })).toEqual({
      code: "video-call", nameAr: "مكالمة فيديو", nameEn: "Video call", price: "35.000", currencyCode: "BHD", durationMinutes: 30, iconKey: "video",
    });
  });

  it.each([
    [{ ...valid, nameAr: "" }, "invalid_name_ar"],
    [{ ...valid, nameEn: "" }, "invalid_name_en"],
    [{ ...valid, price: "0" }, "invalid_price"],
    [{ ...valid, price: "1.0001" }, "invalid_price"],
    [{ ...valid, durationMinutes: 1.5 }, "invalid_duration"],
    [{ ...valid, currencyCode: "BD" }, "invalid_currency"],
    [{ ...valid, iconKey: "../x" }, "invalid_icon"],
    [{ ...valid, iconKey: "unknown-icon" }, "invalid_icon"],
  ])("rejects invalid fields", (payload, error) => {
    expect(() => parseConsultationTypeInput(payload, { includeCode: true })).toThrow(error);
  });

  it("rejects a code in an update and validates reorder IDs", () => {
    expect(() => parseConsultationTypeInput(valid, { includeCode: false })).toThrow("immutable_code");
    expect(parseReorderInput({ ids: ["a", "b"] })).toEqual(["a", "b"]);
    expect(() => parseReorderInput({ ids: ["a", "a"] })).toThrow("invalid_order");
  });
});
