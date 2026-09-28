"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./SosFlow.module.css";

type CardSdk = {
  renderTapCard: (id: string, options: Record<string, unknown>) => { unmount?: () => void } | void;
  tokenize: () => void | Promise<unknown>;
  Locale?: Record<string, string>;
  Direction?: Record<string, string>;
  Theme?: Record<string, string>;
  Edges?: Record<string, string>;
  Currencies?: Record<string, string>;
};

type CardConfig = { publicKey: string; merchantId: string; mode: "test" | "live" };
type Props = {
  requestId: string;
  amount: number;
  locale: string;
  name: string;
  phone: string;
  phoneDialCode: string;
  onClose: () => void;
};

const sdk = () => (window as Window & { CardSDK?: CardSdk }).CardSDK;

function tapErrorCode(reason: unknown): string | null {
  if (!reason || typeof reason !== "object") return null;
  const detail = reason as Record<string, unknown>;
  const nested = detail.error && typeof detail.error === "object"
    ? detail.error as Record<string, unknown>
    : null;
  const code = detail.code ?? detail.error_code ?? nested?.code ?? nested?.error_code;
  const value = typeof code === "number" ? String(code) : code;
  return typeof value === "string" && /^[A-Za-z0-9_-]{2,16}$/.test(value) ? value : null;
}

function cardError(ar: boolean, reason?: unknown): string {
  const code = tapErrorCode(reason);
  const suffix = code ? (ar ? ` رمز Tap: ${code}.` : ` Tap code: ${code}.`) : "";
  return ar
    ? `تعذر تجهيز البطاقة لدى Tap.${suffix} لم يُؤكَّد الدفع؛ تحقق من حالة طلبك قبل إعادة المحاولة.`
    : `Tap could not prepare the card.${suffix} Payment is not confirmed; check your request status before retrying.`;
}

const timeoutError = (ar: boolean) => ar
  ? "لم يستجب نموذج Tap خلال 25 ثانية. أغلق نافذة الدفع وتحقق من حالة طلبك قبل إعادة المحاولة."
  : "Tap did not respond within 25 seconds. Close this payment window and check your request status before retrying.";

const chargeError = (ar: boolean) => ar
  ? "تعذر التحقق من نتيجة إنشاء عملية الدفع. تحقق من حالة طلبك قبل إعادة المحاولة؛ لن يُنشأ طلب جديد تلقائيًا."
  : "The payment result could not be confirmed. Check your request status before retrying; no new request will be created automatically.";

