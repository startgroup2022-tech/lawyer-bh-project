"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Plus, Minus } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  type ServiceConfig,
  getOptionLabel,
  getSectionTitle,
  slugFor,
} from "@/lib/serviceOptions";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  cardKey: string | null;
  config: ServiceConfig | null;
};

/**
 * Request Service options modal.
 *
 * Visual treatment per Editing.docx Update 5 (image 7) — matches the red
 * altujar.bh request-service style: a deep crimson backdrop with a
 * gradient sheen, white title and chrome, and pale cards for each
 * selectable option so the list still reads well against the red.
 */
export default function ServiceOptionsModal({ open, onClose, title, cardKey, config }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  // Reset accordion state every time the modal opens or the config changes,
  // so each card starts with all sections collapsed.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded({});
  }, [open, cardKey]);

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderOptions = () => {
    if (!config) return null;

    if (config.kind === "flat") {
      return (
        <ul className="space-y-2">
          {config.options.map((opt) => {
            const label = getOptionLabel(opt, isAr);
            return (
              <li key={label}>
                <Link
                  href={`/book-appointment?service=${cardKey ? slugFor(cardKey, opt) : encodeURIComponent(label)}`}
                  onClick={onClose}
                  className="group flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-white/95 backdrop-blur-sm border border-white/20 hover:bg-white hover:border-white transition-colors shadow-sm"
                >
                  <span className="text-sm font-semibold text-text-primary leading-snug">
                    {label}
                  </span>
                  <Arrow
                    size={14}
                    className="text-primary flex-shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <div className="space-y-2.5">
        {config.sections.map((section) => {
          const isOpen = !!expanded[section.title.en];
          const ToggleIcon = isOpen ? Minus : Plus;
          return (
            <div
              key={section.title.en}
              className="rounded-lg overflow-hidden bg-white/95 backdrop-blur-sm shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.title.en)}
                aria-expanded={isOpen}
                className={`flex items-center justify-between gap-3 w-full px-4 py-3.5 text-start transition-colors ${
                  isOpen ? "bg-primary/[0.06]" : "bg-white hover:bg-primary/[0.03]"
                }`}
              >
                <span className="text-[13px] font-extrabold text-primary uppercase tracking-wide">
                  {getSectionTitle(section, isAr)}
                </span>
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 transition-colors ${
                    isOpen ? "bg-primary text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  <ToggleIcon size={14} strokeWidth={2.5} />
                </span>
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
                    <ul className="px-3 py-3 space-y-1.5 bg-bg-light/60 border-t border-gray-100">
                      {section.options.map((opt) => {
                        const label = getOptionLabel(opt, isAr);
                        return (
                          <li key={label}>
                            <Link
                              href={`/book-appointment?service=${cardKey ? slugFor(cardKey, opt) : encodeURIComponent(label)}`}
                              onClick={onClose}
                              className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-white border border-gray-100 hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
                            >
                              <span className="text-sm text-text-primary leading-snug">
                                {label}
                              </span>
                              <Arrow
                                size={14}
                                className="text-text-muted flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all"
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
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
                       inset-x-0 bottom-0 rounded-t-2xl max-h-[88vh]
                       sm:inset-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2
                       sm:rounded-2xl sm:max-w-2xl sm:w-[92vw] sm:max-h-[80vh]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Decorative radial highlights — match altujar.bh style */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.45) 0, transparent 35%), radial-gradient(circle at 90% 100%, rgba(255,255,255,0.25) 0, transparent 45%)",
              }}
            />

            <div className="relative flex items-center justify-between gap-4 px-5 sm:px-7 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/70 mb-1">
                  {isAr ? "طلب خدمة" : "Request Service"}
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight break-words">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label={isAr ? "إغلاق" : "Close"}
                className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative overflow-y-auto px-5 sm:px-7 py-5">
              <p className="text-[12px] leading-relaxed text-white/85 mb-4">
                {isAr
                  ? "اختر الخدمة المطلوبة لمتابعة الحجز مع المختصين على المنصة."
                  : "Select a service to continue booking with our registered specialists."}
              </p>
              {renderOptions()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
