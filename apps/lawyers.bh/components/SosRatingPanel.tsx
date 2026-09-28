"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star, CheckCircle2 } from "lucide-react";

interface Props {
  caseRef: string;
  /** Set if the case has already been rated (prevents duplicate submissions). */
  initialStars?: number | null;
}

export default function SosRatingPanel({ caseRef, initialStars }: Props) {
  const t = useTranslations("sos.rating");
  const [stars, setStars] = useState<number>(initialStars ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(initialStars != null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (stars < 1) {
      setError(t("pickStars"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/sos/rating/${encodeURIComponent(caseRef)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stars, comment }),
        },
      );
      if (!res.ok && res.status !== 409) throw new Error(`status ${res.status}`);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm border border-emerald-200">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={16} />
          <span className="font-bold">{t("thanks")}</span>
        </div>
        {stars > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={
                  i < stars ? "fill-yellow-400 text-yellow-500" : "text-gray-300"
                }
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="text-[14px] font-extrabold text-text-primary">
        {t("title")}
      </h3>
      <p className="mt-1 text-[12px] text-text-muted">{t("subtitle")}</p>

      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= (hover || stars);
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(n)}
              className="p-1"
              aria-label={`${n} stars`}
            >
              <Star
                size={28}
                className={
                  active
                    ? "fill-yellow-400 text-yellow-500"
                    : "text-gray-300"
                }
              />
            </button>
          );
        })}
      </div>

      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder={t("commentPlaceholder")}
        className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A237E] focus:outline-none"
      />

      {error && (
        <p className="mt-2 text-[11px] text-[#D32F2F]">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || stars < 1}
        className="mt-3 w-full rounded-xl bg-[#1A237E] py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </section>
  );
}
