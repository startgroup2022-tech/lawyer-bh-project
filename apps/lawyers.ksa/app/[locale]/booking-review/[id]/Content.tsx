"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Check, Loader2, Send, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";

type RatingKey =
  | "lawyerRating"
  | "serviceSpeedRating"
  | "serviceQualityRating"
  | "providerCommunicationRating"
  | "appointmentCommitmentRating"
  | "platformEaseRating"
  | "overallRating";

type Ratings = Record<RatingKey, number>;

type BookingSummary = {
  id: string;
  providerName: string | null;
  service: string | null;
  consultationType: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
};

type Props = {
  bookingId: string;
  token: string;
};

const ratingKeys: RatingKey[] = [
  "lawyerRating",
  "serviceSpeedRating",
  "serviceQualityRating",
  "providerCommunicationRating",
  "appointmentCommitmentRating",
  "platformEaseRating",
  "overallRating",
];

const ratingLabels: Record<
  RatingKey,
  { ar: string; en: string; hintAr: string; hintEn: string }
> = {
  lawyerRating: {
    ar: "تقييم المحامي",
    en: "Lawyer rating",
    hintAr: "مدى رضاك عن أداء المحامي أو مقدم الخدمة القانوني",
    hintEn: "How satisfied you were with the lawyer or legal provider",
  },
  serviceSpeedRating: {
    ar: "سرعة الخدمة",
    en: "Service speed",
    hintAr: "مدى سرعة التجاوب وإنجاز الطلب",
    hintEn: "How quickly the request was handled",
  },
  serviceQualityRating: {
    ar: "جودة الخدمة",
    en: "Service quality",
    hintAr: "مدى جودة ووضوح الخدمة المقدمة",
    hintEn: "Clarity and quality of the service provided",
  },
  providerCommunicationRating: {
    ar: "تواصل مقدم الخدمة",
    en: "Provider communication",
    hintAr: "أسلوب التواصل والرد على الاستفسارات",
    hintEn: "Communication style and responsiveness",
  },
  appointmentCommitmentRating: {
    ar: "الالتزام بالموعد",
    en: "Appointment commitment",
    hintAr: "مدى الالتزام بالتاريخ والوقت المحدد",
    hintEn: "Commitment to the selected date and time",
  },
  platformEaseRating: {
    ar: "سهولة استخدام المنصة",
    en: "Platform ease of use",
    hintAr: "سهولة الحجز والدفع والمتابعة",
    hintEn: "Ease of booking, payment, and follow-up",
  },
  overallRating: {
    ar: "التقييم العام",
    en: "Overall rating",
    hintAr: "تقييمك النهائي للتجربة كاملة",
    hintEn: "Your overall experience rating",
  },
};

function emptyRatings(): Ratings {
  return {
    lawyerRating: 0,
    serviceSpeedRating: 0,
    serviceQualityRating: 0,
    providerCommunicationRating: 0,
    appointmentCommitmentRating: 0,
    platformEaseRating: 0,
    overallRating: 0,
  };
}

function RatingRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-text-primary">{label}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
            {hint}
          </p>
        </div>

        <span className="text-xs font-extrabold text-primary">
          {value ? `${value}/5` : "—"}
        </span>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;

          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`rounded-xl p-2 transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-50 text-gray-300 hover:bg-primary/5 hover:text-primary/50"
              }`}
              aria-label={`${star}/5`}
            >
              <Star
                className="h-6 w-6"
                fill={active ? "currentColor" : "none"}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div>
      <p className="text-[11px] font-extrabold text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}

