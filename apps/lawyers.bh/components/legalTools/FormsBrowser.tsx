"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download, FileText, Search } from "lucide-react";
import { useLocale } from "next-intl";
import {
  MOJ_FORM_CATEGORIES,
  TOTAL_MOJ_FORMS,
  formHref,
  type MojFormCategory,
  type MojForm,
} from "@/lib/mojForms";
import PdfFormEditor from "@/components/PdfFormEditor";
import PdfOverlayEditor from "@/components/PdfOverlayEditor";

function FormCategoryBlock({
  category,
  isAr,
  defaultOpen,
  query,
  onEdit,
}: {
  category: MojFormCategory;
  isAr: boolean;
  defaultOpen: boolean;
  query: string;
  onEdit: (category: MojFormCategory, form: MojForm) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const matches = useMemo(() => {
    if (!query) return category.forms;
    const q = query.trim().toLowerCase();
    return category.forms.filter(
      (f) =>
        f.ar.toLowerCase().includes(q) ||
        (f.en?.toLowerCase().includes(q) ?? false),
    );
  }, [category.forms, query]);

  // When the user types and a category has zero matches, hide the whole block.
  if (query && matches.length === 0) return null;

  // Force-open whenever there's an active query (so users see the matches).
  const isOpen = open || !!query;

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-3 w-full px-4 py-3.5 text-start transition-colors ${
          isOpen ? "bg-primary/[0.05]" : "bg-white hover:bg-bg-light"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <FileText size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] sm:text-sm font-bold text-text-primary leading-snug break-words">
              {isAr ? category.title.ar : category.title.en}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {matches.length} {isAr ? "نموذج" : "forms"}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-text-muted flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-bg-light/40">
              {matches.map((form) => {
                const href = formHref(category, form);
                return (
                  <li
                    key={form.file}
                    className="group/row flex items-stretch hover:bg-white transition-colors"
                  >
                    {/* Main row — opens the in-browser PDF editor */}
                    <button
                      type="button"
                      onClick={() => onEdit(category, form)}
                      className="flex-1 flex items-center gap-3 px-4 py-3 text-start min-w-0"
                      aria-label={
                        isAr
                          ? `تحرير: ${form.ar}`
                          : `Edit: ${form.en ?? form.ar}`
                      }
                    >
                      <FileText
                        size={14}
                        className="text-text-muted flex-shrink-0 group-hover/row:text-primary transition-colors"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13px] text-text-primary leading-snug break-words"
                          dir="rtl"
                        >
                          {form.ar}
                        </p>
                        {!isAr && form.en && (
                          <p className="text-[11px] text-text-muted leading-snug mt-0.5">
                            {form.en}
                          </p>
                        )}
                      </div>
                    </button>
                    {/* Download icon — direct download of the original. */}
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={form.file}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center px-3 text-text-muted hover:text-primary hover:bg-primary/[0.04] transition-colors border-s border-transparent hover:border-primary/10"
                      title={isAr ? "تنزيل الأصلي" : "Download original"}
                      aria-label={isAr ? "تنزيل النموذج الأصلي" : "Download original PDF"}
                    >
                      <Download size={14} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FormsBrowser() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{
    category: MojFormCategory;
    form: MojForm;
    /** "form" → AcroForm-fillable PDFs (PdfFormEditor).
     *  "overlay" → static PDFs that the user wants to annotate freely
     *  via the canvas-based editor (PdfOverlayEditor). */
    mode: "form" | "overlay";
  } | null>(null);

  const openEditor = (category: MojFormCategory, form: MojForm) =>
    // Default to the AcroForm editor — it'll redirect users to the
    // overlay editor if the PDF turns out not to have any form fields.
    setEditing({ category, form, mode: "form" });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-text-muted leading-relaxed mb-3">
          {isAr
            ? `مجموعة الاستمارات الرسمية الصادرة عن وزارة العدل والشؤون الإسلامية والأوقاف — ${TOTAL_MOJ_FORMS} نموذج عبر ${MOJ_FORM_CATEGORIES.length} فئات. اضغط على أي نموذج لتعبئته داخل المتصفح وتنزيله مباشرة، أو استخدم أيقونة التنزيل للحصول على النموذج الأصلي.`
            : `Official forms published by the Ministry of Justice, Islamic Affairs and Endowments — ${TOTAL_MOJ_FORMS} forms across ${MOJ_FORM_CATEGORIES.length} categories. Click any form to fill it in the browser and download a completed copy, or use the download icon to grab the original.`}
        </p>
        <label className="relative block">
          <Search
            size={15}
            className="absolute top-1/2 -translate-y-1/2 start-3 text-text-muted pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "ابحث في النماذج…" : "Search forms…"}
            className="w-full ps-9 pe-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="space-y-3">
        {MOJ_FORM_CATEGORIES.map((cat, i) => (
          <FormCategoryBlock
            key={cat.slug}
            category={cat}
            isAr={isAr}
            defaultOpen={i === 0 && !query}
            query={query}
            onEdit={openEditor}
          />
        ))}
      </div>

      <p className="text-[11px] text-text-muted leading-relaxed pt-2">
        {isAr
          ? "ملاحظة: النماذج صادرة عن وزارة العدل وقد تتغيّر من حين لآخر. النماذج التي تحتوي على حقول قابلة للتعبئة يمكن تحريرها داخل المتصفح؛ أما النماذج الممسوحة ضوئياً فيمكن تنزيلها وطباعتها لتعبئتها يدوياً."
          : "Note: Forms are published by the Ministry of Justice and may change from time to time. Forms with embedded fillable fields can be edited in the browser; scanned/static forms are available as a plain download for printing and manual completion."}
      </p>

      <PdfFormEditor
        open={editing !== null && editing.mode === "form"}
        onClose={() => setEditing(null)}
        pdfUrl={editing ? formHref(editing.category, editing.form) : ""}
        fileName={editing?.form.file ?? ""}
        title={editing?.form.ar ?? ""}
        subtitle={editing && !isAr ? editing.form.en : undefined}
        onSwitchToOverlay={
          editing ? () => setEditing({ ...editing, mode: "overlay" }) : undefined
        }
      />

      <PdfOverlayEditor
        open={editing !== null && editing.mode === "overlay"}
        onClose={() => setEditing(null)}
        pdfUrl={editing ? formHref(editing.category, editing.form) : ""}
        fileName={editing?.form.file ?? ""}
        title={editing?.form.ar ?? ""}
        subtitle={editing && !isAr ? editing.form.en : undefined}
      />
    </div>
  );
}
