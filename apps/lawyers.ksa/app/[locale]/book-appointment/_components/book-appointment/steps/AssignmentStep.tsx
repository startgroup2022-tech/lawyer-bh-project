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
import type { AvailableLawyer, LawyerRegistrationLevel, LawyerSort } from "../types";

const LAWYER_REGISTRATION_LEVEL_OPTIONS: readonly LawyerRegistrationLevel[] = [
  "all",
  "cassation",
  "practicing",
  "trainee",
];

const LAWYER_SORT_OPTIONS: readonly LawyerSort[] = [
  "experience_desc",
  "rating_desc",
  "name_asc",
];

function isLawyerRegistrationLevel(
  value: string,
): value is LawyerRegistrationLevel {
  return (LAWYER_REGISTRATION_LEVEL_OPTIONS as readonly string[]).includes(value);
}

function isLawyerSort(value: string): value is LawyerSort {
  return (LAWYER_SORT_OPTIONS as readonly string[]).includes(value);
}

export default function AssignmentStep() {
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
    requiresPrivateExecutor,
    requiresPrivateNotary,
    requiresSpecificProviderType,
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

  const providerKindAr = requiresPrivateExecutor
    ? "المنفذ الخاص"
    : requiresPrivateNotary
      ? "الموثق الخاص"
      : "المحامي";

  const providerKindPluralAr = requiresPrivateExecutor
    ? "المنفذين الخاصين"
    : requiresPrivateNotary
      ? "الموثقين الخاصين"
      : "المحامين";

  const providerKindEn = requiresPrivateExecutor
    ? "Private Executor"
    : requiresPrivateNotary
      ? "Private Notary"
      : "Lawyer";

  const providerKindPluralEn = requiresPrivateExecutor
    ? "private executors"
    : requiresPrivateNotary
      ? "private notaries"
      : "lawyers";

  return (
    <>
{/* Step 3: Choose Office or Lawyer */}
{step === 3 && (
  <motion.div
    key="step3"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.25 }}
  >
    <div className="mb-5">
      <h2 className="text-xl font-black text-[#07111F]">
        {lawyerSelectionMode === "lawyer"
          ? isAr
            ? `اختر ${providerKindAr} المناسب`
            : `Choose a Suitable ${providerKindEn}`
          : isAr
            ? "اختر طريقة التعيين"
            : "Choose Assignment Method"}
      </h2>

      <p className="mt-1 text-sm leading-6 text-text-muted">
        {lawyerSelectionMode === "lawyer"
          ? isLawyerAuthorizationBooking
            ? isAr
              ? "اختر محامياً مناسباً لنوع القضية. بعد الدفع، سيتواصل معك المحامي لمتابعة طلب التوكيل."
              : "Choose a lawyer for the selected case type. After payment, the lawyer will contact you to follow up on the authorization request."
            : requiresSpecificProviderType
              ? isAr
                ? `يتم عرض ${providerKindPluralAr} فقط المتاحين لهذا الموعد. يمكنك أيضاً البحث بالاسم وترتيب النتائج.`
                : `Only ${providerKindPluralEn} available for this slot are shown. You can also search by name and sort results.`
              : isAr
                ? "يتم عرض المحامين الذين لديهم نفس تخصص القضية المختارة والمتاحين في نفس الوقت. يمكنك أيضاً البحث بالاسم وترتيب النتائج."
                : "Showing lawyers who match the selected case specialty and are available at the selected time. You can also search by name and sort results."
          : isLawyerAuthorizationBooking
            ? isAr
              ? "اختر مكاتبنا لإرسال طلب التوكيل، أو اختر محامياً محدداً عند توفر الخدمة لاحقاً. اختيار المحامي محدد تحت التحديث حالياً."
              : "Choose our offices to send the authorization request, or choose a specific lawyer when the service becomes available. Direct lawyer selection is currently under update."
            : requiresSpecificProviderType
              ? isAr
                ? `اختر مكتباً لإرسال الطلب مباشرة، أو اختر ${providerKindAr} محدداً من ${providerKindPluralAr} المسجلين.`
                : `Choose an office to send the request directly, or choose a specific registered ${providerKindEn.toLowerCase()}.`
              : isAr
                ? "اختر مكتباً لإرسال الطلب مباشرة، أو اختر محامياً محدداً من المحامين المسجلين."
                : "Choose an office to send the request directly, or choose a specific registered lawyer."}
      </p>
    </div>

    <div className="mb-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-4 text-sm">
      <div className="flex flex-wrap gap-3">
        <span className="text-text-muted">
          {isAr ? "الخدمة:" : "Service:"}{" "}
          <strong className="text-text-primary">{service}</strong>
        </span>

        {activeSpecialtyLabel && (
          <span className="text-text-muted">
            {isAr ? "التخصص:" : "Specialty:"}{" "}
            <strong className="text-text-primary">{activeSpecialtyLabel}</strong>
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

        {isLawyerAuthorizationBooking && (
          <span className="text-text-muted">
            {isAr ? "الرسوم:" : "Fee:"}{" "}
            <strong className="text-primary">{isAr ? "10 ر.س" : "SAR 10"}</strong>
          </span>
        )}
      </div>
    </div>

    {lawyerSelectionMode === null ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={selectProfessionalOffice}
          className="group rounded-3xl border border-gray-200 bg-white p-6 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_45px_rgba(7,17,31,0.08)]"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary transition-all group-hover:bg-primary group-hover:text-white">
            <Building2 className="h-7 w-7" />
          </div>

        <h3 className="text-lg font-black leading-7 text-[#07111F]">
  {isAr ? "اختيار مكاتبنا" : "Choose Our Offices"}
</h3>

<p className="mt-3 text-sm font-semibold leading-7 text-text-muted">
  {isLawyerAuthorizationBooking
    ? isAr
      ? "سيتم إرسال طلب التوكيل إلى مكاتبنا، وسيتم تعيين المحامي المناسب للتواصل معك ومتابعة الطلب."
      : "The authorization request will be sent to our offices, and the suitable lawyer will be assigned to contact you and follow up."
    : isAr
      ? "سيتم إرسال الطلب إلى مكاتبنا الرئيسية التابعة لمنصة محامون السعودية وتعيين المختص المناسب لمتابعة الطلب."
      : "The request will be sent to our main offices affiliated with Lawyers Bahrain platform, and the suitable specialist will be assigned to follow up on the request."}
</p>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary">
            {isAr ? "اختيار المكتب" : "Choose this office"}
            <ChevronRight
              className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          onClick={(event) => event.preventDefault()}
          className="relative cursor-not-allowed rounded-3xl border border-gray-200 bg-gray-50 p-6 text-start opacity-75 shadow-sm"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-text-muted">
            <UsersRound className="h-7 w-7" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-[#07111F]">
              {requiresSpecificProviderType
                ? isAr
                  ? `اختيار ${providerKindAr}`
                  : `Choose ${providerKindEn}`
                : isAr
                  ? "اختيار محامي"
                  : "Choose Lawyer"}
            </h3>

            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
              {isAr ? "تحت التحديث" : "Under Update"}
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold leading-7 text-text-muted">
            {requiresSpecificProviderType
              ? isAr
                ? `اختيار ${providerKindAr} محدد تحت التحديث حالياً. يرجى اختيار مكاتبنا وسيتم تعيين المختص المناسب لمتابعة الطلب.`
                : `Direct ${providerKindEn.toLowerCase()} selection is currently under update. Please choose our offices and the suitable specialist will be assigned.`
              : isAr
                ? "اختيار محامي محدد تحت التحديث حالياً. يرجى اختيار مكاتبنا وسيتم تعيين المحامي المناسب لمتابعة طلب التوكيل."
                : "Direct lawyer selection is currently under update. Please choose our offices and the suitable lawyer will be assigned to follow up on the authorization request."}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-text-muted">
            {isAr ? "غير متاح حالياً" : "Currently unavailable"}
            <ChevronRight
              className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`}
            />
          </div>
        </button>
      </div>
    ) : lawyerSelectionMode === "lawyer" || isLawyerAuthorizationBooking ? (
      <>
        <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedLawyerId(null);
                setLawyerSelectionMode(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-primary/30 hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              {isAr ? "رجوع لخيارات التعيين" : "Back to assignment options"}
            </button>

            {isLawyerAuthorizationBooking && (
              <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-xs font-black text-primary">
                {isAr ? "الرسوم 10 ر.س" : "SAR 10 fee"}
              </span>
            )}
          </div>

        {lawyersLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm font-semibold text-text-muted">
            {requiresSpecificProviderType
              ? isAr
                ? `جاري البحث عن ${providerKindPluralAr} مناسبين...`
                : `Finding suitable ${providerKindPluralEn}...`
              : isAr
                ? "جاري البحث عن المحامين المناسبين..."
                : "Finding suitable lawyers..."}
          </div>
        ) : lawyersError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {requiresSpecificProviderType
              ? isAr
                ? `تعذر جلب ${providerKindPluralAr} المناسبين.`
                : `Could not load suitable ${providerKindPluralEn}.`
              : isAr
                ? "تعذر جلب المحامين المناسبين."
                : "Could not load suitable lawyers."}
          </div>
        ) : availableLawyers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
            <UsersRound className="mx-auto mb-3 h-9 w-9 text-text-muted" />

            <h3 className="text-base font-black text-text-primary">
              {isLawyerAuthorizationBooking
                ? isAr
                  ? "لا يوجد محامون متاحون لهذا التخصص حالياً"
                  : "No lawyers available for this specialty right now"
                : isAr
                  ? requiresSpecificProviderType
                    ? `لا يوجد ${providerKindPluralAr} متاحون لهذا الموعد`
                    : "لا يوجد محامون متاحون لهذا التخصص والموعد"
                  : requiresSpecificProviderType
                    ? `No ${providerKindPluralEn} available for this time`
                    : "No lawyers available for this specialty and time"}
            </h3>

            <p className="mt-1 text-sm text-text-muted">
              {isLawyerAuthorizationBooking
                ? isAr
                  ? "جرّب اختيار نوع قضية آخر أو تواصل مع الدعم."
                  : "Try another case type or contact support."
                : isAr
                  ? "جرّب اختيار وقت آخر أو تاريخ آخر."
                  : "Try choosing another date or time."}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-black text-text-primary">
                    {isAr ? "بحث بالاسم" : "Search by name"}
                  </label>

                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={lawyerNameFilter}
                      onChange={(event) => setLawyerNameFilter(event.target.value)}
                      placeholder={requiresSpecificProviderType ? (isAr ? `اسم ${providerKindAr}...` : `${providerKindEn} name...`) : (isAr ? "اسم المحامي..." : "Lawyer name...")}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pe-3 ps-9 text-sm font-semibold text-text-primary outline-none transition-colors focus:border-primary"
                    />
                  </div>
                </div>

                {!requiresSpecificProviderType && (
                  <div>
                    <label className="mb-1.5 block text-xs font-black text-text-primary">
                      {isAr ? "نوع القيد" : "Registration Level"}
                    </label>

                    <select
                      value={lawyerRegistrationLevel}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (isLawyerRegistrationLevel(value)) {
                          setLawyerRegistrationLevel(value);
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-text-primary outline-none transition-colors focus:border-primary"
                    >
                      <option value="all">{isAr ? "كل أنواع القيد" : "All levels"}</option>
                      <option value="cassation">
                        {isAr ? "محامي أمام محكمة التمييز" : "Cassation Lawyer"}
                      </option>
                      <option value="practicing">
                        {isAr ? "محامي مشتغل" : "Practicing Lawyer"}
                      </option>
                      <option value="trainee">
                        {isAr ? "محامي تحت التمرين" : "Trainee Lawyer"}
                      </option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-black text-text-primary">
                    {isAr ? "ترتيب حسب" : "Sort by"}
                  </label>

                  <select
                    value={lawyerSort}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (isLawyerSort(value)) {
                        setLawyerSort(value);
                      }
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-text-primary outline-none transition-colors focus:border-primary"
                  >
                     <option value="name_asc">
                      {isAr ? "الاسم" : "Name"}
                    </option>
                                        <option value="rating_desc">
                      {isAr ? "التقييم" : "Highest rated"}
                    </option>
                    <option value="experience_desc">
                      {isAr ? "سنوات الخبرة" : "Most experienced"}
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-text-muted">
                  {isAr
                    ? requiresSpecificProviderType
                      ? `عرض ${filteredSortedLawyers.length} من ${availableLawyers.length} ${providerKindPluralAr}`
                      : `عرض ${filteredSortedLawyers.length} من ${availableLawyers.length} محاميين`
                    : requiresSpecificProviderType
                      ? `Showing ${filteredSortedLawyers.length} of ${availableLawyers.length} ${providerKindPluralEn}`
                      : `Showing ${filteredSortedLawyers.length} of ${availableLawyers.length} lawyers`}
                </p>

                {(lawyerNameFilter ||
  lawyerRegistrationLevel !== "all" ||
  lawyerSort !== "experience_desc") && (
                  <button
                    type="button"
                    onClick={() => {
                      setLawyerNameFilter("");
                      setLawyerRegistrationLevel("all");
                      setLawyerSort("experience_desc");
                    }}
                    className="text-xs font-extrabold text-primary hover:underline"
                  >
                    {isAr ? "مسح الفلاتر" : "Clear filters"}
                  </button>
                )}
              </div>
            </div>

            {filteredSortedLawyers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
                <UsersRound className="mx-auto mb-3 h-9 w-9 text-text-muted" />

                <h3 className="text-base font-black text-text-primary">
                  {requiresSpecificProviderType
                    ? isAr
                      ? `لا توجد نتائج مطابقة من ${providerKindPluralAr}`
                      : `No matching ${providerKindPluralEn}`
                    : isAr
                      ? "لا توجد نتائج مطابقة"
                      : "No matching lawyers"}
                </h3>

                <p className="mt-1 text-sm text-text-muted">
                  {isAr
                    ? "جرّب تغيير الاسم أو فلتر سنوات الخبرة."
                    : "Try changing the name or experience filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSortedLawyers.map((lawyer: AvailableLawyer) => {
                  const selected = selectedLawyerId === lawyer.id;
                  const nameLabel = getProviderDisplayName(lawyer, isAr);
                  const subtitleLabel = isAr ? lawyer.subtitleAr : lawyer.subtitleEn;
                  const ratingValue = Number(lawyer.rating) || 0;

                  return (
                    <button
                      key={lawyer.id}
                      type="button"
                      onClick={() => {
  setLawyerSelectionMode("lawyer");
  setSelectedLawyerId(lawyer.id);

  window.setTimeout(() => {
    setStep(4);
  }, 120);
}}
                      className={`group relative rounded-2xl border bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(7,17,31,0.08)] ${
                        selected
                          ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30"
                          : "border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      <span
                        className={`absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border ${
                          selected
                            ? "border-primary bg-primary text-white"
                            : "border-gray-300 bg-white text-transparent"
                        }`}
                      >
                        <Check size={13} />
                      </span>

                      <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                        <div className="relative h-full w-full">
                          {lawyer.image ? (
                            <Image
                              src={lawyer.image}
                              alt={nameLabel}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={lawyer.image.startsWith("data:")}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-7 w-7 text-text-muted" />
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="line-clamp-1 text-[13px] font-black text-[#07111F]">
                        {nameLabel}
                      </h3>

                      <p className="mt-1 line-clamp-1 text-[10.5px] font-semibold text-text-muted">
                        {subtitleLabel}
                      </p>

                      <div className="mt-2 flex flex-col items-center gap-1 text-[10.5px]">
                        <span className="font-extrabold text-primary">
                          {lawyer.experienceYears} {isAr ? "سنوات خبرة" : "years experience"}
                        </span>

                        <span className="flex items-center justify-center gap-1 font-bold text-[#667085]">
                          {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-[#98A2B3]">
                            ({lawyer.reviewCount})
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </>
    ) : (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm font-semibold text-text-muted">
        {isAr ? "جاري الانتقال..." : "Redirecting..."}
      </div>
    )}
  </motion.div>
)}

    </>
  );
}