export default function BookingReviewContent({ bookingId, token }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [ratings, setRatings] = useState<Ratings>(() => emptyRatings());
  const [lawyerComment, setLawyerComment] = useState("");
  const [serviceComment, setServiceComment] = useState("");
  const [publicComment, setPublicComment] = useState(true);

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expiredOrDone, setExpiredOrDone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkLink = async () => {
      if (!token) {
        setError(isAr ? "رابط التقييم غير صحيح" : "Invalid review link");
        setChecking(false);
        return;
      }

      try {
        const params = new URLSearchParams({ bookingId, token });
        const res = await fetch(`/api/booking-review?${params.toString()}`, {
          cache: "no-store",
        });

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          status?: string;
          booking?: BookingSummary;
        };

        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Invalid review link");
        }

        if (data.status === "submitted") {
          setSubmitted(true);
        }

        if (data.status === "expired") {
          setExpiredOrDone(
            isAr ? "انتهت صلاحية رابط التقييم." : "This review link has expired.",
          );
        }

        setBooking(data.booking ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isAr
              ? "تعذر فتح رابط التقييم"
              : "Could not open review link",
        );
      } finally {
        setChecking(false);
      }
    };

    checkLink();
  }, [bookingId, token, isAr]);

  const canSubmit = useMemo(
    () =>
      token &&
      !expiredOrDone &&
      ratingKeys.every((key) => ratings[key] > 0) &&
      !submitting,
    [expiredOrDone, ratings, submitting, token],
  );

  const setRating = (key: RatingKey, value: number) => {
    setRatings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitReview = async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError("");

      const res = await fetch("/api/booking-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          token,
          ...ratings,
          lawyerComment,
          serviceComment,
          publicComment,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not submit review");
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر إرسال التقييم"
            : "Could not submit review",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-bold text-text-muted">
            {isAr ? "جاري التحقق من رابط التقييم..." : "Checking review link..."}
          </p>
        </div>
      </main>
    );
  }

  if (submitted || expiredOrDone) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
          {submitted ? (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-text-primary">
                {isAr ? "شكراً على تقييمك" : "Thank you for your review"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                {isAr
                  ? "تم حفظ تقييم المحامي والخدمة بنجاح."
                  : "Your lawyer and service review has been saved successfully."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-text-primary">
                {isAr ? "لا يمكن إرسال التقييم" : "Review unavailable"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                {expiredOrDone}
              </p>
            </>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white hover:bg-primary-dark"
          >
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl bg-[#07111F] p-7 text-white shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/55">
            Saudi Lawyers
          </p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            {isAr ? "قيّم المحامي والخدمة" : "Rate the lawyer and service"}
          </h1>
          <p className="mt-2 text-sm leading-7 text-white/65">
            {isAr
              ? "رأيك يساعدنا على تحسين جودة المحامين والخدمات القانونية في المنصة."
              : "Your feedback helps us improve lawyer quality and legal services on the platform."}
          </p>
        </div>

        {booking && (
          <div className="mb-6 grid gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)] sm:grid-cols-2">
            <SummaryItem
              label={isAr ? "مقدم الخدمة" : "Provider"}
              value={booking.providerName}
            />
            <SummaryItem
              label={isAr ? "الخدمة" : "Service"}
              value={booking.service}
            />
            <SummaryItem
              label={isAr ? "نوع الاستشارة" : "Consultation type"}
              value={booking.consultationType}
            />
            <SummaryItem
              label={isAr ? "الموعد" : "Appointment"}
              value={[booking.appointmentDate, booking.appointmentTime]
                .filter(Boolean)
                .join(" - ")}
            />
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {ratingKeys.map((key) => {
            const label = ratingLabels[key];

            return (
              <RatingRow
                key={key}
                label={isAr ? label.ar : label.en}
                hint={isAr ? label.hintAr : label.hintEn}
                value={ratings[key]}
                onChange={(value) => setRating(key, value)}
              />
            );
          })}

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-sm font-extrabold text-text-primary">
              {isAr ? "تعليق عن المحامي" : "Comment about the lawyer"}
            </label>
            <textarea
              value={lawyerComment}
              onChange={(e) => setLawyerComment(e.target.value)}
              rows={4}
              maxLength={1200}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder={
                isAr
                  ? "اكتب ملاحظتك عن المحامي أو مقدم الخدمة..."
                  : "Write your feedback about the lawyer or service provider..."
              }
            />

            <label className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs font-bold leading-6 text-text-muted">
              <input
                type="checkbox"
                checked={publicComment}
                onChange={(e) => setPublicComment(e.target.checked)}
                className="mt-1"
              />
              <span>
                {isAr
                  ? "السماح بعرض تعليق المحامي في ملف المحامي العام بدون عرض بياناتي الشخصية."
                  : "Allow showing this lawyer comment on the public lawyer profile without my personal details."}
              </span>
            </label>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-sm font-extrabold text-text-primary">
              {isAr ? "تعليق عن الخدمة والمنصة" : "Comment about the service/platform"}
            </label>
            <textarea
              value={serviceComment}
              onChange={(e) => setServiceComment(e.target.value)}
              rows={4}
              maxLength={1200}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder={
                isAr
                  ? "اكتب ملاحظتك عن سرعة الخدمة، الدفع، الحجز، أو تجربة المنصة..."
                  : "Write your feedback about speed, payment, booking, or the platform experience..."
              }
            />
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submitReview}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isAr ? "إرسال التقييم" : "Submit Review"}
          </button>
        </div>
      </div>
    </main>
  );
}
