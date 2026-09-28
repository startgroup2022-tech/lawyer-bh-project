"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function InAppBackBar({ inApp }: { inApp: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";

  if (!inApp) return null;
  if (pathname === "/") return null;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const BackIcon = isAr ? ChevronRight : ChevronLeft;

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 py-2.5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary transition-colors -mx-1 px-1 py-1"
        >
          <BackIcon size={18} />
          <span>{isAr ? "رجوع" : "Back"}</span>
        </button>
      </div>
    </div>
  );
}
