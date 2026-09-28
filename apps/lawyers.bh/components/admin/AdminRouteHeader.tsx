"use client";

import { ArrowLeft } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import AdminLogoutButton from "./AdminLogoutButton";
import { getAdminHeaderDestination } from "./admin-route-header";

export default function AdminRouteHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const destination = getAdminHeaderDestination(pathname, locale);

  return (
    <nav aria-label={locale === "ar" ? "تنقل الإدارة" : "Admin navigation"} className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 pt-6 sm:pt-10">
      <Link
        href={destination.href}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#082B67] shadow-sm transition hover:border-[#B4232A]/30 hover:text-[#B4232A]"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {destination.label}
      </Link>
      <AdminLogoutButton />
    </nav>
  );
}
