export const ADMIN_PAGE_SIZE = 10;

export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize = ADMIN_PAGE_SIZE,
) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  const start = (currentPage - 1) * safePageSize;

  return {
    currentPage,
    totalPages,
    items: items.slice(start, start + safePageSize),
  };
}

export function visiblePageNumbers(
  totalPages: number,
  currentPage: number,
  maximumVisible = 5,
): number[] {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const count = Math.min(Math.max(1, Math.floor(maximumVisible)), safeTotal);
  const safeCurrent = Math.min(safeTotal, Math.max(1, Math.floor(currentPage) || 1));
  let start = Math.max(1, safeCurrent - Math.floor(count / 2));
  start = Math.min(start, Math.max(1, safeTotal - count + 1));

  return Array.from({ length: count }, (_, index) => start + index);
}
