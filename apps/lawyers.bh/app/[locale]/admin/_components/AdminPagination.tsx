"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { visiblePageNumbers } from "./pagination";

type Props = {
  isAr: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function AdminPagination({ isAr, currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const previousLabel = isAr ? "الصفحة السابقة" : "Previous page";
  const nextLabel = isAr ? "الصفحة التالية" : "Next page";
  const baseClass = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-black transition";

  return (
    <nav aria-label={isAr ? "ترقيم الصفحات" : "Pagination"} className="mt-5 flex flex-wrap items-center justify-center gap-2" dir={isAr ? "rtl" : "ltr"}>
      <button type="button" aria-label={previousLabel} title={previousLabel} disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className={`${baseClass} border-gray-200 bg-white text-[#082B67] hover:border-[#B4232A] hover:text-[#B4232A] disabled:cursor-not-allowed disabled:opacity-40`}>
        <ChevronLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
        <span className="sr-only">{previousLabel}</span>
      </button>
      {visiblePageNumbers(totalPages, currentPage).map((page) => (
        <button key={page} type="button" aria-label={`${isAr ? "الصفحة" : "Page"} ${page}`} aria-current={page === currentPage ? "page" : undefined} onClick={() => onPageChange(page)} className={`${baseClass} ${page === currentPage ? "border-[#B4232A] bg-[#B4232A] text-white" : "border-gray-200 bg-white text-[#082B67] hover:border-[#B4232A] hover:text-[#B4232A]"}`}>
          {page}
        </button>
      ))}
      <button type="button" aria-label={nextLabel} title={nextLabel} disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className={`${baseClass} border-gray-200 bg-white text-[#082B67] hover:border-[#B4232A] hover:text-[#B4232A] disabled:cursor-not-allowed disabled:opacity-40`}>
        <ChevronRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
        <span className="sr-only">{nextLabel}</span>
      </button>
    </nav>
  );
}
