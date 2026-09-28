"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  AlertCircle,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useLocale } from "next-intl";

/**
 * PDF Form Editor.
 *
 * Loads a PDF from a URL, detects AcroForm fields via pdf-lib, renders
 * an input for each, and lets the user download a filled copy. For PDFs
 * that don't carry AcroForm metadata (the majority of the MoJ forms are
 * scanned), the editor shows a friendly "this form is not interactive"
 * notice and falls back to a plain download link.
 *
 * pdf-lib is dynamically imported so it doesn't bloat the initial
 * route bundle — the editor only mounts when the user opens it.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
  /** Display title — usually the form's Arabic label. */
  title: string;
  /** Optional secondary label, e.g. an English translation. */
  subtitle?: string;
  /** Called when the loaded PDF turns out to be static (no AcroForm
   *  fields) and the user wants to switch to the freeform overlay
   *  editor instead. The parent should close this modal and open
   *  PdfOverlayEditor with the same form. */
  onSwitchToOverlay?: () => void;
};

type DetectedField = {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio" | "unsupported";
  /** For dropdown / radio. */
  options?: string[];
  /** Initial value, if any. */
  initial: string | boolean;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; fields: DetectedField[]; bytes: Uint8Array }
  | { status: "no-form"; bytes: Uint8Array }
  | { status: "error"; error: string };

