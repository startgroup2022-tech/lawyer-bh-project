"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Siren } from "lucide-react";
import SosCaseTypeChips from "@/components/SosCaseTypeChips";
import SosConsentBlock from "@/components/SosConsentBlock";
import SosKycForm, {
  type SosKycValue,
} from "@/components/SosKycForm";
import SosSignaturePad from "@/components/SosSignaturePad";
import {
  getCaseTypeBySlug,
  type SosCaseSlug,
} from "@/lib/sos/caseTypes";
import { saveSosPaymentDraft } from "../payment/paymentDraft";

function formatBhdAmount(
  amount: number,
  isAr: boolean,
): string {
  const safeAmount = Number.isFinite(amount)
    ? amount
    : 0;

  const formattedAmount = new Intl.NumberFormat(
    isAr ? "ar-BH" : "en-BH",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    },
  ).format(safeAmount);

  return isAr
    ? `${formattedAmount} دينار`
    : `${formattedAmount} BHD`;
}

function normalizeBahrainPhone(value: string): string {
  let phone = value.replace(/\D/g, "");

  if (phone.startsWith("00973")) {
    phone = phone.slice(5);
  } else if (phone.startsWith("973")) {
    phone = phone.slice(3);
  }

  return phone;
}

export default function SosContent() {
  const t = useTranslations("sos");
  const locale = useLocale();

  const isAr = locale
    .toLowerCase()
    .startsWith("ar");

  const lang: "ar" | "en" = isAr
    ? "ar"
    : "en";

  const router = useRouter();

  const [caseType, setCaseType] =
    useState<SosCaseSlug | null>(null);

  const [kyc, setKyc] = useState<SosKycValue>({
    fullName: "",
    idType: "cpr",
    idNumber: "",
    phone: "",
    description: "",
    location: null,
    manualAddress: "",
  });

  const [signature, setSignature] =
    useState<string | null>(null);

  const [agreeRead, setAgreeRead] =
    useState(false);

  const [agreeSign, setAgreeSign] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const selectedCase = caseType
    ? getCaseTypeBySlug(caseType)
    : null;

  const selectedAmount = selectedCase
    ? Number(selectedCase.baseFeeBhd)
    : 0;

  const hasValidAmount =
    Number.isFinite(selectedAmount) &&
    selectedAmount > 0;

  function validate(): string | null {
    const normalizedPhone =
      normalizeBahrainPhone(kyc.phone);

    if (
      !caseType ||
      !selectedCase ||
      !hasValidAmount
    ) {
      return t("errors.missingFields");
    }

    if (
      !kyc.fullName.trim() ||
      !kyc.idNumber.trim() ||
      !normalizedPhone
    ) {
      return t("errors.missingFields");
    }

    if (!/^\d{8}$/.test(normalizedPhone)) {
      return isAr
        ? "يرجى إدخال رقم هاتف بحريني صحيح من 8 أرقام."
        : "Please enter a valid 8-digit Bahrain phone number.";
    }

    if (!agreeRead || !agreeSign) {
      return t("errors.missingConsent");
    }

    if (!signature) {
      return t("errors.missingSignature");
    }

    return null;
  }

  function submit(): void {
    if (submitting) {
      return;
    }

    const validationError = validate();

    if (
      validationError ||
      !caseType ||
      !selectedCase ||
      !signature ||
      !hasValidAmount
    ) {
      setError(
        validationError ??
          t("errors.missingFields"),
      );

      return;
    }

    setError(null);
    setSubmitting(true);

    const now = new Date().toISOString();

    const phone = normalizeBahrainPhone(
      kyc.phone,
    );

    const fullName = kyc.fullName.trim();
    const idNumber = kyc.idNumber.trim();

    const description =
      kyc.description.trim() || undefined;

    const manualAddress =
      kyc.manualAddress.trim() || undefined;

    const currentPriceLabel =
      formatBhdAmount(selectedAmount, isAr);

    try {
      const sosPayload = {
        countryCode: "BH",
        locale: lang,
        caseType,
        fullName,
        idType: kyc.idType,
        idNumber,
        phone,
        description,
        location:
          kyc.location ?? undefined,
        manualAddress,
        signatureDataUrl: signature,
        agreedAtClient: now,
      };

      saveSosPaymentDraft({
        createdAt: now,
        lang,

        service: isAr
          ? `طلب طوارئ قانوني - ${selectedCase.label.ar}`
          : `Legal SOS - ${selectedCase.label.en}`,

        caseType,
        idType: kyc.idType,
        idNumber,
        description,
        manualAddress,
        signatureDataUrl: signature,

        amountBD: selectedAmount,
        currentPriceLabel,

        name: fullName,
        phone,
        email: "",

        payload: sosPayload,
      });

      router.push(`/${lang}/payment`);
    } catch (caughtError) {
      console.error(
        "[sos] Could not prepare payment draft",
        caughtError,
      );

      setError(t("errors.submitFailed"));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-br from-[#D32F2F] via-[#B71C1C] to-[#1A237E] text-white">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Siren size={12} />
            {t("available")}
          </p>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
            {t("heroTitle")}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {t("heroSubtitle")}
          </p>

          <p className="mt-3 text-[11px] uppercase tracking-wider text-white/70">
            {t("tagline")}
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-4 max-w-3xl space-y-6 px-5">
        <motion.section
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <SosCaseTypeChips
            selected={caseType}
            onSelect={(nextCaseType) => {
              setCaseType(nextCaseType);
              setError(null);
            }}
          />
        </motion.section>

        {caseType && (
          <motion.section
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            <SosKycForm
              value={kyc}
              onChange={(nextValue) => {
                setKyc(nextValue);
                setError(null);
              }}
            />
          </motion.section>
        )}

        {caseType && (
          <motion.section
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            <h2 className="mb-1 text-[15px] font-extrabold text-text-primary">
              {t("consentSection.title")}
            </h2>

            <p className="mb-3 text-[12px] text-text-muted">
              {t("consentSection.subtitle")}
            </p>

            {selectedCase &&
              hasValidAmount && (
                <div className="mb-4 rounded-xl border border-[#1A237E]/20 bg-[#1A237E]/[0.04] p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      {t("feeBanner.label")}
                    </span>

                    <span className="text-[15px] font-extrabold text-[#1A237E]">
                      {formatBhdAmount(
                        selectedAmount,
                        isAr,
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] leading-snug text-text-muted">
                    {t("feeBanner.note")}
                  </p>
                </div>
              )}

            <SosConsentBlock />

            <div className="mt-4 space-y-2.5">
              <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-text-primary">
                <input
                  type="checkbox"
                  checked={agreeRead}
                  onChange={(event) => {
                    setAgreeRead(
                      event.target.checked,
                    );

                    setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 accent-[#D32F2F]"
                />

                <span>
                  {t(
                    "consentSection.checkboxRead",
                  )}
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-text-primary">
                <input
                  type="checkbox"
                  checked={agreeSign}
                  onChange={(event) => {
                    setAgreeSign(
                      event.target.checked,
                    );

                    setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 accent-[#D32F2F]"
                />

                <span>
                  {t(
                    "consentSection.checkboxSignature",
                  )}
                </span>
              </label>
            </div>

            <div className="mt-4">
              <SosSignaturePad
                value={signature}
                onChange={(nextSignature) => {
                  setSignature(nextSignature);
                  setError(null);
                }}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-[#D32F2F]/30 bg-[#D32F2F]/[0.06] p-3 text-[12px] text-[#D32F2F]"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={
                submitting ||
                !selectedCase ||
                !hasValidAmount
              }
              aria-busy={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D32F2F] py-3.5 text-[14px] font-extrabold text-white shadow-md transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  {isAr
                    ? "جاري تجهيز الدفع..."
                    : "Preparing payment..."}
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />

                  {isAr
                    ? "الانتقال إلى الدفع"
                    : "Continue to payment"}
                </>
              )}
            </button>

            <p className="mt-2 text-center text-[10px] text-text-muted">
              {isAr
                ? "هذه موافقة قانونية ملزمة وفق قانون المعاملات الإلكترونية."
                : "This is a binding electronic consent under Bahrain TES Law."}
            </p>
          </motion.section>
        )}
      </div>
    </div>
  );
}