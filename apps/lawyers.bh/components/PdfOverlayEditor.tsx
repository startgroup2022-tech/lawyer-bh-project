"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Type,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
} from "lucide-react";
import { useLocale } from "next-intl";

/**
 * Freeform PDF overlay editor.
 *
 * For PDFs that don't carry AcroForm metadata (the bulk of the MoJ
 * forms are scanned/static), we render every page with pdfjs-dist and
 * let the user drop text boxes anywhere on the page. Boxes are
 * editable, draggable, and resizable; on download we use pdf-lib +
 * fontkit + Cairo (an Arabic-capable font) to flatten everything onto
 * the original PDF and trigger a browser download.
 *
 * Coordinate system note: the browser uses a top-left origin while
 * PDF pages use a bottom-left origin. We capture annotation positions
 * in browser pixels at a fixed render scale, then convert to PDF
 * points at write time using the page's actual dimensions.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
  title: string;
  subtitle?: string;
};

type Annotation = {
  id: string;
  page: number; // 0-indexed
  x: number; // browser px from top-left of page (at RENDER_SCALE)
  y: number;
  width: number;
  fontSize: number; // px at RENDER_SCALE
  text: string;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pageCount: number; pageSizes: { w: number; h: number }[] }
  | { status: "error"; error: string };

const RENDER_SCALE = 1.5;
const DEFAULT_FONT_SIZE = 16; // px at RENDER_SCALE
const FONT_URL = "/fonts/Cairo-Regular.ttf";
const LATIN_FONT_URL = "/fonts/Cairo-Latin.ttf";

export default function PdfOverlayEditor({
  open,
  onClose,
  pdfUrl,
  fileName,
  title,
  subtitle,
}: Props) {
  const isAr = useLocale() === "ar";
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Each page renders into one canvas — we keep a ref array so we can
  // grab the rendered pixel dimensions for click coordinates and so
  // the parent can scroll the viewport during interactions.
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const cachedBytesRef = useRef<Uint8Array | null>(null);
  // PDF.js doc handle, kept in a ref so the render effect can pick it
  // up once the canvases have mounted (we render *after* state flips
  // to "ready" and the canvas elements actually exist in the DOM).
  const docRef = useRef<Awaited<ReturnType<typeof import("pdfjs-dist").getDocument>["promise"]> | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    annoX: number;
    annoY: number;
  } | null>(null);

  const loadPdf = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const pdfjs = await import("pdfjs-dist");
      // pdfjs needs a worker URL. We ship the worker as a static
      // asset under /public/pdf.worker.min.mjs so it's loaded directly
      // without bundler-specific URL plumbing.
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error(`Could not fetch the form (HTTP ${res.status})`);
      const buf = await res.arrayBuffer();
      cachedBytesRef.current = new Uint8Array(buf);

      const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      docRef.current = doc;
      const pageSizes: { w: number; h: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        pageSizes.push({ w: viewport.width, h: viewport.height });
      }
      setState({ status: "ready", pageCount: doc.numPages, pageSizes });
      // Rendering is kicked off by the useEffect below, once the
      // canvas elements for these pages have actually mounted.
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to load PDF",
      });
    }
  }, [pdfUrl]);

  const renderAll = async (
    // pdfjs-dist's PDFDocumentProxy — typed loosely so we don't have
    // to pin the exact 5.x shape across upgrades.
    doc: Awaited<ReturnType<typeof import("pdfjs-dist").getDocument>["promise"]>,
  ) => {
    for (let i = 1; i <= doc.numPages; i++) {
      const canvas = canvasRefs.current[i - 1];
      if (!canvas) continue;
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      // pdfjs 5.x requires both canvas and canvasContext on render().
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    }
  };

  // Reset and load when the modal opens.
  useEffect(() => {
    if (!open) return;
    setAnnotations([]);
    setSelectedId(null);
    setDownloadError(null);
    canvasRefs.current = [];
    docRef.current = null;
    void loadPdf();
  }, [open, loadPdf]);

  // Render canvases once the page elements are in the DOM. We watch
  // state.status because the canvas elements only render when state
  // flips to "ready", so this effect fires *after* React commits the
  // canvases — at which point canvasRefs.current is populated.
  useEffect(() => {
    if (state.status !== "ready" || !docRef.current) return;
    void renderAll(docRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // ESC + body lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return; // user is typing, don't delete annotation
        }
        setAnnotations((p) => p.filter((a) => a.id !== selectedId));
        setSelectedId(null);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, selectedId]);

  const handlePageClick = (page: number, e: ReactMouseEvent<HTMLDivElement>) => {
    if (state.status !== "ready") return;
    // Don't add a new box if the user is just clicking an existing one.
    const target = e.target as HTMLElement;
    if (target.dataset.anno || target.closest("[data-anno]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = `anno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newAnno: Annotation = {
      id,
      page,
      x,
      y,
      width: 220,
      fontSize: DEFAULT_FONT_SIZE,
      text: "",
    };
    setAnnotations((p) => [...p, newAnno]);
    setSelectedId(id);
    // Focus the textarea on next tick so the user can type immediately.
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(
        `[data-anno="${id}"] textarea`,
      );
      ta?.focus();
    });
  };

  const updateAnno = (id: string, patch: Partial<Annotation>) => {
    setAnnotations((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAnno = (id: string) => {
    setAnnotations((p) => p.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const startDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
    a: Annotation,
  ) => {
    // Only drag from the handle, not the text area itself.
    const target = e.target as HTMLElement;
    if (target.closest("textarea") || target.closest("button")) return;
    e.preventDefault();
    setSelectedId(a.id);
    dragRef.current = { id: a.id, startX: e.clientX, startY: e.clientY, annoX: a.x, annoY: a.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    updateAnno(drag.id, { x: drag.annoX + dx, y: drag.annoY + dy });
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore — pointer may already be released.
    }
  };

  const handleDownload = async () => {
    if (state.status !== "ready" || !cachedBytesRef.current) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { PDFDocument, rgb } = await import("pdf-lib");
      const fontkit = (await import("@pdf-lib/fontkit")).default;

      const doc = await PDFDocument.load(cachedBytesRef.current, { ignoreEncryption: true });
      doc.registerFontkit(fontkit);

      // Pull the bundled Cairo TTF (Arabic-capable). Latin fallback is
      // also Cairo, so a single embed handles both scripts cleanly.
      const fontBytes = await fetch(FONT_URL).then((r) => r.arrayBuffer());
      const font = await doc.embedFont(new Uint8Array(fontBytes), { subset: true });

      // Latin-only Cairo for any annotations that are pure Latin —
      // smaller subset, kept as a future-proofing knob; we currently
      // route everything through the Arabic-capable font for safety.
      void LATIN_FONT_URL;

      const pages = doc.getPages();
      const grouped: Record<number, Annotation[]> = {};
      for (const a of annotations) {
        if (!a.text.trim()) continue;
        (grouped[a.page] ??= []).push(a);
      }

      for (const [pageIdxStr, items] of Object.entries(grouped)) {
        const pageIdx = Number(pageIdxStr);
        const page = pages[pageIdx];
        if (!page) continue;
        const { width: pdfW, height: pdfH } = page.getSize();
        const renderSize = state.pageSizes[pageIdx];
        const scaleX = pdfW / renderSize.w;
        const scaleY = pdfH / renderSize.h;

        for (const a of items) {
          const fontSizePt = a.fontSize * scaleY;
          const lines = a.text.split(/\r?\n/);
          for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            // Convert browser top-left coords to PDF bottom-left coords.
            const xPt = a.x * scaleX;
            const yPt = pdfH - (a.y + (li + 1) * a.fontSize * 1.25) * scaleY;
            try {
              page.drawText(line, {
                x: xPt,
                y: yPt,
                size: fontSizePt,
                font,
                color: rgb(0, 0, 0),
              });
            } catch {
              // Ignore characters the font can't render — pdf-lib will
              // throw on missing glyphs if subset doesn't include them.
            }
          }
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

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/65 backdrop-blur-[2px] z-[60]"
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
            className="fixed z-[61] flex flex-col overflow-hidden text-white shadow-2xl
                       bg-gradient-to-br from-primary-dark via-primary to-[#5a0d0d]
                       inset-x-2 top-2 bottom-2 sm:inset-x-4 sm:top-4 sm:bottom-4
                       rounded-2xl sm:rounded-3xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="relative flex items-start justify-between gap-4 px-5 sm:px-7 pt-4 pb-3 border-b border-white/10 flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/70 mb-0.5">
                  {isAr ? "تحرير حر — أضف نصاً" : "Freeform Editor — add text anywhere"}
                </p>
                <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight break-words" dir="auto">
                  {title}
                </h2>
                {subtitle && <p className="text-[11px] text-white/65 break-words">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label={isAr ? "إغلاق" : "Close"}
                className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="relative px-5 sm:px-7 py-2.5 border-b border-white/10 flex items-center gap-2 flex-shrink-0 bg-black/15">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/85">
                <Type size={13} /> {isAr ? "اضغط على الصفحة لإضافة نص" : "Click on the page to add text"}
              </span>
              {selected && (
                <>
                  <span className="ms-2 inline-flex items-center gap-1 bg-white/15 rounded-md px-1.5 py-1">
                    <button
                      onClick={() =>
                        updateAnno(selected.id, {
                          fontSize: Math.max(8, selected.fontSize - 2),
                        })
                      }
                      className="p-0.5 hover:bg-white/15 rounded"
                      aria-label="decrease font size"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-[11px] font-bold tabular-nums w-7 text-center">
                      {selected.fontSize}
                    </span>
                    <button
                      onClick={() =>
                        updateAnno(selected.id, {
                          fontSize: Math.min(48, selected.fontSize + 2),
                        })
                      }
                      className="p-0.5 hover:bg-white/15 rounded"
                      aria-label="increase font size"
                    >
                      <Plus size={12} />
                    </button>
                  </span>
                  <button
                    onClick={() => deleteAnno(selected.id)}
                    className="ms-1 inline-flex items-center gap-1 text-[11px] font-bold text-white/85 hover:text-white px-2 py-1 rounded-md hover:bg-white/10"
                  >
                    <Trash2 size={12} /> {isAr ? "حذف" : "Delete"}
                  </button>
                </>
              )}
              <span className="ms-auto text-[11px] text-white/55 hidden sm:inline">
                {annotations.length}{" "}
                {isAr ? "نص" : annotations.length === 1 ? "annotation" : "annotations"}
              </span>
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto p-4 sm:p-6 bg-black/30">
              {state.status === "loading" && <LoadingState isAr={isAr} />}
              {state.status === "error" && (
                <ErrorState
                  isAr={isAr}
                  message={state.error}
                  onRetry={loadPdf}
                  onDownloadOriginal={downloadOriginal}
                />
              )}

              {state.status === "ready" && (
                <div className="flex flex-col items-center gap-6">
                  {Array.from({ length: state.pageCount }).map((_, idx) => (
                    <div key={idx} className="relative w-full max-w-fit">
                      <div className="absolute -top-6 start-0 text-[10px] font-bold tracking-wider uppercase text-white/55">
                        {isAr ? "صفحة" : "Page"} {idx + 1} / {state.pageCount}
                      </div>
                      <div
                        className="relative bg-white shadow-xl ring-1 ring-white/10"
                        style={{
                          width: state.pageSizes[idx]?.w,
                          height: state.pageSizes[idx]?.h,
                        }}
                        onClick={(e) => handlePageClick(idx, e)}
                      >
                        <canvas
                          ref={(el) => {
                            canvasRefs.current[idx] = el;
                          }}
                          className="block"
                        />
                        {annotations
                          .filter((a) => a.page === idx)
                          .map((a) => (
                            <AnnotationBox
                              key={a.id}
                              anno={a}
                              selected={a.id === selectedId}
                              onSelect={() => setSelectedId(a.id)}
                              onChange={(patch) => updateAnno(a.id, patch)}
                              onDelete={() => deleteAnno(a.id)}
                              onPointerDown={(e) => startDrag(e, a)}
                              onPointerMove={onDragMove}
                              onPointerUp={endDrag}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {state.status === "ready" && (
              <div className="relative flex flex-col sm:flex-row items-center gap-3 px-5 sm:px-7 py-3 border-t border-white/10 bg-black/30 flex-shrink-0">
                <p className="text-[11px] text-white/65 leading-snug flex-1">
                  {isAr
                    ? "سيتم تنزيل نسخة من النموذج مع جميع النصوص التي أضفتها مدمجة في الملف."
                    : "We'll flatten every text box you added onto the original PDF and download a filled copy."}
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={downloadOriginal}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  >
                    <Download size={14} />
                    {isAr ? "النموذج الأصلي" : "Original"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading || annotations.every((a) => !a.text.trim())}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-white text-primary hover:bg-white/90 disabled:opacity-50"
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
                  <p className="w-full text-[11px] text-red-200 mt-2">{downloadError}</p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- helpers ----------------------------- */

