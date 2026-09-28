import { SOS_CASE_TYPES } from "@/lib/sos/caseTypes";

export function normalizeProviderOwnershipEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isProviderVisiblePaidRequest(input: { paymentStatus?: string | null; tapStatus?: string | null }) {
  const payment = String(input.paymentStatus ?? "").trim().toLowerCase();
  return (payment === "paid" || payment === "success") && String(input.tapStatus ?? "").trim().toUpperCase() === "CAPTURED";
}

export function localizeProviderCaseType(slug: string) {
  const item = SOS_CASE_TYPES.find((entry) => entry.slug === slug);
  return item ? { ar: item.label.ar, en: item.label.en } : { ar: slug, en: slug };
}

type RequestListItem = {
  source: string;
  status: string;
  searchableText: string;
};

export function paginateProviderRequests<T extends RequestListItem>(
  items: readonly T[],
  input: { page?: number; source?: string; status?: string; query?: string },
) {
  const page = Number.isInteger(input.page) && Number(input.page) > 0 ? Number(input.page) : 1;
  const source = input.source ?? "all";
  const status = input.status ?? "all";
  const query = String(input.query ?? "").trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (source !== "all" && item.source !== source) return false;
    if (status !== "all") {
      if (status === "paid") {
        // All items have already passed the server-paid gate.
      } else if (status === "completed") {
        if (!item.status.toLowerCase().includes("completed")) return false;
      } else if (status === "pending") {
        if (!item.status.toLowerCase().includes("pending")) return false;
      }
    }
    return !query || item.searchableText.toLowerCase().includes(query);
  });
  const pageSize = 10;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalItems, totalPages };
}
