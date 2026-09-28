"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  saveBookAppointmentPaymentDraft,
  type BookAppointmentPaymentDraft,
} from "../paymentDraft";

type PaymentSessionResponse = {
  ok?: boolean;
  error?: string;
  draft?: BookAppointmentPaymentDraft;
};

export default function YourGptPaymentContent() {
  const locale = useLocale() === "en" ? "en" : "ar";
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(
        locale === "ar"
          ? "رابط الدفع غير صالح."
          : "The payment link is invalid.",
      );
      return;
    }

    const controller = new AbortController();

    async function loadPaymentSession() {
      try {
        const response = await fetch(
          `/api/yourgpt/payment-session?token=${encodeURIComponent(token)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response.json().catch(() => ({}))) as PaymentSessionResponse;

        if (!response.ok || !data.ok || !data.draft) {
          throw new Error(data.error || "Payment session is unavailable");
        }

        saveBookAppointmentPaymentDraft({
          ...data.draft,
          flow: "book_appointment",
          lang: locale,
        });

        window.location.replace(`/${locale}/payment`);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : locale === "ar"
              ? "تعذر فتح جلسة الدفع أو انتهت صلاحية الرابط."
              : "The payment session could not be opened.",
        );
      }
    }

    loadPaymentSession();

    return () => controller.abort();
  }, [locale, token]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-5 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-black text-[#07111F]">
              {locale === "ar" ? "تعذر فتح الدفع" : "Unable to open payment"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">{error}</p>
          </>
        ) : (
          <>
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
            <p className="mt-4 font-bold text-[#07111F]">
              {locale === "ar"
                ? "جارٍ تجهيز صفحة الدفع…"
                : "Preparing the payment page…"}
            </p>
          </>
        )}
      </div>
    </main>
  );
}