function AnnotationBox({
  anno,
  selected,
  onSelect,
  onChange,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  anno: Annotation;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Annotation>) => void;
  onDelete: () => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-anno={anno.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute group/anno cursor-move ${
        selected
          ? "ring-2 ring-primary ring-offset-1 ring-offset-white"
          : "ring-1 ring-primary/40 hover:ring-primary"
      }`}
      style={{
        left: anno.x,
        top: anno.y,
        width: anno.width,
        background: selected ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.85)",
      }}
    >
      <textarea
        value={anno.text}
        onChange={(e) => onChange({ text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        placeholder="…"
        rows={1}
        dir="auto"
        className="block w-full bg-transparent border-0 outline-none resize-none p-1.5 text-text-primary leading-tight"
        style={{ fontSize: anno.fontSize, fontFamily: "Cairo, sans-serif" }}
      />
      {selected && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-3 -end-3 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-dark"
            aria-label="delete annotation"
          >
            <Trash2 size={12} />
          </button>
          {/* Width handle on the right edge */}
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startW = anno.width;
              const onMove = (ev: PointerEvent) => {
                onChange({ width: Math.max(60, startW + (ev.clientX - startX)) });
              };
              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
            className="absolute end-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-primary/0 group-hover/anno:bg-primary/30"
          />
        </>
      )}
    </div>
  );
}

function LoadingState({ isAr }: { isAr: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/85">
      <Loader2 size={28} className="animate-spin mb-3" />
      <p className="text-sm font-semibold">
        {isAr ? "جارٍ تحضير النموذج للتحرير…" : "Preparing the form for editing…"}
      </p>
      <p className="text-[11px] text-white/55 mt-1">
        {isAr ? "نقوم برسم الصفحات" : "Rendering pages"}
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
    <div className="flex flex-col items-center text-center py-16 text-white">
      <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-3">
        <AlertCircle size={22} />
      </div>
      <p className="text-sm font-bold mb-1">
        {isAr ? "تعذّر تحضير النموذج" : "Could not load the form"}
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

// Export ChevronUp/ChevronDown from lucide so the toolbar can keep
// iconography consistent if we later add per-page navigation. Not used
// today but kept tree-shakeable via a void reference.
void ChevronUp;
void ChevronDown;
