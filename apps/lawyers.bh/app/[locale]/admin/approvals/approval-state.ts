export function mergeApprovedMembership<
  T extends { id: string; membershipNo: string | null },
>(items: readonly T[], id: string, membershipNo: string | null | undefined): T[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, membershipNo: membershipNo ?? item.membershipNo }
      : item,
  );
}