export default function SosPaymentDialog({ requestId, amount, locale, name, phone, phoneDialCode, onClose }: Props) {
  const ar = locale === "ar";
  const cardId = `sos-tap-card-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const closeRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const timedOutRef = useRef(false);
  const chargeSubmittedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [config, setConfig] = useState<CardConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [chargeSubmitted, setChargeSubmitted] = useState(false);
  const [error, setError] = useState("");

  function stopBusy() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    busyRef.current = false;
    setBusy(false);
  }

  useEffect(() => {
    setMounted(true);
    closeRef.current?.focus();
    const controller = new AbortController();
    fetch("/api/sos/card", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.publicKey || !data.merchantId) throw new Error("card_config_unavailable");
        setConfig(data as CardConfig);
      })
      .catch((cause) => {
        if (cause?.name !== "AbortError") setError(cardError(ar));
      });
    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ar]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const cardSdk = sdk();
    if (!mounted || !scriptReady || !config || !cardSdk?.renderTapCard) return;
    const digits = phone.replace(/\D/g, "");
    const dial = phoneDialCode.replace(/\D/g, "");
    const localPhone = digits.startsWith(dial) ? digits.slice(dial.length) : digits;
    const names = name.trim().split(/\s+/);
    let active = true;
    let unmount: (() => void) | undefined;
    try {
      const result = cardSdk.renderTapCard(cardId, {
        publicKey: config.publicKey,
        merchant: { id: config.merchantId },
        transaction: { amount: Number(amount.toFixed(3)), currency: cardSdk.Currencies?.BHD ?? "BHD" },
        customer: {
          name: [{ lang: ar ? cardSdk.Locale?.AR ?? "ar" : cardSdk.Locale?.EN ?? "en", first: names[0] || "Customer", last: names.slice(1).join(" ") || "Customer" }],
          editable: true,
          contact: { email: "noreply@legalsos.org", phone: { countryCode: `+${dial}`, number: localPhone } },
        },
        acceptance: { supportedBrands: ["VISA", "MASTERCARD"], supportedCards: "ALL" },
        fields: { cardHolder: true },
        addons: { displayPaymentBrands: true, loader: true, saveCard: false },
        interface: {
          locale: ar ? cardSdk.Locale?.AR ?? "ar" : cardSdk.Locale?.EN ?? "en",
          theme: cardSdk.Theme?.LIGHT ?? "light",
          edges: cardSdk.Edges?.CURVED ?? "curved",
          direction: ar ? cardSdk.Direction?.RTL ?? "rtl" : cardSdk.Direction?.LTR ?? "ltr",
        },
        onReady: () => { if (active && !timedOutRef.current && !chargeSubmittedRef.current) { setReady(true); setError(""); } },
        onValidInput: () => { if (active && !timedOutRef.current && !chargeSubmittedRef.current) setError(""); },
        onInvalidInput: () => { if (active && !timedOutRef.current && !chargeSubmittedRef.current && busyRef.current) { stopBusy(); setError(ar ? "تأكد من بيانات البطاقة وأعد المحاولة." : "Check your card details and try again."); } },
        onError: (reason: unknown) => { if (active && !timedOutRef.current && !chargeSubmittedRef.current) { stopBusy(); setError(cardError(ar, reason)); } },
        onSuccess: async (token: { id?: string }) => {
          if (!active || timedOutRef.current || chargeSubmittedRef.current || !busyRef.current) return;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = null;
          if (!token?.id?.startsWith("tok_")) {
            stopBusy();
            setError(ar ? "لم يُرجع Tap رمز البطاقة المطلوب. تحقق من حالة طلبك قبل إعادة المحاولة." : "Tap did not return the required card token. Check your request status before retrying.");
            return;
          }
          chargeSubmittedRef.current = true;
          setChargeSubmitted(true);
          try {
            const response = await fetch("/api/sos/card", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId, tokenId: token.id, locale, phoneDialCode: dial }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) throw new Error("charge_unavailable");
            const continuation = `/${encodeURIComponent(locale)}/sos/continue?requestId=${encodeURIComponent(requestId)}`;
            const paymentUrl = typeof data.transactionUrl === "string" ? data.transactionUrl : "";
            if (paymentUrl && new URL(paymentUrl).protocol === "https:") {
              window.location.assign(paymentUrl);
            } else {
              window.location.assign(continuation);
            }
          } catch {
            if (active) { stopBusy(); setError(chargeError(ar)); }
          }
        },
      });
      unmount = result?.unmount;
    } catch {
      setError(cardError(ar));
    }
    return () => { active = false; unmount?.(); };
  }, [mounted, scriptReady, config, cardId, amount, ar, name, phone, phoneDialCode, requestId, locale]);

  function pay() {
    if (!ready || !sdk()?.tokenize || busyRef.current || timedOutRef.current || chargeSubmittedRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    timerRef.current = setTimeout(() => {
      timedOutRef.current = true;
      setTimedOut(true);
      stopBusy();
      setError(timeoutError(ar));
    }, 25000);
    try {
      const result = sdk()!.tokenize();
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch((reason) => {
          if (timedOutRef.current || chargeSubmittedRef.current) return;
          stopBusy();
          setError(cardError(ar, reason));
        });
      }
    } catch (reason) {
      if (chargeSubmittedRef.current) return;
      stopBusy();
      setError(cardError(ar, reason));
    }
  }

  if (!mounted) return null;
  return createPortal(
    <div className={styles.paymentBackdrop} dir={ar ? "rtl" : "ltr"} onMouseDown={(event) => { if (event.target === event.currentTarget && !busyRef.current) onClose(); }}>
      <section className={styles.paymentDialog} role="dialog" aria-modal="true" aria-labelledby="sos-payment-heading">
        <div className={styles.paymentHeader}>
          <div><span className={styles.paymentEyebrow}>{ar ? "النجدة القانونية" : "Legal SOS"}</span><h2 id="sos-payment-heading">{ar ? "الدفع الآمن" : "Secure payment"}</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label={ar ? "إغلاق" : "Close"} className={styles.paymentClose}>×</button>
        </div>
        <div className={styles.paymentBody}>
          <div className={styles.paymentSummary}><span>{ar ? "قيمة الطلب" : "Request amount"}</span><strong dir="ltr">{Number(amount).toFixed(3)} BHD</strong></div>
          {config?.mode === "test" && <p className={styles.paymentTest}>{ar ? "الدفع في وضع التجربة. لا تستخدم بطاقة حقيقية." : "Test mode. Do not use a real card."}</p>}
          <p className={styles.paymentHint}>{ar ? "أدخل رقم البطاقة وتاريخها ورمز الأمان واسم صاحب البطاقة في نموذج Tap الآمن، من دون مغادرة الموقع." : "Enter the card number, expiry, security code, and cardholder name in Tap's secure form without leaving the site."}</p>
          <Script id="sos-tap-card-sdk" src="https://tap-sdks.b-cdn.net/card/1.0.2/index.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setError(cardError(ar))} />
          <div id={cardId} className={styles.paymentCard} dir="ltr" />
          {error && <p className={styles.paymentError} role="alert">{error}</p>}
          <button type="button" className={styles.paymentPay} disabled={!ready || busy || !config || timedOut || chargeSubmitted} onClick={pay}>
            {busy ? (ar ? "جارٍ تأكيد الدفع..." : "Confirming payment...") : (ar ? "ادفع الآن" : "Pay now")}
          </button>
          <p className={styles.paymentFooter}>{ar ? "قد يطلب البنك تحققًا إضافيًا ثم يعيدك إلى متابعة الطلب." : "Your bank may ask for additional verification before returning you to your request."}</p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
