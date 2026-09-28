"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CONSULTATION_ICON_KEYS,
  getConsultationIcon,
  getConsultationIconLabel,
  type ConsultationIconKey,
} from "@/lib/consultation-icons/catalog";

export function ConsultationIconPicker({
  value,
  onChange,
  isAr,
}: {
  value: string;
  onChange: (value: ConsultationIconKey) => void;
  isAr: boolean;
}) {
  const [query, setQuery] = useState("");
  const locale = isAr ? "ar" : "en";
  const visibleIcons = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return CONSULTATION_ICON_KEYS;
    return CONSULTATION_ICON_KEYS.filter((key) =>
      `${key} ${getConsultationIconLabel(key, locale)}`.toLocaleLowerCase().includes(needle),
    );
  }, [locale, query]);

  return (
    <fieldset className="md:col-span-2">
      <legend className="text-sm font-bold text-[#082B67]">
        {isAr ? "اختر الأيقونة" : "Choose an icon"}
      </legend>
      <label className="mt-2 flex h-12 items-center gap-2 rounded-xl bg-[#F3F6FA] px-4 text-gray-500 focus-within:ring-2 focus-within:ring-[#B4232A]/20">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-[#082B67] outline-none"
          placeholder={isAr ? "ابحث عن أيقونة" : "Search icons"}
        />
      </label>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {visibleIcons.map((key) => {
          const Icon = getConsultationIcon(key);
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              title={getConsultationIconLabel(key, locale)}
              onClick={() => onChange(key)}
              className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-[11px] font-bold transition ${
                selected
                  ? "border-[#B4232A] bg-[#B4232A]/5 text-[#B4232A]"
                  : "border-transparent bg-[#F3F6FA] text-[#53657D] hover:border-white hover:bg-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{getConsultationIconLabel(key, locale)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
