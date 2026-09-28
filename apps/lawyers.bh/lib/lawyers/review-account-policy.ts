export function excludeReviewAccounts<T extends { isReviewAccount: boolean }>(
  rows: T[],
): T[] {
  return rows.filter((row) => !row.isReviewAccount);
}
