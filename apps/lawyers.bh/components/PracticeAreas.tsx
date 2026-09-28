"use client";

import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { practiceAreaCategories as practiceAreas } from "@/lib/practiceAreas";

export default function PracticeAreas() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = useTranslations("practiceAreas");

  return (
    <section className="hide-in-app py-20 lg:py-28 bg-bg-light">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-primary text-sm font-semibold tracking-wide uppercase mb-2">
            {t("label")}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary leading-tight">
            {t("title")}
          </h2>
          <p className="mt-3 text-text-muted">{t("subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {practiceAreas.map((area, i) => (
            <motion.div
              key={area.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
            >
              <Link
                href={`/book-appointment?service=${area.key}`}
                className="group flex items-center justify-between gap-2 p-3.5 rounded-lg bg-white border border-gray-100 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-text-primary leading-snug group-hover:text-primary transition-colors">
                  {isAr ? area.ar : area.en}
                </span>
                <span
                  className={`flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors`}
                  aria-hidden
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
