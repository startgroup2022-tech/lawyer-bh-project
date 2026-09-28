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

export default function ServiceStep() {
  const {
    step,
    setStep,
    isAr,
    consultationCatalogueLoading,
    consultationCatalogueError,
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
    shouldShowServiceSelection,
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
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {/* Consultation type */}
           {shouldShowConsultMethods && (
                <>
                  <h2 className="font-bold text-text-primary mb-3">
                    {isAr ? "طريقة الاستشارة" : "Consultation Method"}
                  </h2>

                      {consultationCatalogueLoading ? (
                        <div className="mb-6 rounded-xl bg-gray-50 p-6 text-center text-sm text-text-muted">
                          {isAr ? "جاري تحميل أنواع الاستشارة..." : "Loading consultation methods..."}
                        </div>
                      ) : consultationCatalogueError ? (
                        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{consultationCatalogueError}</div>
                      ) : <div
                        className={`grid gap-3 mb-6 ${
                          visibleConsultMethods.length > 1
                            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                            : "grid-cols-1"
                        }`}
                      >
                {visibleConsultMethods.map((t, i) => {
                  const label = isAr ? t.label.ar : t.label.en;
                  const priceLabel = t.note
                    ? (isAr ? t.note.ar : t.note.en)
                    : formatPrice(t.fixedPrice);
                  // The original index inside the unfiltered consultMethods
                  // array — keeps existing handlers (price, video provider,
                  // analytics) keyed off the same value as before.
                  const originalIndex = consultMethods.indexOf(t);

                  const openYourGptChatbot = (retry = 0) => {
  const root = document.getElementById("yourgpt_root");

  const frame = root?.querySelector<HTMLElement>('[role="region"]');
  const button = root?.querySelector<HTMLButtonElement>(".ygpts-widgetBtn");

  const isOpen =
    frame &&
    !frame.classList.contains("hide") &&
    !frame.hasAttribute("inert");

  if (isOpen) return;

  if (button) {
    button.click();
    return;
  }

  // إذا الشات بوت للحين ما تحمل، يعيد المحاولة
                if (retry < 10) {
                  setTimeout(() => openYourGptChatbot(retry + 1), 300);
                }
              };
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          setConsultType(originalIndex);
                          if (!isLawyerAuthorizationBooking) {
                            setService("");
                            setSelectedSpecialtyKey(null);
                            setOpenSection(null);
                          }
                        }}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        consultType === originalIndex
                          ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                          : "border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      <t.icon className={`w-6 h-6 mx-auto mb-2 ${ consultType === originalIndex ? "text-primary" : "text-text-muted"}`} />
                      <div className="text-sm font-semibold text-text-primary">{label}</div>
                      <div className="text-xs text-primary font-bold mt-1">{priceLabel}</div>
                      <div className="text-[11px] text-text-muted font-medium mt-1">
                        {t.fixedMinutes<1 ? '' :isAr ? `${t.fixedMinutes} دقيقة` : `${t.fixedMinutes} min`} 
                      </div>
                    </button>
                    
                  );
                })}
              </div>}

              {/* Video provider picker */}
              {isVideo && (
                <>
                  <h2 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    {isAr ? "منصة مكالمة الفيديو" : "Video Call Platform"}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {videoProviders.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setVideoProvider(p.value)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          videoProvider === p.value
                            ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                            : "border-gray-200 hover:border-primary/30"
                        }`}
                      >
                        <div className="text-sm font-semibold text-text-primary">
                          {isAr ? p.label.ar : p.label.en}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
               )}
                </>
              )}

              {/* Service selection.
                  Sources its options from the same `serviceOptionsByKey`
                  catalogue as the Request Service modal, so the picker
                  matches the list the user saw before landing here. If
                  the URL didn't carry a card slug we fall back to the
                  curated `displayedServices` list. */}
{/* Service selection */}
{hasChosenConsultMethod && !shouldShowServiceSelection && service && (
  <div className="mt-8 rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
      {isAr ? "الخدمة المختارة" : "Selected Service"}
    </p>
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-black tracking-[-0.02em] text-[#07111F]">
          {service}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          {isAr
            ? "سيتم التعامل مع الطلب كاستشارة وحجز موعد لتوكيل محامي."
            : "This request will be handled as a consultation and appointment to appoint a lawyer."}
        </p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
        <Check size={18} />
      </span>
    </div>
  </div>
)}

{hasChosenConsultMethod && shouldShowServiceSelection && (
<div className="mt-8">
  <div className="mb-4 flex items-end justify-between gap-4">
    <div>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
        {isLawyerAuthorizationBooking
          ? isAr
            ? "نوع القضية"
            : "Case Type"
          : isAr
            ? "نوع الخدمة"
            : "Service Type"}
      </p>

      <h2 className="text-xl font-black tracking-[-0.02em] text-[#07111F]">
        {isLawyerAuthorizationBooking
          ? isAr
            ? "اختر نوع القضية"
            : "Select Case Type"
          : isAr
            ? "اختر الخدمة المطلوبة"
            : "Select Required Service"}
      </h2>
    </div>

    <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-bold text-text-muted ring-1 ring-gray-200 sm:inline-flex">
      {isLawyerAuthorizationBooking
        ? isAr
          ? "بعد الاختيار اختر طريقة التعيين"
          : "Choose, then select assignment method"
        : isAr
          ? "اختر للمتابعة"
          : "Choose to continue"}
    </span>
  </div>

  {cardKey && serviceOptionsByKey[cardKey] ? (
   serviceOptionsByKey[cardKey].kind === "flat" ? (
  <div className="space-y-3">
    {(serviceOptionsByKey[cardKey] as {
      kind: "flat";
      options: { en: string; ar?: string }[];
    }).options.map((opt, index) => {
      const label = getOptionLabel(opt, isAr);
      const selected = service === label;

      return (
        <motion.button
          key={label}
          type="button"
          onClick={() =>
            selectServiceAndGoNext(
              label,
              inferSpecialtyFromServiceLabel(label),
            )
          }
          aria-pressed={selected}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.025 }}
          className={`group flex w-full items-start justify-between gap-4 rounded-2xl border bg-white p-4 text-start shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_40px_rgba(7,17,31,0.08)] ${
            selected
              ? "border-primary/40 ring-1 ring-primary/20"
              : "border-gray-200"
          }`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                selected
                  ? "bg-primary text-white shadow-[0_12px_28px_rgba(122,22,22,0.22)]"
                  : "bg-primary/[0.07] text-primary"
              }`}
            >
              <FileText className="h-5 w-5 stroke-[1.9]" />
            </span>

            <div className="min-w-0">
              <h3
                className={`text-sm font-black leading-6 ${
                  selected ? "text-primary" : "text-[#07111F]"
                }`}
              >
                {label}
              </h3>
            </div>
          </div>

          <span
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
              selected
                ? "bg-primary text-white"
                : "bg-gray-100 text-text-muted group-hover:bg-primary group-hover:text-white"
            }`}
          >
            {selected ? (
              <Check size={15} />
            ) : (
              <ChevronRight
                size={15}
                className={`transition-transform ${
                  isAr
                    ? "rotate-180 group-hover:-translate-x-0.5"
                    : "group-hover:translate-x-0.5"
                }`}
              />
            )}
          </span>
        </motion.button>
      );
    })}
  </div>
) : (
      <div className="space-y-3">
        {(serviceOptionsByKey[cardKey] as {
  kind: "sectioned";
  sections: SubSection[];
}).sections.map((section) => {
          const sectionId = section.title.en;
          const title = getSectionTitle(section, isAr);
          const description = getSectionDescription(section, isAr);
          const isOpen = openSection === sectionId;

          const selectedTitle = service === title;

          const hasSelectedInside = section.options.some((opt) => {
            const label = getOptionLabel(opt, isAr);
            return service === label;
          });

          const active = selectedTitle || hasSelectedInside;
          const SectionIcon = section.icon
            ? practiceAreaIconMap[section.icon] ?? FileText
            : FileText;

          return (
            <div
              key={sectionId}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
                active
                  ? "border-primary/40 ring-1 ring-primary/20"
                  : "border-gray-200 hover:border-primary/25"
              }`}
            >
              {/* Main title: radio + icon + accordion */}
              <button
                type="button"
                onClick={() => {
                  setService(title);
                  setSelectedSpecialtyKey(
                    inferSpecialtyFromServiceLabel(
                      title,
                      null,
                      section.icon ?? null,
                    ),
                  );
                  setOpenSection(isOpen ? null : sectionId);
                }}
                className="flex w-full items-start justify-between gap-4 p-4 text-start transition-colors hover:bg-primary/[0.025]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                      active
                        ? "bg-primary text-white shadow-[0_12px_28px_rgba(122,22,22,0.22)]"
                        : "bg-primary/[0.07] text-primary"
                    }`}
                  >
                    <SectionIcon className="h-5 w-5 stroke-[1.9]" />
                  </span>

                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-black leading-6 ${
                        active ? "text-primary" : "text-[#07111F]"
                      }`}
                    >
                      {title}
                    </h3>

                    {description && (
  <p className="mt-1 max-w-6xl overflow-hidden text-xs font-semibold leading-5 text-text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
    {description}
  </p>
)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Radio circle */}
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
                      active ? "border-primary" : "border-gray-300"
                    }`}
                  >
                    {active && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </span>

                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                      isOpen
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-text-muted"
                    }`}
                  >
                    {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                  </span>
                </div>
              </button>

              {/* Branches */}
<AnimatePresence initial={false}>
  {isOpen && (
    <motion.div
      key="branches"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="border-t border-gray-100 bg-gray-50/60 p-4">
        <div className="flex flex-wrap items-start gap-2">
          {section.options.map((opt, index) => {
            const label = getOptionLabel(opt, isAr);
            const selected = service === label;

            return (
              <motion.button
                key={label}
                type="button"
                onClick={() =>
                  selectServiceAndGoNext(
                    label,
                    inferSpecialtyFromServiceLabel(
                      label,
                      title,
                      section.icon ?? null,
                    ),
                  )
                }
                aria-pressed={selected}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.018,
                }}
                className={`group inline-flex w-fit max-w-full items-center rounded-full border px-4 py-2 text-start transition-all duration-300 hover:-translate-y-0.5 ${
                  selected
                    ? "border-primary bg-primary/[0.08] text-primary ring-1 ring-primary/35"
                    : "border-gray-200 bg-white text-[#07111F] hover:border-primary/30 hover:bg-primary/[0.025]"
                }`}
              >
                <span
                  className={`block max-w-full whitespace-normal text-sm font-extrabold leading-6 ${
                    selected ? "text-primary" : "text-[#07111F]"
                  }`}
                >
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
            </div>
          );
        })}
      </div>
)
  ) : (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {displayedServices.map((s, index) => {
        const selected = service === s;

        return (
          <motion.button
            key={s}
            type="button"
            onClick={() =>
              selectServiceAndGoNext(
                s,
                inferSpecialtyFromServiceLabel(s),
              )
            }
            aria-pressed={selected}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.025 }}
            className={`group relative min-h-[92px] overflow-hidden rounded-2xl border p-4 text-start shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(7,17,31,0.08)] ${
              selected
                ? "border-primary bg-primary/[0.06] text-primary ring-1 ring-primary/40"
                : "border-gray-200 bg-white text-[#07111F] hover:border-primary/30"
            }`}
          >
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="text-sm font-extrabold leading-6">
                {s}
              </span>

              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                  selected
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-muted group-hover:bg-primary group-hover:text-white"
                }`}
              >
                {selected ? (
                  <Check size={15} />
                ) : (
                  <ChevronRight
                    size={15}
                    className={`transition-transform ${
                      isAr
                        ? "rotate-180 group-hover:-translate-x-0.5"
                        : "group-hover:translate-x-0.5"
                    }`}
                  />
                )}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  )}
</div>
)}
            </motion.div>
          )}


    </>
  );
}
