import { describe, expect, it } from "vitest";
import {
  isProviderVisiblePaidRequest,
  localizeProviderCaseType,
  normalizeProviderOwnershipEmail,
  paginateProviderRequests,
} from "./provider-request-list";

describe("provider request list", () => {
  it("normalizes historical booking ownership emails", () => {
    expect(normalizeProviderOwnershipEmail(" Lawyer@Example.COM ")).toBe("lawyer@example.com");
    expect(normalizeProviderOwnershipEmail(null)).toBe("");
  });

  it.each([
    ["paid", "CAPTURED", true],
    ["success", "CAPTURED", true],
    ["paid", "INITIATED", false],
    ["pending_payment", "CAPTURED", false],
    ["success", null, false],
    [" PAID ", " captured ", true],
    ["paid", "authorized", false],
  ])("gates payment %s / %s", (paymentStatus, tapStatus, expected) => {
    expect(isProviderVisiblePaidRequest({ paymentStatus, tapStatus })).toBe(expected);
  });

  it.each([
    ["emergency_arrest", "القبض والتوقيف والتحقيقات", "Arrest, Detention & Investigations"],
    ["emergency_search", "تفتيش المساكن أو المقرات", "Search & Seizure"],
    ["emergency_travel_ban", "المنع من السفر والحجز التحفظي", "Travel Ban / Precautionary Attachment"],
    ["emergency_evidence", "إثبات الحالة المستعجلة", "Urgent Evidence Preservation"],
    ["emergency_report", "البلاغات الجنائية والشكاوى العاجلة", "Urgent Criminal Report"],
    ["emergency_consultation", "استشارة قانونية طارئة", "Emergency Legal Consultation"],
  ])("localizes %s", (slug, ar, en) => {
    expect(localizeProviderCaseType(slug)).toEqual({ ar, en });
  });

  it("searches and filters before returning ten items", () => {
    const items = Array.from({ length: 24 }, (_, index) => ({
      id: String(index + 1),
      source: index % 2 === 0 ? "emergency" : "booking",
      status: index < 20 ? "completed" : "pending",
      searchableText: index < 22 ? `client ${index + 1}` : `special ${index + 1}`,
    }));
    const result = paginateProviderRequests(items, { page: 1, source: "emergency", status: "completed", query: "client" });
    expect(result.items).toHaveLength(10);
    expect(result.totalItems).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it("returns metadata and an empty out-of-range page", () => {
    const items = Array.from({ length: 21 }, (_, index) => ({ id: String(index), source: "booking", status: "pending", searchableText: "client" }));
    expect(paginateProviderRequests(items, { page: 4 })).toEqual({ items: [], page: 4, pageSize: 10, totalItems: 21, totalPages: 3 });
  });
});
