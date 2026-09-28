"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useLocale } from "next-intl";

export default function AdminLogoutButton() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });

      window.location.href = `/${locale}/login/admin`;
    } catch {
      window.location.href = `/${locale}/login/admin`;
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {loading
        ? isAr
          ? "جاري الخروج..."
          : "Logging out..."
        : isAr
          ? "تسجيل الخروج"
          : "Logout"}
    </button>
  );
}
