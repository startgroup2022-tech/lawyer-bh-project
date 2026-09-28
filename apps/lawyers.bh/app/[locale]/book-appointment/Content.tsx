"use client";

import { AnimatePresence } from "framer-motion";
import type {
  Dispatch,
  SetStateAction,
} from "react";
import { BookingProvider } from "./_components/book-appointment/BookingContext";
import BookingHeader from "./_components/book-appointment/BookingHeader";
import BookingNavigation from "./_components/book-appointment/BookingNavigation";
import DateTimeStep from "./_components/book-appointment/steps/DateTimeStep";
import AssignmentStep from "./_components/book-appointment/steps/AssignmentStep";
import ContactDetailsStep from "./_components/book-appointment/steps/ContactDetailsStep";
import ServiceStep from "./_components/book-appointment/steps/ServiceStep";
import StepIndicator from "./_components/book-appointment/StepIndicator";
import SubmitError from "./_components/book-appointment/SubmitError";
import SubmittedSuccess from "./_components/book-appointment/SubmittedSuccess";
import type { LawyerSelectionMode } from "./_components/book-appointment/types";
import { useBookAppointmentState } from "./_components/book-appointment/useBookAppointmentState";

type ProviderKind =
  | "lawyer"
  | "private_executor"
  | "private_notary";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

function getProviderKind(
  cardKey: string | null,
  service: string,
): ProviderKind {
  const normalizedCardKey = normalizeText(cardKey);
  const normalizedService = normalizeText(service);

  if (
    normalizedCardKey === "execution" ||
    normalizedService.includes("private_execution") ||
    normalizedService.includes("execution") ||
    normalizedService.includes("التنفيذ") ||
    normalizedService.includes("منفذ")
  ) {
    return "private_executor";
  }

  if (
    normalizedCardKey === "notary" ||
    normalizedService.includes("notary") ||
    normalizedService.includes("توثيق") ||
    normalizedService.includes("موثق") ||
    normalizedService.includes("كاتب_العدل")
  ) {
    return "private_notary";
  }

  return "lawyer";
}

function getProviderKindSingleLabel(
  kind: ProviderKind,
  isAr: boolean,
) {
  const labels: Record<
    ProviderKind,
    {
      ar: string;
      en: string;
    }
  > = {
    lawyer: {
      ar: "المحامي",
      en: "lawyer",
    },

    private_executor: {
      ar: "المنفذ الخاص",
      en: "private executor",
    },

    private_notary: {
      ar: "الموثق الخاص",
      en: "private notary",
    },
  };

  return labels[kind][isAr ? "ar" : "en"];
}

function getBlockedSelectionMessage({
  kind,
  isAr,
}: {
  kind: ProviderKind;
  isAr: boolean;
}) {
  const singleLabel = getProviderKindSingleLabel(
    kind,
    isAr,
  );

  if (isAr) {
    return `اختيار ${singleLabel} محدد تحت التحديث حالياً. يرجى اختيار مكاتبنا لإرسال الطلب، وسيتم تعيين المختص المناسب لمتابعته.`;
  }

  return `Direct ${singleLabel} selection is currently under update. Please choose our offices and the suitable specialist will be assigned to your request.`;
}

function ProviderSelectionLockedNotice({
  isAr,
  kind,
}: {
  isAr: boolean;
  kind: ProviderKind;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm font-bold leading-7 text-text-secondary">
      {getBlockedSelectionMessage({
        kind,
        isAr,
      })}
    </div>
  );
}

export default function BookAppointmentPage() {
  const booking = useBookAppointmentState();

  const providerKind = getProviderKind(
    booking.cardKey,
    booking.service,
  );

  const directProviderSelectionLocked =
    !booking.isDirectLawyerBooking;

const guardedSetLawyerSelectionMode: Dispatch<
  SetStateAction<LawyerSelectionMode | null>
> = (value) => {
  if (directProviderSelectionLocked) {
    booking.setSelectedLawyerId(null);
  }

  booking.setLawyerSelectionMode((previousMode) => {
    const nextMode =
      typeof value === "function"
        ? value(previousMode)
        : value;

    if (
      nextMode === "lawyer" &&
      directProviderSelectionLocked
    ) {
      return null;
    }

    return nextMode;
  });
};

  const guardedBooking: ReturnType<
    typeof useBookAppointmentState
  > = {
    ...booking,

    /*
     * في حال كانت القيمة القديمة lawyer،
     * نخفيها من المكونات عندما يكون الاختيار مقفلاً.
     */
    lawyerSelectionMode:
      directProviderSelectionLocked &&
      booking.lawyerSelectionMode === "lawyer"
        ? null
        : booking.lawyerSelectionMode,

    setLawyerSelectionMode:
      guardedSetLawyerSelectionMode,

    selectedLawyerId:
      directProviderSelectionLocked
        ? null
        : booking.selectedLawyerId,

    selectedLawyer:
      directProviderSelectionLocked
        ? null
        : booking.selectedLawyer,

    selectedBookingLawyer:
      directProviderSelectionLocked
        ? null
        : booking.selectedBookingLawyer,

    canProceed: (step: number) => {
      if (
        directProviderSelectionLocked &&
        booking.lawyerSelectionMode === "lawyer"
      ) {
        return false;
      }

      return booking.canProceed(step);
    },
  };

  if (booking.submitted) {
    return <SubmittedSuccess {...booking} />;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-bg-light">
      <BookingHeader
        isAr={booking.isAr}
        service={booking.service}
        serviceKey={booking.queryServiceKey}
        cardKey={booking.cardKey}
        isLawyerAuthorizationBooking={
          booking.isLawyerAuthorizationBooking
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <BookingProvider value={guardedBooking}>
          <StepIndicator />

          {booking.step === 3 &&
            directProviderSelectionLocked && (
              <ProviderSelectionLockedNotice
                isAr={booking.isAr}
                kind={providerKind}
              />
            )}

          <AnimatePresence mode="wait">
            {booking.step === 1 && (
              <ServiceStep key="step1" />
            )}

            {booking.step === 2 && (
              <DateTimeStep key="step2" />
            )}

            {booking.step === 3 && (
              <AssignmentStep key="step3" />
            )}

            {booking.step === 4 && (
              <ContactDetailsStep key="step4" />
            )}
          </AnimatePresence>
        </BookingProvider>

        <BookingNavigation
          step={guardedBooking.step}
          isAr={guardedBooking.isAr}
          submitting={guardedBooking.submitting}
          currentPriceLabel={
            guardedBooking.currentPriceLabel
          }
          shouldOpenAssistantButton={
            guardedBooking.shouldOpenAssistantButton
          }
          canProceed={guardedBooking.canProceed}
          goToPreviousStep={
            guardedBooking.goToPreviousStep
          }
          goToNextStep={
            guardedBooking.goToNextStep
          }
          handleSubmit={
            guardedBooking.goToPaymentPage
          }
        />

        <SubmitError
          step={guardedBooking.step}
          isAr={guardedBooking.isAr}
          submitError={guardedBooking.submitError}
        />
      </div>
    </div>
  );
}