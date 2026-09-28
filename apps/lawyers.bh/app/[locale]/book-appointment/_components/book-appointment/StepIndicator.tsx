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
import { useBooking } from "./BookingContext";

export default function StepIndicator() {
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
    isLawyerAuthorizationBooking,
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
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {visibleStepNumbers.map((s, index) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => {
  if (s >= step) return;

  // إذا رجع من معلوماتك إلى اختيار الموعد
  if (s <= 2) {
    setSelectedTime(null);
    setSelectedLawyerId(null);
    setLawyerSelectionMode(null);
  }

  // إذا رجع إلى اختيار الخدمة
  if (s === 1) {
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedLawyerId(null);
    setLawyerSelectionMode(null);
  }

  // إذا رجع من معلوماتك إلى اختيار المحامي
  if (s === 3) {
    setSelectedLawyerId(null);
  }

  setStep(s);
}}
                className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors ${
                  s === step ? "bg-primary text-white" : s < step ? "bg-primary/10 text-primary cursor-pointer" : "bg-gray-100 text-text-muted"
                }`}
              >
                {s < step ? (
                  <Check size={14} />
                ) : isLawyerAuthorizationBooking ? (
                  s === 3 ? 2 : s === 4 ? 3 : s
                ) : isDirectLawyerBooking && s === 4 ? (
                  3
                ) : (
                  s
                )}
              </button>
              {index < visibleStepNumbers.length - 1 && (
                <div className={`w-8 sm:w-14 h-0.5 ${s < step ? "bg-primary/30" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
          <span className="text-sm text-text-muted ms-2">
            {step === 1 && (isLawyerAuthorizationBooking ? (isAr ? "اختر نوع القضية" : "Select Case Type") : (isAr ? "اختر الخدمة" : "Select Service"))}
{step === 2 && (isAr ? "اختر الموعد" : "Pick Date & Time")}
{step === 3 && (isAr ? "اختر المكتب أو المحامي" : "Choose Office or Lawyer")}
{step === 4 && (isAr ? "معلوماتك" : "Your Details")}
          </span>
        </div>


    </>
  );
}
