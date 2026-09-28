import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConsultationTypesContent from "./ConsultationTypesContent";
import { parseConsultationTypeInput } from "@/lib/consultation-management/validation";

describe("consultation duration input", () => {
  it.each([true, false])("keeps the default and incremented duration on whole minutes (Arabic: %s)", (isAr) => {
    const html = renderToStaticMarkup(<ConsultationTypesContent isAr={isAr} />);
    const input = html.match(/<input[^>]*value="30"[^>]*>/)?.[0];
    expect(input).toBeDefined();
    const min = Number(input!.match(/min="([^"]+)"/)?.[1]);
    const step = Number(input!.match(/step="([^"]+)"/)?.[1]);
    expect((30 - min) % step).toBe(0);
    const next = min + (Math.floor((30 - min) / step) + 1) * step;
    expect(next).toBe(31);
    expect(parseConsultationTypeInput({ nameAr: "هاتف", nameEn: "Phone", price: "30.001", currencyCode: "BHD", durationMinutes: next, iconKey: "phone" }, { includeCode: false })).toMatchObject({ durationMinutes: 31, price: "30.001" });
  });
});
