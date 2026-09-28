import { describe, expect, it } from "vitest";
import { getAdminHeaderDestination } from "./admin-route-header";

describe("getAdminHeaderDestination", () => {
  it("returns the website destination on the root Arabic admin dashboard", () => {
    expect(getAdminHeaderDestination("/ar/admin", "ar")).toEqual({
      href: "/",
      label: "رجوع للموقع",
    });
  });

  it("returns the dashboard destination on a nested Arabic admin route", () => {
    expect(getAdminHeaderDestination("/ar/admin/lawyers/abc", "ar")).toEqual({
      href: "/admin",
      label: "لوحة التحكم",
    });
  });

  it("normalizes a trailing slash and returns English labels", () => {
    expect(getAdminHeaderDestination("/en/admin/", "en")).toEqual({
      href: "/",
      label: "Back to Website",
    });
    expect(getAdminHeaderDestination("/en/admin/reviews", "en")).toEqual({
      href: "/admin",
      label: "Dashboard",
    });
  });
});
