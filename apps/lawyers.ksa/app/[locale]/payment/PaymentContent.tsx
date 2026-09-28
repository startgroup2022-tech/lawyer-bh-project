"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import TapApplePayPayment from "../book-appointment/_components/book-appointment/TapApplePayPayment";
import TapCardPayment from "../book-appointment/_components/book-appointment/TapCardPayment";
import {
  clearPaymentDraft,
  loadPaymentDraft,
  type SharedPaymentDraft,
} from "./paymentDraft";
import DiscountCodeField, { type AppliedDiscount } from "./DiscountCodeField";

type PaymentMethod = "card" | "benefitpay" | "applepay";

type ChargeResponse = {
  ok?: boolean;
  error?: string;
  transactionUrl?: string | null;
  chargeId?: string;
  requiresRedirect?: boolean;
};

type SosDispatchResponse = {
  caseRef?: string;
  error?: string;
};

function methodTitle(method: PaymentMethod, isAr: boolean) {
  if (method === "benefitpay") return "BenefitPay";
  if (method === "applepay") return "Apple Pay";
  return isAr ? "بطاقة بنكية" : "Card payment";
}

function getBackPath(draft: SharedPaymentDraft | null, lang: string) {
  if (draft?.flow === "sos") return `/${lang}/sos`;
  return `/${lang}/book-appointment`;
}

function getNoDraftBackPath(lang: string) {
  return `/${lang}`;
}

function getFallbackEmail(email: string | undefined) {
  const value = String(email ?? "").trim();
  return value || "customer@example.com";
}

function ApplePayLogo() {
  return (
    <span
      aria-label="Apple Pay"
      className="inline-flex items-center gap-1 whitespace-nowrap text-current transition-colors"
    >
      <span
        aria-hidden="true"
        className="text-[25px] leading-none [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]"
      >
        
      </span>
    </span>
  );
}

function BenefitPayLogo() {
  return (
    <span
      role="img"
      aria-label="BenefitPay"
      className="block h-7 w-8 bg-current transition-colors
        [mask-image:url('/images/benefitpay-logo.svg')]
        [mask-position:center]
        [mask-repeat:no-repeat]
        [mask-size:contain]
        [-webkit-mask-image:url('/images/benefitpay-logo.svg')]
        [-webkit-mask-position:center]
        [-webkit-mask-repeat:no-repeat]
        [-webkit-mask-size:contain]"
    />
  );
}

