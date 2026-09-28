"use client";

import Script from "next/script";
import { Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type TapApplePayTokenResponse = {
  id?: string;
  status?: string;
};

type TapApplePaySdk = {
  render: (config: Record<string, unknown>, elementId: string) => void;
  abortApplePaySession?: () => void;
};

declare global {
  interface Window {
    TapApplepaySDK?: TapApplePaySdk;
  }
}

type Props = {
  isAr: boolean;
  amount: number;
  currencyCode?: "BHD" | "SAR" | "AED" | "KWD" | "QAR" | "OMR" | "USD" | "EUR" | "GBP";
  currentPriceLabel: string;
  name: string;
  email: string;
  phone: string;
  disabled: boolean;
  submitting: boolean;
  onTokenGenerated: (tokenId: string) => Promise<void> | void;
};

const APPLE_PAY_SCRIPT_SRC = "https://tap-sdks.b-cdn.net/apple-pay/build-1.2.0/main.js";
const APPLE_PAY_STYLE_SRC = "https://tap-sdks.b-cdn.net/apple-pay/build-1.2.0/main.css";

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

  return {
    first: parts[0] || "Customer",
    last: parts.length > 1 ? parts.slice(1).join(" ") : "Customer",
  };
}

function getTapPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("973") && digits.length > 3) {
    return {
      countryCode: "+973",
      number: digits.slice(3),
    };
  }

  return {
    countryCode: "+973",
    number: digits || "00000000",
  };
}

function getSafeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "0.100";
  return amount.toFixed(3);
}

