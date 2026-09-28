"use client";

import { Loader2, AlertTriangle } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { clearPaymentDraft, loadPaymentDraft } from "../paymentDraft";

type SosDispatchResponse = {
  caseRef?: string;
  error?: string;
};

export default function PaymentCallbackContent() {
  const lang = useLocale();
  const isAr = lang === "ar";
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeAfterPayment() {
      const draft = loadPaymentDraft();

      if (!draft) {
        setError(
          isAr
            ? "لم نتمكن من العثور على بيانات الطلب بعد الرجوع من الدفع."
            : "We could not find the request details after returning from payment.",
        );
        return;
      }

      if (draft.flow !== "sos") {
        clearPaymentDraft();
        window.location.href = `/${lang}/booking-confirmed${window.location.search || ""}`;
        return;
      }

      try {
        const response = await fetch("/api/sos/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft.payload,
            paymentStatus: "paid",
            paidAtClient: new Date().toISOString(),
          }),
        });

        const data = (await response.json().catch(() => ({}))) as SosDispatchResponse;

        if (!response.ok || !data.caseRef) {
          throw new Error(data.error || `SOS dispatch failed: ${response.status}`);
        }

        if (cancelled) return;

        clearPaymentDraft();
        window.location.href = `/${lang}/sos/confirmed/${encodeURIComponent(data.caseRef)}`;
      } catch (err) {
        if (cancelled) return;
        console.error("[payment/callback] sos dispatch failed", err);
        setError(
          isAr
            ? "تم الرجوع من الدفع، لكن تعذر إنشاء طلب الطوارئ. يرجى التواصل معنا أو المحاولة مرة أخرى."
            : "Payment returned, but the SOS request could not be created. Please contact us or try again.",
        );
      }
    }

    completeAfterPayment();

    return () => {
      cancelled = true;
    };
  }, [isAr, lang]);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-bg-light px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
            <AlertTriangle size={24} />
          </div>
          <h1 className="text-xl font-extrabold text-text-primary">
            {isAr ? "تعذر إكمال الطلب" : "Could not complete request"}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              window.location.href = `/${lang}/sos`;
            }}
            className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"
          >
            {isAr ? "العودة إلى SOS" : "Back to SOS"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-bg-light px-6 py-12">
      <div className="mx-auto flex max-w-2xl items-center justify-center rounded-3xl bg-white p-8 text-sm font-bold text-text-secondary shadow-sm">
        <Loader2 className="me-2 animate-spin text-primary" size={18} />
        {isAr ? "جاري إكمال الطلب بعد الدفع..." : "Completing your request after payment..."}
      </div>
    </div>
  );
}
