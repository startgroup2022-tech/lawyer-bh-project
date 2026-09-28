import { describe, expect, it } from "vitest";

import { ADMIN_PAGE_SIZE, paginateItems, visiblePageNumbers } from "./pagination";

describe("admin pagination", () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  it("uses ten records per page by default", () => {
    expect(ADMIN_PAGE_SIZE).toBe(10);
    expect(paginateItems(items, 2)).toEqual({
      currentPage: 2,
      totalPages: 3,
      items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    });
  });

  it("returns the remainder on the final page", () => {
    expect(paginateItems(items, 3).items).toEqual([21, 22, 23]);
  });

  it("clamps invalid and stale pages", () => {
    expect(paginateItems(items.slice(0, 4), 3)).toEqual({
      currentPage: 1,
      totalPages: 1,
      items: [1, 2, 3, 4],
    });
    expect(paginateItems(items, -4).currentPage).toBe(1);
  });

  it("keeps an empty collection on page one", () => {
    expect(paginateItems([], 4)).toEqual({ currentPage: 1, totalPages: 1, items: [] });
  });

  it.each([
    [10, 1, [1, 2, 3, 4, 5]],
    [10, 5, [3, 4, 5, 6, 7]],
    [10, 10, [6, 7, 8, 9, 10]],
    [3, 2, [1, 2, 3]],
  ])("shows a stable numbered-page window", (total, current, expected) => {
    expect(visiblePageNumbers(total, current)).toEqual(expected);
  });
});
