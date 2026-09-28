"use client";

import { useLocale, useTranslations } from "next-intl";
import { SOS_CASE_TYPES, type SosCaseSlug } from "@/lib/sos/caseTypes";

interface Props {
  selected: SosCaseSlug | null;
  onSelect: (slug: SosCaseSlug) => void;
}

export default function SosCaseTypeChips({ selected, onSelect }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = useTranslations("sos");

  return (
    <section>
      <h2 className="text-[15px] font-extrabold text-text-primary mb-1">
        {t("caseSection.title")}
      </h2>
      <p className="text-[12px] text-text-muted mb-4">
        {t("caseSection.subtitle")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SOS_CASE_TYPES.map((c) => {
          const Icon = c.icon;
          const active = selected === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => onSelect(c.slug)}
              className={`group relative flex items-start gap-3 rounded-xl border p-4 text-start transition-all active:scale-[0.98] ${
                active
                  ? "border-[#D32F2F] bg-[#D32F2F]/5 ring-2 ring-[#D32F2F]/40"
                  : "border-gray-200 bg-white hover:border-[#D32F2F]/40"
              }`}
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-[#D32F2F] text-white"
                    : "bg-[#1A237E]/10 text-[#1A237E]"
                }`}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-text-primary leading-tight">
                  {isAr ? c.label.ar : c.label.en}
                </div>
                <div className="text-[11px] text-text-muted leading-snug mt-1">
                  {isAr ? c.helper.ar : c.helper.en}
                </div>
                <div className="mt-2 inline-flex items-baseline gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-bold">
                  <span className="text-[#1A237E]">
                    {c.baseFee} SAR
                  </span>
                  <span className="text-text-muted font-normal">
                    {isAr ? "أتعاب أولية" : "Initial Response Fee"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