export default function TapApplePayPayment({
  isAr,
  amount,
  currencyCode = "BHD",
  currentPriceLabel,
  name,
  email,
  phone,
  disabled,
  submitting,
  onTokenGenerated,
}: Props) {
  const reactId = useId();
  const buttonContainerId = `tap-apple-pay-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const onTokenGeneratedRef = useRef(onTokenGenerated);
  const [scriptReady, setScriptReady] = useState(false);
  const [buttonReady, setButtonReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_TAP_PUBLIC_KEY ?? "";
  const merchantId = process.env.NEXT_PUBLIC_TAP_MERCHANT_ID ?? "";
  const applePayDomain =
    process.env.NEXT_PUBLIC_TAP_APPLE_PAY_DOMAIN ||
    (typeof window !== "undefined" ? window.location.hostname : "");
  const applePayEnvironment =
    process.env.NEXT_PUBLIC_TAP_APPLE_PAY_ENV ||
    (publicKey.startsWith("pk_live_") ? "production" : "development");

  const hasTapConfig = Boolean(publicKey && merchantId && applePayDomain);
  const safeAmount = getSafeAmount(amount);

  const configKey = useMemo(
    () =>
      [
        buttonContainerId,
        isAr ? "ar" : "en",
        safeAmount,
        currencyCode,
        name.trim(),
        email.trim(),
        phone.trim(),
        publicKey,
        merchantId,
        applePayDomain,
        applePayEnvironment,
      ].join("|"),
    [
      applePayDomain,
      applePayEnvironment,
      buttonContainerId,
      email,
      isAr,
      merchantId,
      name,
      phone,
      publicKey,
      safeAmount,
      currencyCode,
    ],
  );

  useEffect(() => {
    onTokenGeneratedRef.current = onTokenGenerated;
  }, [onTokenGenerated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("tap-apple-pay-style")) return;

    const link = document.createElement("link");
    link.id = "tap-apple-pay-style";
    link.rel = "stylesheet";
    link.href = APPLE_PAY_STYLE_SRC;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!scriptReady || !hasTapConfig || !window.TapApplepaySDK?.render) {
      return;
    }

    const container = document.getElementById(buttonContainerId);
    if (container) container.innerHTML = "";

    const { first, last } = splitName(name);
    const tapPhone = getTapPhone(phone);

    try {
      window.TapApplepaySDK.render(
        {
          debug: process.env.NODE_ENV !== "production",
          scope: "TapToken",
          publicKey,
          environment: applePayEnvironment,
          merchant: {
            domain: applePayDomain,
            id: merchantId,
          },
          acceptance: {
            supportedBrands: ["masterCard", "visa"],
          },
          features: {
            supportsCouponCode: false,
          },
          transaction: {
            currency: currencyCode,
            amount: safeAmount,
          },
          customer: {
            name: [
              {
                locale: isAr ? "ar" : "en",
                first,
                last,
              },
            ],
            contact: {
              email: email.trim() || "customer@example.com",
              phone: tapPhone,
            },
          },
          interface: {
            locale: isAr ? "ar" : "en",
            theme: "dark",
            type: "buy",
            edges: "curved",
          },
          onCancel: () => {
            setProcessing(false);
            setError(isAr ? "تم إلغاء Apple Pay." : "Apple Pay was cancelled.");
          },
          onClick: () => {
            setProcessing(true);
            setError(null);
          },
          onReady: () => {
            setButtonReady(true);
            setError(null);
          },
          onError: (applePayError: unknown) => {
            console.error("[tap-apple-pay] error", applePayError);
            setProcessing(false);
            setError(
              isAr
                ? "تعذر تشغيل Apple Pay. تأكد من تفعيل Apple Pay وتسجيل الدومين لدى Tap."
                : "Could not start Apple Pay. Make sure Apple Pay is enabled and the domain is registered with Tap.",
            );
          },
          onSuccess: async (data: TapApplePayTokenResponse) => {
            const tokenId = data?.id;
            setProcessing(false);

            if (!tokenId) {
              setError(
                isAr
                  ? "لم يصل رمز Apple Pay من Tap. حاول مرة أخرى."
                  : "Tap did not return an Apple Pay token. Please try again.",
              );
              return;
            }

            try {
              await onTokenGeneratedRef.current(tokenId);
            } catch (err) {
              console.error("[tap-apple-pay] token submit error", err);
              setError(
                isAr
                  ? "تم إنشاء رمز Apple Pay، لكن تعذر إكمال الدفع. حاول مرة أخرى."
                  : "Apple Pay token was created, but the payment could not be completed. Please try again.",
              );
            }
          },
        },
        buttonContainerId,
      );
    } catch (err) {
      console.error("[tap-apple-pay] render error", err);
      queueMicrotask(() => {
        setError(
          isAr
            ? "تعذر عرض زر Apple Pay. تحقق من إعدادات Tap والدومين."
            : "Could not render Apple Pay. Please check your Tap configuration and domain.",
        );
      });
    }
  }, [
    applePayDomain,
    applePayEnvironment,
    buttonContainerId,
    configKey,
    email,
    hasTapConfig,
    isAr,
    merchantId,
    name,
    phone,
    publicKey,
    safeAmount,
    currencyCode,
    scriptReady,
  ]);

  return (
    <div className="mt-4 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
      <Script
        id="tap-apple-pay-sdk"
        src={APPLE_PAY_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => {
          setScriptReady(true);
          setError(null);
        }}
        onError={() => {
          setScriptReady(false);
          setError(
            isAr
              ? "تعذر تحميل Apple Pay SDK من Tap. تحقق من الاتصال وحاول مرة أخرى."
              : "Could not load Tap Apple Pay SDK. Please check your connection and try again.",
          );
        }}
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-text-primary">
            {isAr ? "الدفع عبر Apple Pay" : "Pay with Apple Pay"}
          </h3>
          <p className="mt-1 text-xs leading-6 text-text-muted">
            {isAr
              ? "سيظهر زر Apple Pay إذا كان الجهاز والمتصفح والدومين مدعومين ومفعلين لدى Tap."
              : "The Apple Pay button appears when the device, browser, and domain are supported and enabled by Tap."}
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-primary/[0.06] px-3 py-2 text-sm font-extrabold text-primary">
          {currentPriceLabel}
        </div>
      </div>

      {!hasTapConfig && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-800">
          {isAr
            ? "أضف مفاتيح Tap و NEXT_PUBLIC_TAP_APPLE_PAY_DOMAIN لتفعيل Apple Pay."
            : "Add Tap keys and NEXT_PUBLIC_TAP_APPLE_PAY_DOMAIN to enable Apple Pay."}
        </div>
      )}

      {!scriptReady && hasTapConfig && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-sm font-bold text-primary">
          <Loader2 size={16} className="animate-spin" />
          {isAr ? "جاري تحميل Apple Pay..." : "Loading Apple Pay..."}
        </div>
      )}

      <div className="rounded-xl bg-slate-50/50 p-3">
        <div id={buttonContainerId} className="min-h-[48px]" />
      </div>

      {buttonReady && (
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-text-muted">
          <ShieldCheck size={16} className="text-primary" />
          {isAr ? "محمي عبر Tap Apple Pay Web SDK" : "Secured by Tap Apple Pay Web SDK"}
        </div>
      )}

      {(submitting || processing) && (
        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-primary">
          <Loader2 size={16} className="animate-spin" />
          {isAr ? "جاري معالجة Apple Pay..." : "Processing Apple Pay..."}
        </div>
      )}

      {disabled && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {isAr ? "يوجد طلب دفع قيد المعالجة." : "A payment request is already processing."}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-7 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
