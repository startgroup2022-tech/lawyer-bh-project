"use client";

import Script from "next/script";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type TapLocaleValue = "ar" | "en";
type TapDirectionValue = "rtl" | "ltr";
type TapThemeValue = "light" | "dark";
type TapEdgesValue = "curved" | "straight";
type TapCurrencyValue = "SAR" | "SAR" | "AED" | "KWD" | "QAR" | "OMR" | "USD";

type TapTokenResponse = {
  id?: string;
  status?: string;
  card?: {
    brand?: string;
    last_four?: string;
  };
  payment?: {
    card_data?: {
      last_four?: string;
    };
  };
};

type TapCardRenderResult = {
  unmount?: () => void;
};

type TapCardSdk = {
  renderTapCard: (
    elementId: string,
    config: Record<string, unknown>,
  ) => TapCardRenderResult | void;
  tokenize: () => void | Promise<unknown>;
  Theme?: Record<string, TapThemeValue>;
  Currencies?: Record<string, TapCurrencyValue>;
  Direction?: Record<string, TapDirectionValue>;
  Edges?: Record<string, TapEdgesValue>;
  Locale?: Record<string, TapLocaleValue>;
};

declare global {
  interface Window {
    CardSDK?: TapCardSdk;
  }
}

type Props = {
  isAr: boolean;
  amount: number;
  currentPriceLabel: string;
  name: string;
  email: string;
  phone: string;
  disabled: boolean;
  submitting: boolean;
  onTokenGenerated: (tokenId: string) => Promise<void> | void;
};

const TAP_CARD_SCRIPT_SRC = "https://tap-sdks.b-cdn.net/card/1.0.2/index.js";
const CARD_CURRENCY: TapCurrencyValue = "SAR";
const TOKENIZE_TIMEOUT_MS = 20000;

function getTapPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("966") && digits.length > 3) {
    return {
      countryCode: "+966",
      number: digits.slice(3),
    };
  }

  return {
    countryCode: "+966",
    number: digits || "00000000",
  };
}

function getSafeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0.1;
  return Number(amount.toFixed(2));
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "then" in value &&
      typeof (value as { then?: unknown }).then === "function",
  );
}

