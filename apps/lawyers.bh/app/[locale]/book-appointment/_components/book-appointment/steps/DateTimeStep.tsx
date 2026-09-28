"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  Video,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowLeft,
  CreditCard,
  Plus,
  Search,
  Minus,
  BriefcaseBusiness,
  Home,
  UsersRound,
  ShieldAlert,
  Landmark,
  CarFront,
  Stethoscope,
  ScrollText,
  Scale,
  Store,
  Fingerprint,
  Building2,
  Gavel,
  BotMessageSquare,
  Star,
} from "lucide-react";
import type { SubSection } from "@/lib/serviceOptions";
import { useBooking } from "../BookingContext";

export default function DateTimeStep() {
  const {
    step,
    setStep,
    isAr,
    service,
    setService,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    selectedTimeLabel,
    selectedLawyerId,
    setSelectedLawyerId,
    selectedLawyer,
    selectedBookingLawyer,
    selectedSpecialtyKey,
    setSelectedSpecialtyKey,
    activeSpecialtyKey,
    activeSpecialtyLabel,
    cardKey,
    setCardKey,
    openSection,
    setOpenSection,
    consultType,
    setConsultType,
    consultMethods,
    visibleConsultMethods,
    shouldShowConsultMethods,
    hasChosenConsultMethod,
    isVirtualGuidanceSelected,
    isVideo,
    videoProviders,
    videoProvider,
    setVideoProvider,
    currentMethodLabel,
    currentDuration,
    currentPriceLabel,
    visibleStepNumbers,
    isDirectLawyerBooking,
    isBusinessBooking,
    profileLawyer,
    allowedBookingDateOptions,
    visibleTimePeriods,
    lawyerSelectionMode,
    setLawyerSelectionMode,
    lawyerNameFilter,
    setLawyerNameFilter,
    lawyerRegistrationLevel,
    setLawyerRegistrationLevel,
    lawyerSort,
    setLawyerSort,
    availableLawyers,
    lawyersLoading,
    lawyersError,
    filteredSortedLawyers,
    selectProfessionalOffice,
    getProviderDisplayName,
    professionalOfficeName,
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    message,
    setMessage,
    termsAccepted,
    setTermsAccepted,
    normalizePhoneInput,
    serviceOptionsByKey,
    getOptionLabel,
    getSectionTitle,
    getSectionDescription,
    inferSpecialtyFromServiceLabel,
    practiceAreaIconMap,
    displayedServices,
    formatPrice,
    handleVirtualGuidanceNext,
    selectServiceAndGoNext,
  } = useBooking();

  return (
    <>
          {/* Step 2: Date & Time */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar */}
               {/* Date options */}
<div>
  <h2 className="font-bold text-text-primary mb-3 flex items-center gap-2">
    <Calendar className="w-5 h-5 text-primary" />
    {isAr ? "اختر التاريخ" : "Select Date"}
  </h2>

  <div className="grid grid-cols-1 gap-2">
    {allowedBookingDateOptions.map((option) => {
      const selected = selectedDate === option.value;
      const isSpecialBadge =
        option.badge === "اليوم" ||
        option.badge === "Today" ||
        option.badge === "بكرة" ||
        option.badge === "Tomorrow";

      return (
        <button
          key={option.value}
          type="button"
          onClick={() => {
  setSelectedDate(option.value);
  setSelectedTime(null);
  setSelectedLawyerId(null);
  setLawyerSelectionMode(null);
}}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition-all ${
            selected
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white border-gray-200 text-text-secondary hover:border-primary/30 hover:bg-primary/[0.03]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-extrabold">
              {option.dayLabel}
            </span>

            {isSpecialBadge && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  selected
                    ? "bg-white/15 text-white"
                    : "bg-primary/[0.07] text-primary"
                }`}
              >
                {option.badge}
              </span>
            )}
          </div>

          <div
            className={`shrink-0 text-xs font-semibold ${
              selected ? "text-white/80" : "text-text-muted"
            }`}
          >
            {option.dateLabel}
          </div>
        </button>
      );
    })}
  </div>
</div>

                {/* Time slots */}
                <div>
                  <h2 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    {isAr ? "اختر الوقت" : "Select Time"}
                  </h2>
                {selectedDate ? (
  <div className="grid grid-cols-1 gap-2">
    {visibleTimePeriods.map((period) => {
      const selected = selectedTime === period.value;

      return (
        <button
          key={period.value}
          type="button"
          onClick={() => {
  setSelectedTime(period.value);

  if (isDirectLawyerBooking) {
    setSelectedLawyerId(profileLawyer?.id ?? selectedLawyerId);
    setLawyerSelectionMode("lawyer");
  } else if (isBusinessBooking) {
    setSelectedLawyerId(null);
    setLawyerSelectionMode("office");
  } else {
    setSelectedLawyerId(null);
    setLawyerSelectionMode(null);
  }

  window.setTimeout(() => {
    if (isDirectLawyerBooking || isBusinessBooking) {
      setStep(4); // يتخطى اختيار المحامي / المكتب عند الخدمات التي تختار المكتب تلقائياً
      return;
    }

    setStep(3); // الحجز العادي يروح لاختيار المحامي
  }, 120);
}}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition-all ${
            selected
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white border-gray-200 text-text-secondary hover:border-primary/30 hover:bg-primary/[0.03]"
          }`}
        >
          <div
            className={`font-extrabold ${
              isDirectLawyerBooking ? "text-sm" : "text-sm"
            }`}
          >
            {isDirectLawyerBooking
              ? isAr
                ? period.range.ar
                : period.range.en
              : isAr
                ? period.label.ar
                : period.label.en}
          </div>

          {!isDirectLawyerBooking && (
            <div
              className={`text-xs font-semibold ${
                selected ? "text-white/80" : "text-text-muted"
              }`}
            >
              {isAr ? period.range.ar : period.range.en}
            </div>
          )}
        </button>
      );
    })}
  </div>
) : (
<div className="flex w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-text-muted">
  {isAr ? "اختر تاريخاً أولاً" : "Select a date first"}
</div>
)}
                </div>
              </div>
            </motion.div>
          )}

    </>
  );
}
