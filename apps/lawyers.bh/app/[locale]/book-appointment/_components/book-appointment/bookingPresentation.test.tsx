import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookingProvider, type BookingContextValue } from "./BookingContext";
import ServiceStep from "./steps/ServiceStep";
import { consultMethods } from "./constants";
import { formatPrice } from "./formatUtils";

describe("booking presentation", () => {
  it.each([true, false])("shows consultation methods without asking the customer for a country (%s)", (isAr) => {
    const state = {
      step: 1, isAr, shouldShowConsultMethods: true,
      countries: [{ code: "BH", nameAr: "البحرين", nameEn: "Bahrain", currencyCode: "BHD" }],
      countryCode: "BH", consultMethods, visibleConsultMethods: consultMethods,
      formatPrice: (price: number) => formatPrice(price, isAr),
    } as BookingContextValue;
    const html = renderToStaticMarkup(<BookingProvider value={state}><ServiceStep /></BookingProvider>);
    expect(html).toContain(isAr ? "طريقة الاستشارة" : "Consultation Method");
    expect(html).not.toContain("<select");
    expect(html).not.toContain(isAr ? "البحرين" : "Bahrain");
  });

  it.each([
    [30, true, "BHD", "30 د.ب"],
    [30, false, "BHD", "30 BHD"],
    [30.125, true, "BHD", "30.125 د.ب"],
    [45, true, "SAR", "45 SAR"],
    [45, false, "SAR", "45 SAR"],
  ] as const)("formats %s with locale %s and currency %s", (amount, isAr, currency, expected) => {
    expect(formatPrice(amount, isAr, currency)).toBe(expected);
  });
});
