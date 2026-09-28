import { describe, expect, it } from "vitest";
import { renderConsultationMethods, renderOptions } from "./render";

const options = Array.from({ length: 4 }, (_, index) => ({
  id: `option:${index}`,
  title: `Option ${index}`,
}));

describe("WhatsApp interactive rendering", () => {
  it("uses buttons for up to three options and a list for longer sets", () => {
    expect(renderOptions("اختر", options.slice(0, 3))).toMatchObject({
      type: "interactive",
      mode: "button",
    });
    expect(renderOptions("اختر", options)).toMatchObject({
      type: "interactive",
      mode: "list",
    });
  });

  it("renders exact current consultation prices and durations", () => {
    const first = renderConsultationMethods("ar", [{
      id: "method-video",
      key: "video",
      name: "استشارة مرئية",
      price: 91,
      currencyCode: "BHD",
      durationMinutes: 47,
    }]);
    const second = renderConsultationMethods("ar", [{
      id: "method-video",
      key: "video",
      name: "استشارة مرئية",
      price: 83,
      currencyCode: "BHD",
      durationMinutes: 52,
    }]);

    expect(first.type).toBe("interactive");
    expect(second.type).toBe("interactive");
    if (first.type !== "interactive" || second.type !== "interactive") {
      throw new Error("Expected interactive consultation choices");
    }
    expect(first.options[0].description).toBe("91 د.ب · 47 دقيقة");
    expect(second.options[0].description).toBe("83 د.ب · 52 دقيقة");
  });

  it("does not manufacture a fallback method when the current list is empty", () => {
    expect(renderConsultationMethods("ar", [])).toEqual({
      type: "text",
      text: "تعذر جلب البيانات الحالية الآن. يمكنك المحاولة بعد قليل أو طلب التواصل مع فريق خدمة العملاء.",
    });
  });
});
