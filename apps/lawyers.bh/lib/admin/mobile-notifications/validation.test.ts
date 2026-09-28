import { describe, expect, it } from "vitest";
import { parseMobileNotificationInput } from "./validation";

const valid = {
  audience: "active_lawyers",
  titleAr: " تنبيه عربي ",
  bodyAr: " محتوى عربي ",
  titleEn: " English title ",
  bodyEn: " English body ",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  confirmed: true,
};

describe("mobile notification validation", () => {
  it("normalizes a confirmed bilingual notification", () => {
    expect(parseMobileNotificationInput(valid)).toEqual({
      ok: true,
      value: {
        ...valid,
        titleAr: "تنبيه عربي",
        bodyAr: "محتوى عربي",
        titleEn: "English title",
        bodyEn: "English body",
      },
    });
  });

  it.each([
    [{ ...valid, audience: "unknown" }],
    [{ ...valid, confirmed: false }],
    [{ ...valid, idempotencyKey: "not-a-uuid" }],
    [{ ...valid, titleAr: "" }],
    [{ ...valid, titleEn: "x".repeat(101) }],
    [{ ...valid, bodyAr: "x".repeat(501) }],
  ])("rejects invalid or unsafe input", (input) => {
    expect(parseMobileNotificationInput(input)).toMatchObject({ ok: false });
  });
});
