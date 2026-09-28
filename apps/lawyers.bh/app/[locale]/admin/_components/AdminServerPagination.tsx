import Link from "next/link";

import { visiblePageNumbers } from "./pagination";

type Props = {
  isAr: boolean;
  pathname: string;
  currentPage: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

export default function AdminServerPagination({ isAr, pathname, currentPage, totalPages, query = {} }: Props) {
  if (totalPages <= 1) return null;
  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value && key !== "page") params.set(key, value);
    if (page > 1) params.set("page", String(page));
    const suffix = params.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  };
  const itemClass = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-black transition";

  return <nav aria-label={isAr ? "ترقيم الصفحات" : "Pagination"} className="mt-5 flex flex-wrap items-center justify-center gap-2">
    <Link aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} href={href(Math.max(1, currentPage - 1))} className={`${itemClass} border-gray-200 bg-white text-[#082B67] hover:border-[#B4232A] hover:text-[#B4232A] ${currentPage === 1 ? "pointer-events-none opacity-40" : ""}`}>{isAr ? "السابق" : "Previous"}</Link>
    {visiblePageNumbers(totalPages, currentPage).map((page) => <Link key={page} aria-current={page === currentPage ? "page" : undefined} href={href(page)} className={`${itemClass} ${page === currentPage ? "border-[#B4232A] bg-[#B4232A] text-white" : "border-gray-200 bg-white text-[#082B67] hover:border-[#B4232A] hover:text-[#B4232A]"}`}>{page}</Link>)}
    <Link aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} href={href(Math.min(totalPages, currentPage + 1))} className={`${itemClass} border-gray-200 bg-white text-[#082B67] hover:border-[#B4232A] hover:text-[#B4232A] ${currentPage === totalPages ? "pointer-events-none opacity-40" : ""}`}>{isAr ? "التالي" : "Next"}</Link>
  </nav>;
}