export default function PaymentContent() {
  const lang = useLocale();
  const isAr = lang === "ar";

  const [draft, setDraft] = useState<SharedPaymentDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  useEffect(() => {
    setDraft(loadPaymentDraft());
    setLoadingDraft(false);
  }, []);

  const goBack = useCallback(() => {
    window.location.href = getBackPath(draft, lang);
  }, [draft, lang]);

  const completeSosDispatch = useCallback(async () => {
    if (!draft || draft.flow !== "sos") return;

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
      throw new Error(
        data.error ||
          (isAr
            ? "تم الدفع، لكن تعذر إنشاء طلب الطوارئ. يرجى التواصل معنا."
            : "Payment completed, but the SOS request could not be created. Please contact us."),
      );
    }

    clearPaymentDraft();
    window.location.href = `/${lang}/sos/confirmed/${encodeURIComponent(data.caseRef)}`;
  }, [draft, isAr, lang]);

  const submitCharge = useCallback(
    async (input: {
      paymentSourceType: "card_sdk_v2" | "benefitpay" | "apple_pay_web";
      sourceId?: string;
      tapTokenId?: string;
    }) => {
      if (!draft || submitting) return;

      setSubmitting(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch("/api/tap/charge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            ...draft.payload,
            lang,
            paymentFlow: draft.flow,
            paymentSourceType: input.paymentSourceType,
            tapTokenId: input.tapTokenId,
            sourceId: input.sourceId,
            amountBD: draft.amountBD,
            amount: draft.amountBD,
            service: draft.service,
            name: draft.name,
            phone: draft.phone,
            email: getFallbackEmail(draft.email),
            returnPath:
              draft.flow === "sos"
                ? `/${lang}/payment/callback`
                : `/${lang}/booking-confirmed`,
            discountCode: appliedDiscount?.code ?? "",
          }),
        });

        const data = (await response.json().catch(() => ({}))) as ChargeResponse;

        if (response.ok && data.ok && data.transactionUrl) {
          window.location.href = data.transactionUrl;
          return;
        }

        if (response.ok && data.ok) {
          if (draft.flow === "sos") {
            await completeSosDispatch();
            return;
          }

          clearPaymentDraft();
          window.location.href = `/${lang}/booking-confirmed${
            data.chargeId ? `?tap_id=${encodeURIComponent(data.chargeId)}` : ""
          }`;
          return;
        }

        throw new Error(
          data.error ??
            (isAr
              ? "تعذر إتمام عملية الدفع. حاول مرة أخرى."
              : "Could not complete the payment. Please try again."),
        );
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";

        setError(
          isAbort
            ? isAr
              ? "استغرقت عملية الدفع وقتًا أطول من المتوقع. تحقق من الاتصال وحاول مرة أخرى."
              : "The payment request took longer than expected. Please check your connection and try again."
            : err instanceof Error
              ? err.message
              : isAr
                ? "حدث خطأ غير معروف أثناء الدفع."
                : "An unknown payment error occurred.",
        );
      } finally {
        window.clearTimeout(timeoutId);
        setSubmitting(false);
      }
    },
    [appliedDiscount?.code, completeSosDispatch, draft, isAr, lang, submitting],
  );

  const handleCardTokenGenerated = useCallback(
    async (tokenId: string) => {
      await submitCharge({
        paymentSourceType: "card_sdk_v2",
        tapTokenId: tokenId,
        sourceId: tokenId,
      });
    },
    [submitCharge],
  );

  const handleApplePayTokenGenerated = useCallback(
    async (tokenId: string) => {
      await submitCharge({
        paymentSourceType: "apple_pay_web",
        tapTokenId: tokenId,
        sourceId: tokenId,
      });
    },
    [submitCharge],
  );

  const handleBenefitPay = useCallback(async () => {
    await submitCharge({
      paymentSourceType: "benefitpay",
      sourceId: "src_bh.benefit",
    });
  }, [submitCharge]);

  const paymentMethods: {
    id: PaymentMethod;
    title: string;
    description: string;
    icon: ReactNode;
    badge?: string;
  }[] = useMemo(
    () => [
      {
        id: "card",
        title: isAr ? "بطاقة بنكية" : "Card payment",
        description: isAr
          ? "ادفع باستخدام Visa أو Mastercard. ستظهر خانات البطاقة بعد الاختيار."
          : "Pay with Visa or Mastercard. Card fields appear after selection.",
        icon: <CreditCard size={24} />,
      },
      {
        id: "benefitpay",
        title: "BenefitPay",
        description: isAr
          ? "انتقال آمن لإكمال الدفع عبر BenefitPay."
          : "Secure redirect to complete payment via BenefitPay.",
        icon: <BenefitPayLogo />,
      },
      {
        id: "applepay",
        title: "Apple Pay",
        description: isAr
          ? "متاح على أجهزة Apple والمتصفحات المدعومة."
          : "Available on supported Apple devices and browsers.",
        icon: <ApplePayLogo />,
      },
    ],
    [isAr],
  );

  if (loadingDraft) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-bg-light px-6 py-12">
        <div className="mx-auto flex max-w-xl items-center justify-center rounded-3xl bg-white p-8 text-text-muted shadow-sm">
          <Loader2 className="me-2 animate-spin" size={18} />
          {isAr ? "جاري تحميل بيانات الدفع..." : "Loading payment details..."}
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-bg-light px-6 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <CreditCard size={24} />
          </div>

          <h1 className="text-xl font-extrabold text-text-primary">
            {isAr ? "لا توجد بيانات دفع محفوظة" : "No payment details found"}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-text-secondary">
            {isAr
              ? "ابدأ من صفحة حجز الموعد أو صفحة SOS، ثم انتقل إلى الدفع."
              : "Start from the appointment booking page or SOS page, then continue to payment."}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = getNoDraftBackPath(lang);
            }}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark"
          >
            {isAr ? "العودة للرئيسية" : "Back home"}
          </button>
        </div>
      </div>
    );
  }

  const isSos = draft.flow === "sos";
  const payableAmount = appliedDiscount ? Number(appliedDiscount.finalAmountBd) : draft.amountBD;
  const payableLabel = appliedDiscount ? `${appliedDiscount.finalAmountBd} ${isAr ? "ر.س" : "SAR"}` : draft.currentPriceLabel;

  return (
    <div className="min-h-[calc(100vh-200px)] bg-bg-light px-4 py-8 sm:px-6 lg:py-14">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={goBack}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-text-secondary shadow-sm transition hover:text-primary"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {isSos
            ? isAr
              ? "العودة إلى SOS"
              : "Back to SOS"
            : isAr
              ? "العودة للحجز"
              : "Back to booking"}
        </button>

        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-primary/[0.08] via-white to-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-primary shadow-sm">
                  <ShieldCheck size={14} />
                  {isAr ? "دفع آمن" : "Secure payment"}
                </div>

                <h1 className="text-2xl font-black text-text-primary sm:text-3xl">
                  {isAr ? "اختر طريقة الدفع" : "Choose payment method"}
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-7 text-text-secondary">
                  {isAr
                    ? "اختر الطريقة المناسبة لإكمال عملية الدفع. لن تظهر خانات البطاقة إلا بعد اختيار البطاقة البنكية."
                    : "Select your preferred method to complete payment. Card fields appear only after choosing card payment."}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm sm:text-end">
                <div className="text-xs font-bold text-text-muted">
                  {isAr ? "المبلغ" : "Amount"}
                </div>
                <div className="mt-1 text-2xl font-black text-primary">
                  {payableLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <DiscountCodeField draft={draft} isAr={isAr} applied={appliedDiscount} onApplied={setAppliedDiscount} onRemoved={() => setAppliedDiscount(null)} />
            <div className="grid gap-4 sm:grid-cols-3">
              {paymentMethods.map((method) => {
                const active = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setSelectedMethod(method.id);
                      setError(null);
                    }}
                    className={`group relative min-h-[165px] rounded-3xl border p-5 text-start transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "border-primary bg-primary/[0.06] shadow-md ring-4 ring-primary/10"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    {method.badge && (
                      <span className="absolute end-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-white">
                        {method.badge}
                      </span>
                    )}

                    <div
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                        active
                          ? "bg-primary text-white"
                          : "bg-primary/[0.08] text-primary group-hover:bg-primary group-hover:text-white"
                      }`}
                    >
                      {method.icon}
                    </div>

                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-text-primary">
                        {method.title}
                      </h3>
                      {active && <CheckCircle2 size={17} className="text-primary" />}
                    </div>

                    <p className="mt-2 text-xs leading-6 text-text-muted">
                      {method.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {!selectedMethod && (
              <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-5 text-center text-sm font-bold text-primary">
                {isAr ? "اختر طريقة الدفع للمتابعة" : "Choose a payment method to continue"}
              </div>
            )}

            {selectedMethod && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm font-bold text-text-secondary">
                {isAr
                  ? `الطريقة المختارة: ${methodTitle(selectedMethod, isAr)}`
                  : `Selected method: ${methodTitle(selectedMethod, isAr)}`}
              </div>
            )}

            {selectedMethod === "card" && (
              <div className="mt-5">
                <TapCardPayment
                  isAr={isAr}
                  amount={payableAmount}
                  currentPriceLabel={payableLabel}
                  name=""
                  email={getFallbackEmail(draft.email)}
                  phone={draft.phone}
                  disabled={submitting}
                  submitting={submitting}
                  onTokenGenerated={handleCardTokenGenerated}
                />
              </div>
            )}

            {selectedMethod === "benefitpay" && (
              <div className="mt-5 rounded-3xl border border-primary/15 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                      <BenefitPayLogo />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-text-primary">BenefitPay</h3>
                      <p className="mt-1 text-sm leading-7 text-text-muted">
                        {isAr
                          ? "سيتم تحويلك لإكمال الدفع عبر BenefitPay."
                          : "You will be redirected to complete payment with BenefitPay."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleBenefitPay}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting
                      ? isAr
                        ? "جاري التحويل..."
                        : "Redirecting..."
                      : isAr
                        ? `الدفع الآن · ${payableLabel}`
                        : `Pay now · ${payableLabel}`}
                  </button>
                </div>
              </div>
            )}

            {selectedMethod === "applepay" && (
              <div className="mt-5">
                <TapApplePayPayment
                  isAr={isAr}
                  amount={payableAmount}
                  currentPriceLabel={payableLabel}
                  name={draft.name}
                  email={getFallbackEmail(draft.email)}
                  phone={draft.phone}
                  disabled={submitting}
                  submitting={submitting}
                  onTokenGenerated={handleApplePayTokenGenerated}
                />
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-7 text-red-700">
                {error}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
