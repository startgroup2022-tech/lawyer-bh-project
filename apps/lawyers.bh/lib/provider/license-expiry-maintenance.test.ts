import { describe, expect, it } from "vitest";

import {
  bahrainDateFromInstant,
  buildLicenseExpiryReminder,
  classifyLicenseDate,
} from "./license-expiry-maintenance";

describe("bahrainDateFromInstant", () => {
  it("uses the Bahrain calendar date before UTC reaches midnight", () => {
    expect(bahrainDateFromInstant(new Date("2026-09-02T21:15:00.000Z"))).toBe(
      "2026-09-03",
    );
  });

  it("keeps the previous Bahrain day one minute before midnight", () => {
    expect(bahrainDateFromInstant(new Date("2026-09-02T20:59:00.000Z"))).toBe(
      "2026-09-02",
    );
  });
});

describe("classifyLicenseDate", () => {
  it.each([
    ["2026-09-02", "2026-10-02", "30_days"],
    ["2026-09-02", "2026-09-09", "7_days"],
    ["2026-09-02", "2026-09-02", "expired"],
    ["2026-09-02", "2026-09-01", "expired"],
    ["2026-09-02", "2026-09-10", null],
    ["2026-09-02", null, null],
  ] as const)("classifies %s -> %s as %s", (runDate, expiryDate, expected) => {
    expect(classifyLicenseDate(runDate, expiryDate)).toBe(expected);
  });
});

describe("buildLicenseExpiryReminder", () => {
  it("builds an Arabic RTL 30-day warning and escapes the name", () => {
    const message = buildLicenseExpiryReminder({
      fullNameAr: "إيمان <علي>",
      fullNameEn: "Eman Ali",
      locale: "ar",
      expiryDate: "2026-10-02",
      daysRemaining: 30,
    });

    expect(message.subject).toBe(
      "تنبيه: تبقى 30 يومًا على انتهاء رخصتك | محامون البحرين",
    );
    expect(message.text).toContain("إيمان <علي>");
    expect(message.text).toContain("2026-10-02");
    expect(message.text).toContain("سيتم تعطيل حسابك وإخفاؤه من الدليل");
    expect(message.html).toContain('dir="rtl"');
    expect(message.html).toContain("إيمان &lt;علي&gt;");
  });

  it("builds an English 7-day reminder", () => {
    const message = buildLicenseExpiryReminder({
      fullNameAr: "محمد يوسف",
      fullNameEn: "Mohamed Yusuf",
      locale: "en",
      expiryDate: "2026-09-09",
      daysRemaining: 7,
    });

    expect(message.subject).toBe(
      "Reminder: 7 days until your license expires | Lawyers.bh",
    );
    expect(message.text).toContain("Hello Mohamed Yusuf,");
    expect(message.text).toContain("2026-09-09");
    expect(message.text).toContain(
      "your account will be deactivated and removed from the public directory",
    );
    expect(message.html).toContain('dir="ltr"');
  });
});
