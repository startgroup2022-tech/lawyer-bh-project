"use client";

import { Siren } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Props {
  /** "panel" — full-width red banner used at the top of mobile/iOS surfaces.
   *  "compact" — smaller chip used in the desktop nav / above-the-fold. */
  variant?: "panel" | "compact";
  className?: string;
}

/** The Legal SOS call-to-action button. The colour is the dedicated
 *  Emergency Red `#D32F2F` from the design spec, intentionally distinct
 *  from the brand red so the user reads it as urgent action, not
 *  marketing. A subtle pulsing ring conveys availability without being
 *  noisy on every page render. */
export default function SosCta({ variant = "panel", className = "" }: Props) {
  const t = useTranslations("sos");

  if (variant === "compact") {
    return (
      <Link
        href="/sos"
        className={`relative inline-flex items-center gap-1.5 rounded-full bg-[#D32F2F] px-3 py-1.5 text-[12px] font-extrabold text-white shadow-md ring-2 ring-[#D32F2F]/30 transition-all hover:bg-[#B71C1C] hover:shadow-lg ${className}`}
      >
        <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[#D32F2F] opacity-40" />
        <Siren size={14} className="animate-pulse" />
        {t("ctaShort")}
      </Link>
    );
  }

  return (
    <Link
      href="/sos"
      className={`group relative flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#D32F2F] via-[#B71C1C] to-[#D32F2F] p-4 text-white shadow-lg ring-1 ring-black/10 transition-transform active:scale-[0.98] ${className}`}
    >
      <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
        <span className="absolute inset-0 animate-ping rounded-xl bg-white/20" />
        <Siren size={22} className="relative" />
      </span>
      <div className="min-w-0 flex-1 text-start">
        <div className="text-[15px] font-extrabold leading-tight">
          {t("ctaLong")}
        </div>
        <div className="text-[11px] leading-snug text-white/85 mt-0.5">
          {t("ctaTagline")}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white">
        24/7
      </span>
    </Link>
  );
}