export default function PdfFormEditor({
  open,
  onClose,
  pdfUrl,
  fileName,
  title,
  subtitle,
  onSwitchToOverlay,
}: Props) {
  const isAr = useLocale() === "ar";
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const loadPdf = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { PDFDocument } = await import("pdf-lib");
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error(`Could not fetch the form (HTTP ${res.status})`);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = doc.getForm();
      const fields = form.getFields();

      if (fields.length === 0) {
        setState({ status: "no-form", bytes });
        return;
      }

      const detected: DetectedField[] = [];
      const seed: Record<string, string | boolean> = {};
      for (const f of fields) {
        const name = f.getName();
        const ctor = f.constructor.name;
        if (ctor === "PDFTextField") {
          // @ts-expect-error — runtime cast: we know it's a text field.
          const initial = f.getText() ?? "";
          detected.push({ name, type: "text", initial });
          seed[name] = initial;
        } else if (ctor === "PDFCheckBox") {
          // @ts-expect-error — runtime cast.
          const initial = f.isChecked();
          detected.push({ name, type: "checkbox", initial });
          seed[name] = initial;
        } else if (ctor === "PDFDropdown") {
          // @ts-expect-error — runtime cast.
          const options: string[] = f.getOptions();
          // @ts-expect-error — runtime cast.
          const sel: string[] = f.getSelected();
          const initial = sel[0] ?? "";
          detected.push({ name, type: "dropdown", options, initial });
          seed[name] = initial;
        } else if (ctor === "PDFRadioGroup") {
          // @ts-expect-error — runtime cast.
          const options: string[] = f.getOptions();
          // @ts-expect-error — runtime cast.
          const initial = f.getSelected() ?? "";
          detected.push({ name, type: "radio", options, initial });
          seed[name] = initial;
        } else {
          detected.push({ name, type: "unsupported", initial: "" });
        }
      }

      setValues(seed);
      setState({ status: "ready", fields: detected, bytes });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to load form",
      });
    }
  }, [pdfUrl]);

  // Reset and load whenever the modal opens with a (possibly new) URL.
  useEffect(() => {
    if (!open) return;
    setValues({});
    setDownloadError(null);
    void loadPdf();
  }, [open, loadPdf]);

  // Lock body scroll + ESC to close while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const setVal = (name: string, v: string | boolean) =>
    setValues((p) => ({ ...p, [name]: v }));

  const handleDownload = async () => {
    if (state.status !== "ready") return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(state.bytes, { ignoreEncryption: true });
      const form = doc.getForm();

      for (const field of state.fields) {
        const v = values[field.name];
        const formField = form.getFieldMaybe(field.name);
        if (!formField) continue;
        try {
          if (field.type === "text" && typeof v === "string") {
            // @ts-expect-error — runtime cast.
            formField.setText(v);
          } else if (field.type === "checkbox") {
            // @ts-expect-error — runtime cast.
            if (v) formField.check();
            // @ts-expect-error — runtime cast.
            else formField.uncheck();
          } else if (field.type === "dropdown" && typeof v === "string" && v) {
            // @ts-expect-error — runtime cast.
            formField.select(v);
          } else if (field.type === "radio" && typeof v === "string" && v) {
            // @ts-expect-error — runtime cast.
            formField.select(v);
          }
        } catch {
          // Skip fields the PDF refuses (e.g. value not in dropdown opts).
        }
      }

      const out = await doc.save();
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, "") + (isAr ? " — مُعبأ.pdf" : " — filled.pdf");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Could not generate the filled PDF",
      );
    } finally {
      setDownloading(false);
    }
  };

  const downloadOriginal = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed z-[61] flex flex-col overflow-hidden text-white shadow-2xl ring-1 ring-white/10
                       bg-gradient-to-br from-primary-dark via-primary to-primary-dark
                       inset-x-0 bottom-0 rounded-t-2xl max-h-[92vh]
                       sm:inset-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2
                       sm:rounded-2xl sm:max-w-3xl sm:w-[94vw] sm:max-h-[88vh]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="relative flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/70 mb-1">
                  {isAr ? "تحرير النموذج" : "Edit Form"}
                </p>
                <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight break-words" dir="auto">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[12px] text-white/65 mt-0.5 break-words">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label={isAr ? "إغلاق" : "Close"}
                className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto px-5 sm:px-7 py-5">
              {state.status === "loading" && <LoadingState isAr={isAr} />}

              {state.status === "error" && (
                <ErrorState
                  isAr={isAr}
                  message={state.error}
                  onRetry={loadPdf}
                  onDownloadOriginal={downloadOriginal}
                />
              )}

              {state.status === "no-form" && (
                <StaticPdfState
                  isAr={isAr}
                  onDownloadOriginal={downloadOriginal}
                  onSwitchToOverlay={onSwitchToOverlay}
                  fileName={fileName}
                />
              )}

              {state.status === "ready" && (
                <FieldsList
                  isAr={isAr}
                  fields={state.fields}
                  values={values}
                  onChange={setVal}
                />
              )}
            </div>

            {/* Footer */}
            {state.status === "ready" && (
              <div className="relative flex flex-col sm:flex-row items-center gap-3 px-5 sm:px-7 py-4 border-t border-white/10 bg-black/15 flex-shrink-0">
                <p className="text-[11px] text-white/65 leading-snug flex-1">
                  {isAr
                    ? "سيتم تنزيل نسخة معبأة من النموذج بالقيم التي أدخلتها."
                    : "We'll download a filled copy of the form with the values you entered."}
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={downloadOriginal}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                  >
                    <Download size={14} />
                    {isAr ? "النموذج الأصلي" : "Original"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-lg bg-white text-primary hover:bg-white/90 disabled:opacity-60 transition-colors"
                  >
                    {downloading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {isAr ? "جارٍ التنزيل…" : "Downloading…"}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        {isAr ? "تنزيل معبأ" : "Download Filled"}
                      </>
                    )}
                  </button>
                </div>
                {downloadError && (
                  <p className="w-full text-[11px] text-red-200 mt-2">
                    {downloadError}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- inner states ----------------------------- */

function LoadingState({ isAr }: { isAr: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-white/85">
      <Loader2 size={28} className="animate-spin mb-3" />
      <p className="text-sm font-semibold">
        {isAr ? "جارٍ تحميل النموذج…" : "Loading form…"}
      </p>
      <p className="text-[11px] text-white/55 mt-1">
        {isAr ? "نتحقق من الحقول القابلة للتعبئة" : "Detecting fillable fields"}
      </p>
    </div>
  );
}

function ErrorState({
  isAr,
  message,
  onRetry,
  onDownloadOriginal,
}: {
  isAr: boolean;
  message: string;
  onRetry: () => void;
  onDownloadOriginal: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-10 text-white">
      <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-3">
        <AlertCircle size={22} />
      </div>
      <p className="text-sm font-bold mb-1">
        {isAr ? "تعذّر تحميل النموذج" : "Could not load the form"}
      </p>
      <p className="text-[12px] text-white/65 mb-5 max-w-md leading-relaxed">{message}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-white/15 hover:bg-white/25 text-white"
        >
          {isAr ? "إعادة المحاولة" : "Retry"}
        </button>
        <button
          onClick={onDownloadOriginal}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-white text-primary"
        >
          {isAr ? "تنزيل الأصلي" : "Download original"}
        </button>
      </div>
    </div>
  );
}

function StaticPdfState({
  isAr,
  onDownloadOriginal,
  onSwitchToOverlay,
  fileName,
}: {
  isAr: boolean;
  onDownloadOriginal: () => void;
  onSwitchToOverlay?: () => void;
  fileName: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 text-white">
      <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
        <FileText size={26} />
      </div>
      <p className="text-base font-bold mb-1.5">
        {isAr ? "هذا النموذج صورة ثابتة" : "This form is a static PDF"}
      </p>
      <p className="text-[12.5px] text-white/75 max-w-md leading-relaxed mb-5">
        {isAr
          ? "لا يحتوي هذا الملف على حقول قابلة للتعبئة، لكن يمكنك فتحه في المحرر الحر وإضافة النصوص يدوياً في أي مكان على الصفحة، ثم تنزيل نسخة معبأة."
          : "This PDF doesn't carry fillable fields, but you can open it in the freeform editor, drop text anywhere on the page, and download a filled copy."}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-2">
        {onSwitchToOverlay && (
          <button
            onClick={onSwitchToOverlay}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg bg-white text-primary hover:bg-white/90 transition-colors"
          >
            <CheckCircle2 size={14} />
            {isAr ? "تحرير حر" : "Edit freely"}
          </button>
        )}
        <button
          onClick={onDownloadOriginal}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
        >
          <Download size={14} />
          {isAr ? "تنزيل الأصلي" : "Download original"}
        </button>
      </div>
      <p className="text-[10px] text-white/45 mt-4 break-all max-w-xs" dir="ltr">
        {fileName}
      </p>
    </div>
  );
}

function FieldsList({
  isAr,
  fields,
  values,
  onChange,
}: {
  isAr: boolean;
  fields: DetectedField[];
  values: Record<string, string | boolean>;
  onChange: (name: string, v: string | boolean) => void;
}) {
  return (
    <>
      <p className="text-[11px] text-white/70 mb-3">
        {isAr
          ? `تم اكتشاف ${fields.length} حقلاً قابلاً للتعبئة. عبّئ ما يلزم ثم اضغط «تنزيل معبأ».`
          : `Detected ${fields.length} fillable field${fields.length === 1 ? "" : "s"}. Fill what you need and click "Download Filled".`}
      </p>
      <div className="space-y-2.5">
        {fields.map((f) => {
          if (f.type === "unsupported") {
            return (
              <div
                key={f.name}
                className="px-3 py-2.5 rounded-lg bg-white/5 ring-1 ring-white/10 text-[11px] text-white/55"
              >
                {f.name} — {isAr ? "نوع غير مدعوم" : "unsupported field type"}
              </div>
            );
          }
          if (f.type === "checkbox") {
            return (
              <label
                key={f.name}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/95 cursor-pointer hover:bg-white transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!values[f.name]}
                  onChange={(e) => onChange(f.name, e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-[13px] text-text-primary font-mono break-all" dir="ltr">
                  {f.name}
                </span>
              </label>
            );
          }
          if (f.type === "dropdown" || f.type === "radio") {
            return (
              <div key={f.name} className="rounded-lg bg-white/95 px-3 py-2">
                <label className="block text-[10px] text-text-muted font-mono mb-1" dir="ltr">
                  {f.name}
                </label>
                <select
                  value={String(values[f.name] ?? "")}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  className="w-full px-2 py-1.5 text-[13px] text-text-primary bg-bg-light rounded border border-gray-200 focus:outline-none focus:border-primary"
                >
                  <option value="">{isAr ? "— اختر —" : "— select —"}</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          // text
          return (
            <div key={f.name} className="rounded-lg bg-white/95 px-3 py-2">
              <label className="block text-[10px] text-text-muted font-mono mb-1" dir="ltr">
                {f.name}
              </label>
              <input
                type="text"
                value={String(values[f.name] ?? "")}
                onChange={(e) => onChange(f.name, e.target.value)}
                className="w-full px-2 py-1.5 text-[13px] text-text-primary bg-bg-light rounded border border-gray-200 focus:outline-none focus:border-primary"
                dir="auto"
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
