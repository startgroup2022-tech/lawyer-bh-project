import { describe, expect, it } from "vitest";

import { mergeApprovedMembership } from "./approval-state";

describe("mergeApprovedMembership", () => {
  const items = [
    { id: "first", membershipNo: null, label: "First" },
    { id: "second", membershipNo: "LBH-000123", label: "Second" },
  ];

  it("stores the server-issued number only on the approved application", () => {
    expect(mergeApprovedMembership(items, "first", "LBH-001009")).toEqual([
      { id: "first", membershipNo: "LBH-001009", label: "First" },
      { id: "second", membershipNo: "LBH-000123", label: "Second" },
    ]);
  });

  it("does not erase an existing number when a response omits it", () => {
    expect(mergeApprovedMembership(items, "second", null)[1].membershipNo).toBe(
      "LBH-000123",
    );
  });
});