export default function TapCardPayment({
  isAr,
  amount,
  currentPriceLabel,
  email,
  phone,
  disabled,
  submitting,
  onTokenGenerated,
}: Props) {
  const reactId = useId();
  const cardContainerId = `tap-card-sdk-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const unmountRef = useRef<(() => void) | null>(null);
  const onTokenGeneratedRef = useRef(onTokenGenerated);
  const tokenizingRef = useRef(false);
  const tokenizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [cardReadyKey, setCardReadyKey] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_TAP_PUBLIC_KEY ?? "";
  const merchantId = process.env.NEXT_PUBLIC_TAP_MERCHANT_ID ?? "";
  const hasTapConfig = Boolean(publicKey && merchantId);

  const safeAmount = getSafeAmount(amount);

  const cardConfigKey = useMemo(
    () =>
      [
        cardContainerId,
        isAr ? "ar" : "en",
        safeAmount,
        email.trim(),
        phone.trim(),
        publicKey,
        merchantId,
      ].join("|"),
    [cardContainerId, email, isAr, merchantId, phone, publicKey, safeAmount],
  );

  const cardReady = cardReadyKey === cardConfigKey;

  const clearTokenizeTimeout = useCallback(() => {
    if (tokenizeTimeoutRef.current) {
      clearTimeout(tokenizeTimeoutRef.current);
      tokenizeTimeoutRef.current = null;
    }
  }, []);

  const setTokenizingState = useCallback((value: boolean) => {
    tokenizingRef.current = value;
    setTokenizing(value);
  }, []);

  const stopTokenizing = useCallback(() => {
    clearTokenizeTimeout();
    setTokenizingState(false);
  }, [clearTokenizeTimeout, setTokenizingState]);

  const startTokenizeTimeout = useCallback(() => {
    clearTokenizeTimeout();

    tokenizeTimeoutRef.current = setTimeout(() => {
      setTokenizingState(false);
      setError(
        isAr
          ? "استغرق التحقق من البطاقة وقتًا أطول من المتوقع. تأكد من بيانات البطاقة وحاول مرة أخرى."
          : "Card verification took longer than expected. Please check the card details and try again.",
      );
    }, TOKENIZE_TIMEOUT_MS);
  }, [clearTokenizeTimeout, isAr, setTokenizingState]);

  useEffect(() => {
    onTokenGeneratedRef.current = onTokenGenerated;
  }, [onTokenGenerated]);

  useEffect(() => {
    return () => {
      clearTokenizeTimeout();
    };
  }, [clearTokenizeTimeout]);

  useEffect(() => {
    if (!scriptReady || !hasTapConfig || !window.CardSDK?.renderTapCard) {
      return;
    }

    const sdk = window.CardSDK;

    const Locale = sdk.Locale ?? {
      EN: "en" as TapLocaleValue,
      AR: "ar" as TapLocaleValue,
    };

    const Direction = sdk.Direction ?? {
      LTR: "ltr" as TapDirectionValue,
      RTL: "rtl" as TapDirectionValue,
    };

    const Theme = sdk.Theme ?? {
      LIGHT: "light" as TapThemeValue,
    };

    const Edges = sdk.Edges ?? {
      CURVED: "curved" as TapEdgesValue,
    };

    const Currencies = sdk.Currencies ?? {
      SAR: "SAR" as TapCurrencyValue,
    };

    const tapPhone = getTapPhone(phone);

    unmountRef.current?.();
    unmountRef.current = null;

    try {
      const result = sdk.renderTapCard(cardContainerId, {
        publicKey,
        merchant: {
          id: merchantId,
        },
        transaction: {
          amount: safeAmount,
          currency: Currencies.SAR ?? CARD_CURRENCY,
        },
        customer: {
          name: [
            {
              lang: isAr ? Locale.AR : Locale.EN,
              first: "Customer",
              last: "Cardholder",
            },
          ],
          editable: true,
          contact: {
            email: email.trim() || "customer@example.com",
            phone: tapPhone,
          },
        },
        acceptance: {
          supportedBrands: ["VISA", "MASTERCARD"],
          supportedCards: "ALL",
        },
        fields: {
          cardHolder: true,
        },
        addons: {
          displayPaymentBrands: true,
          loader: true,
          saveCard: false,
        },
        interface: {
          locale: isAr ? Locale.AR : Locale.EN,
          theme: Theme.LIGHT,
          edges: Edges.CURVED,
          direction: isAr ? Direction.RTL : Direction.LTR,

        },
        onReady: () => {
          setCardReadyKey(cardConfigKey);
          setError(null);
        },
        onValidInput: () => {
          setError(null);
        },
        onInvalidInput: () => {
          if (tokenizingRef.current) {
            stopTokenizing();
            setError(
              isAr
                ? "بيانات البطاقة غير مكتملة أو غير صحيحة. تأكد من الرقم، تاريخ الانتهاء، رمز CVV، واسم حامل البطاقة."
                : "The card details are incomplete or invalid. Please check the number, expiry date, CVV, and cardholder name.",
            );
          }
        },
        onError: (data: unknown) => {
          console.error("[tap-card-sdk] error", data);
          stopTokenizing();

          const tapError = data as {
            error?: string;
            message?: string;
            statusCode?: number;
            errors?: { code?: string; description?: string }[];
          };

          const tapDescription =
            tapError.errors?.[0]?.description ||
            tapError.message ||
            tapError.error ||
            "";

          if (tapError.statusCode === 503 || tapError.statusCode === 504) {
            setError(
              isAr
                ? "تعذر الاتصال بخدمة Tap حالياً. تأكد من أن Public Key و Merchant ID من نفس بيئة الاختبار، وجرب بطاقة Visa أو MasterCard فقط."
                : "Tap service is currently unavailable or timed out. Make sure the Public Key and Merchant ID are from the same test environment, and try Visa or MasterCard only.",
            );
            return;
          }

          setError(
            tapDescription ||
              (isAr
                ? "تعذر تحميل أو التحقق من بيانات البطاقة. تأكد من البيانات وحاول مرة أخرى."
                : "Could not load or validate the card details. Please check the card and try again."),
          );
        },
        onSuccess: async (data: TapTokenResponse) => {
          const tokenId = data?.id;
          stopTokenizing();

          if (!tokenId) {
            setError(
              isAr
                ? "لم يصل رمز البطاقة من Tap. حاول مرة أخرى."
                : "Tap did not return a card token. Please try again.",
            );
            return;
          }

          try {
            await onTokenGeneratedRef.current(tokenId);
          } catch (err) {
            console.error("[tap-card-sdk] token submit error", err);
            setError(
              isAr
                ? "تم إنشاء رمز البطاقة، لكن تعذر إكمال عملية الدفع. حاول مرة أخرى."
                : "The card token was created, but the payment could not be completed. Please try again.",
            );
          }
        },
      });

      unmountRef.current = result?.unmount ?? null;
    } catch (err) {
      console.error("[tap-card-sdk] render error", err);

      queueMicrotask(() => {
        setError(
          isAr
            ? "تعذر عرض نموذج البطاقة. تحقق من إعدادات Tap وحاول مرة أخرى."
            : "Could not render the card form. Please check your Tap configuration and try again.",
        );
      });
    }

    return () => {
      unmountRef.current?.();
      unmountRef.current = null;
    };
  }, [
    cardConfigKey,
    cardContainerId,
    email,
    hasTapConfig,
    isAr,
    merchantId,
    phone,
    publicKey,
    safeAmount,
    scriptReady,
    stopTokenizing,
  ]);

  const handlePay = useCallback(() => {
    if (!hasTapConfig) {
      setError(
        isAr
          ? "إعدادات Tap غير مكتملة. أضف مفاتيح الدفع في متغيرات البيئة."
          : "Tap configuration is missing. Add the payment keys to the environment variables.",
      );
      return;
    }

    if (!window.CardSDK?.tokenize) {
      setError(
        isAr
          ? "لم يتم تحميل بوابة الدفع بعد. حاول مرة أخرى."
          : "The payment form is not ready yet. Please try again.",
      );
      return;
    }

    if (!cardReady) {
      setError(
        isAr
          ? "نموذج البطاقة لم يجهز بعد. انتظر لحظة ثم حاول مرة أخرى."
          : "The card form is not ready yet. Please wait and try again.",
      );
      return;
    }

    setTokenizingState(true);
    setError(null);
    startTokenizeTimeout();

    try {
      const tokenizeResult = window.CardSDK.tokenize();

      if (isPromiseLike(tokenizeResult)) {
        tokenizeResult.catch((err) => {
          console.error("[tap-card-sdk] tokenize error", err);
          stopTokenizing();
          setError(
            isAr
              ? "تعذر بدء التحقق من البطاقة. تأكد من البيانات وحاول مرة أخرى."
              : "Could not start card verification. Please check the details and try again.",
          );
        });
      }
    } catch (err) {
      console.error("[tap-card-sdk] tokenize exception", err);
      stopTokenizing();
      setError(
        isAr
          ? "تعذر بدء التحقق من البطاقة. تأكد من البيانات وحاول مرة أخرى."
          : "Could not start card verification. Please check the details and try again.",
      );
    }
  }, [
    cardReady,
    hasTapConfig,
    isAr,
    setTokenizingState,
    startTokenizeTimeout,
    stopTokenizing,
  ]);

  const buttonDisabled =
    disabled || submitting || tokenizing || !cardReady || !hasTapConfig;

  return (
    <div className="mt-4 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
      <Script
        id="tap-card-sdk-v2"
        src={TAP_CARD_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => {
          setScriptReady(true);
          setError(null);
        }}
        onError={() => {
          setScriptReady(false);
          setError(
            isAr
              ? "تعذر تحميل Tap Card SDK. تحقق من الاتصال وحاول مرة أخرى."
              : "Could not load Tap Card SDK. Please check your connection and try again.",
          );
        }}
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-extrabold text-text-primary">
            <CreditCard size={18} className="text-primary" />
            {isAr ? "الدفع بالبطاقة" : "Pay by card"}
          </h3>

          <p className="mt-1 text-xs leading-6 text-text-muted">
  {isAr
    ? "أدخل بيانات بطاقتك."
    : "Enter your card details."}
</p>
        </div>

        <div className="shrink-0 rounded-xl bg-primary/[0.06] px-3 py-2 text-sm font-extrabold text-primary">
          {currentPriceLabel}
        </div>
      </div>

      {!hasTapConfig && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-800">
          {isAr
            ? "أضف NEXT_PUBLIC_TAP_PUBLIC_KEY و NEXT_PUBLIC_TAP_MERCHANT_ID في متغيرات البيئة لتفعيل نموذج البطاقة."
            : "Add NEXT_PUBLIC_TAP_PUBLIC_KEY and NEXT_PUBLIC_TAP_MERCHANT_ID to your environment variables to enable the card form."}
        </div>
      )}

      {!scriptReady && hasTapConfig && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-sm font-bold text-primary">
          <Loader2 size={16} className="animate-spin" />
          {isAr ? "جاري تحميل نموذج البطاقة..." : "Loading card form..."}
        </div>
      )}

      <div
        id={cardContainerId}
        dir="ltr"
        className="min-h-[190px] rounded-xl border border-slate-100 bg-slate-50/40 p-2 text-left"
      />

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-7 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
          <ShieldCheck size={16} className="text-primary" />
          {isAr ? "محمي عبر Tap Card SDK V2" : "Secured by Tap Card SDK V2"}
        </div>

        {cardReady && hasTapConfig && (
          <button
            type="button"
            disabled={buttonDisabled}
            onClick={handlePay}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {(submitting || tokenizing) && <Loader2 size={16} className="animate-spin" />}
            {submitting || tokenizing
              ? isAr
                ? "جاري الدفع..."
                : "Processing..."
              : isAr
                ? `ادفع الآن · ${currentPriceLabel}`
                : `Pay Now · ${currentPriceLabel}`}
          </button>
        )}
      </div>
    </div>
  );
}
