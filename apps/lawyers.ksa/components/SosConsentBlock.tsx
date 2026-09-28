"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import {
  SOS_CONSENT_AR,
  SOS_CONSENT_EN,
  SOS_CONSENT_VERSION,
} from "@/lib/sos/consentText";

/** Renders the bilingual SOS Service Agreement inside a scrollable
 *  panel, with a toggle to switch between Arabic and English. The
 *  panel itself is dir-aware so each language reads naturally. */
export default function SosConsentBlock() {
  const t = useTranslations("sos.consentSection");
  const locale = useLocale();
  const [showLang, setShowLang] = useState<"ar" | "en">(
    locale === "ar" ? "ar" : "en",
  );

  const text = showLang === "ar" ? SOS_CONSENT_AR : SOS_CONSENT_EN;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          {t("agreementHash")}: {SOS_CONSENT_VERSION}
        </div>
        <button
          type="button"
          onClick={() => setShowLang(showLang === "ar" ? "en" : "ar")}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-text-primary"
        >
          <Languages size={12} />
          {showLang === "ar" ? t("showEnglish") : t("showArabic")}
        </button>
      </div>
      <div
        dir={showLang === "ar" ? "rtl" : "ltr"}
        className="max-h-64 overflow-y-auto whitespace-pre-line rounded-lg bg-white p-3 text-[12px] leading-relaxed text-text-primary"
      >
        {text}
      </div>
    </div>
  );
}
