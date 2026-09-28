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

export default function ContactDetailsStep() {
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
        {/* Step 4: Contact Details */}
{step === 4 && (
  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {/* Summary */}
              <div className="bg-bg-light rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-sm">
  <span className="text-text-muted">
    {isAr ? "الخدمة:" : "Service:"}{" "}
    <strong className="text-text-primary">{service}</strong>
  </span>
{lawyerSelectionMode && (
  <span className="text-text-muted">
    {isAr ? "طريقة التعيين:" : "Assignment:"}{" "}
    <strong className="text-text-primary">
      {lawyerSelectionMode === "office"
  ? isAr
    ? "اختيار مكتب"
    : "Choose Office"
  : isAr
    ? "اختيار محامي محدد"
    : "Specific Lawyer"}
    </strong>
  </span>
)}
  {lawyerSelectionMode === "office" && (
  <span className="text-text-muted">
    {isAr ? "المكتب:" : "Office:"}{" "}
    <strong className="text-text-primary">{isAr ? "المكتب الرئيسي" : "Head Office"}</strong>
  </span>
)}

{lawyerSelectionMode === "lawyer" && selectedLawyer && (
  <span className="text-text-muted">
    {isAr ? "المحامي:" : "Lawyer:"}{" "}
    <strong className="text-text-primary">
      {isAr ? selectedLawyer.nameAr : selectedLawyer.nameEn}
    </strong>
  </span>
)}

  {!isLawyerAuthorizationBooking && (
    <>
      <span className="text-text-muted">
        {isAr ? "التاريخ:" : "Date:"}{" "}
        <strong className="text-text-primary">{selectedDate}</strong>
      </span>

      <span className="text-text-muted">
        {isAr ? "الوقت:" : "Time:"}{" "}
        <strong className="text-text-primary">{selectedTimeLabel}</strong>
      </span>
    </>
  )}

  <span className="text-text-muted">
    {isAr ? "آلية التواصل:" : "Contact Method:"}{" "}
    <strong className="text-primary">
      {isLawyerAuthorizationBooking
        ? isAr
          ? "سيتواصل معك المحامي المناسب"
          : "A suitable lawyer will contact you"
        : `${currentMethodLabel} — ${currentDuration.minutes} ${isAr ? "دقيقة" : "min"} (${currentPriceLabel})`}
    </strong>
  </span>

  {isLawyerAuthorizationBooking && (
    <span className="text-text-muted">
      {isAr ? "الرسوم:" : "Fee:"}{" "}
      <strong className="text-primary">{currentPriceLabel}</strong>
    </span>
  )}
                {isVideo && (
                  <span className="text-text-muted">
                    {isAr ? "المنصة:" : "Platform:"}{" "}
                    <strong className="text-text-primary">
                      {videoProviders.find((p) => p.value === videoProvider)?.label[isAr ? "ar" : "en"]}
                    </strong>
                  </span>
                )}
              </div>

              {isLawyerAuthorizationBooking && (
                <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm font-bold leading-7 text-text-secondary">
                  {isAr
                    ? "بعد إتمام الدفع سيتم إرسال طلبك لمكاتبنا، وسيتم تعيين المحامي المناسب للتواصل معك ومتابعة إجراءات التوكيل."
                    : "After payment, your request will be sent to our offices, and a suitable lawyer will be assigned to contact you and follow up on the authorization process."}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-1.5">
                    <User size={14} /> {isAr ? "الاسم الكامل" : "Full Name"}
                  </label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary" placeholder={isAr ? "أدخل اسمك" : "Enter your name"} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-1.5">
                      <Phone size={14} /> {isAr ? "رقم الهاتف" : "Phone Number"}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                      inputMode="tel"
                      autoComplete="tel"
                      lang="en"
                      dir="ltr"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-left text-sm focus:outline-none focus:border-primary"
                      placeholder="+966"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-1.5">
                      <Mail size={14} /> {isAr ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary" placeholder={isAr ? "email@example.com" : "email@example.com"} />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-1.5">
                    <MessageSquare size={14} /> {isAr ? "رسالة (اختياري)" : "Message (optional)"}
                  </label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary resize-none" placeholder={isAr ? "اشرح حالتك باختصار..." : "Briefly describe your case..."} />
                </div>

                {/* Payment summary */}
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary">
                        {isAr ? "المجموع المستحق" : "Amount Due"}
                      </div>
                      <div className="text-xs text-text-muted">
                        {currentDuration.minutes} {isAr ? "دقيقة" : "min"} · {currentMethodLabel}
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-extrabold text-primary">{currentPriceLabel}</div>
                </div>

                {/* Terms acceptance */}
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="accent-primary mt-1"
                  />
                  <span className="text-sm text-text-secondary leading-relaxed">
                    {isAr ? (
                      <>
                        أوافق على{' '}
                        <Link href="/terms" className="text-primary underline">
                          الشروط والأحكام
                        </Link>{' '}
                        وسياسة الاسترداد لمنصة محامون السعودية.
                      </>
                    ) : (
                      <>
                        I agree to the{' '}
                        <Link href="/terms" className="text-primary underline">
                          Terms & Conditions
                        </Link>{' '}
                        and the Refund Policy of the Lawyers.bh platform.
                      </>
                    )}
                  </span>
                </label>
              </div>
            </motion.div>
          )}

    </>
  );
}
