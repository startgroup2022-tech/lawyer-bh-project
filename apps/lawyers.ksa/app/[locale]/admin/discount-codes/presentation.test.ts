import { describe, expect, it } from "vitest";
import { filterDiscountCodes, getDiscountStatus, summarizeDiscountCodes } from "./presentation";

const now = new Date("2026-08-09T12:00:00Z");
const base = { id: "1", code: "WELCOME20", isActive: true, startsAt: null, endsAt: null, redeemedCount: 3 };

describe("discount code presentation", () => {
  it("classifies active, scheduled, expired, and disabled codes", () => {
    expect(getDiscountStatus(base, now)).toBe("active");
    expect(getDiscountStatus({ ...base, startsAt: "2026-08-10T00:00:00Z" }, now)).toBe("scheduled");
    expect(getDiscountStatus({ ...base, endsAt: "2026-08-08T00:00:00Z" }, now)).toBe("expired");
    expect(getDiscountStatus({ ...base, isActive: false }, now)).toBe("disabled");
  });

  it("filters by normalized code and status", () => {
    const rows = [base, { ...base, id: "2", code: "SUMMER", isActive: false }];
    expect(filterDiscountCodes(rows, "welcome", "all", now).map((row) => row.id)).toEqual(["1"]);
    expect(filterDiscountCodes(rows, "", "disabled", now).map((row) => row.id)).toEqual(["2"]);
  });

  it("summarizes codes and redeemed usage", () => {
    const rows = [base, { ...base, id: "2", startsAt: "2026-08-10T00:00:00Z", redeemedCount: 4 }, { ...base, id: "3", endsAt: "2026-08-08T00:00:00Z", redeemedCount: 5 }, { ...base, id: "4", isActive: false, redeemedCount: 0 }];
    expect(summarizeDiscountCodes(rows, now)).toEqual({ total: 4, active: 1, expired: 1, redeemed: 12 });
  });
});
