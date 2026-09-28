"use client";

import type { AgreementSection } from "@/lib/contract/agreementTemplate";

/** Renders the contract sections for on-screen review. Shows both English
 *  (LTR) and Arabic (RTL) so either party can read in their language and
 *  see exactly what gets signed. */
export default function AgreementPreview({
  sections,
  isAr,
}: {
  sections: AgreementSection[];
  isAr: boolean;
}) {
  // Primary language first, secondary second.
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-bg-light/40 p-4 sm:p-6 space-y-5">
      {sections.map((s) => (
        <section key={s.id}>
          {isAr ? (
            <>
              <h3 dir="rtl" className="text-[13px] sm:text-sm font-extrabold text-text-primary mb-1">
                {s.titleAr}
              </h3>
              <p dir="rtl" className="text-[12px] sm:text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
                {s.bodyAr}
              </p>
              <h4 className="mt-2 text-[11px] font-bold text-text-muted/80">{s.titleEn}</h4>
              <p className="text-[11px] text-text-muted leading-relaxed whitespace-pre-line">
                {s.bodyEn}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-[13px] sm:text-sm font-extrabold text-text-primary mb-1">
                {s.titleEn}
              </h3>
              <p className="text-[12px] sm:text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
                {s.bodyEn}
              </p>
              <h4 dir="rtl" className="mt-2 text-[11px] font-bold text-text-muted/80">
                {s.titleAr}
              </h4>
              <p dir="rtl" className="text-[11px] text-text-muted leading-relaxed whitespace-pre-line">
                {s.bodyAr}
              </p>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
