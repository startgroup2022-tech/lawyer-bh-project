"use client";

import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";

type Props = {
  step: number;
  isAr: boolean;
  submitting: boolean;
  currentPriceLabel: string;
  shouldOpenAssistantButton: boolean;
  canProceed: (step: number) => boolean;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  handleSubmit: () => void;
};

export default function BookingNavigation({
  step,
  isAr,
  submitting,
  currentPriceLabel,
  shouldOpenAssistantButton,
  canProceed,
  goToPreviousStep,
  goToNextStep,
  handleSubmit,
}: Props) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
      {step > 1 ? (
        <button
          onClick={goToPreviousStep}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} className="rtl:rotate-180" />
          {isAr ? "السابق" : "Back"}
        </button>
      ) : (
        <div />
      )}

      {step < 4 ? (
        <button
          disabled={!canProceed(step)}
          onClick={goToNextStep}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {shouldOpenAssistantButton
            ? isAr
              ? "فتح المساعد القانوني"
              : "Open Legal Assistant"
            : isAr
              ? "التالي"
              : "Next"}
          <ChevronRight size={16} className="rtl:rotate-180" />
        </button>
      ) : (
        <button
          disabled={!canProceed(step) || submitting}
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CreditCard size={16} />
          {submitting
            ? isAr
              ? "جاري الإرسال..."
              : "Processing..."
            : isAr
              ? `الانتقال إلى صفحة الدفع · ${currentPriceLabel}`
              : `Go to Payment Page · ${currentPriceLabel}`}
        </button>
      )}
    </div>
  );
}
