import { describe, expect, it } from "vitest";

import { excludeReviewAccounts } from "./review-account-policy";

describe("review lawyer account isolation", () => {
  it("removes review accounts while preserving real lawyers", () => {
    const rows = [
      { id: "real-1", isReviewAccount: false },
      { id: "review-1", isReviewAccount: true },
      { id: "real-2", isReviewAccount: false },
    ];

    expect(excludeReviewAccounts(rows)).toEqual([rows[0], rows[2]]);
  });
});
