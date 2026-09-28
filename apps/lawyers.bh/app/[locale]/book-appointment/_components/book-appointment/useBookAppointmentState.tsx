"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { BotMessageSquare } from "lucide-react";
import {
  findOptionBySlug,
  getOptionLabel,
  getSectionDescription,
  getSectionTitle,
  serviceOptionsByKey,
} from "@/lib/serviceOptions";
import {
  consultMethods as defaultConsultMethods,
  DEFAULT_SERVICE_CARD_KEY,
  LAWYER_AUTHORIZATION_SERVICE_KEY,
  ONLINE_CONSULT_METHOD_INDEX,
  professionalOffice,
  serviceKeyToLabel,
  serviceOptions,
  timePeriods,
  videoProviders,
  VOICE_CONSULT_METHOD_INDEX,
} from "./constants";
import { openYourGptChatbot, sendMessageToYourGpt } from "./chatbotUtils";
import {
  formatDateKey,
  formatTimeRange12Hour,
  getAllowedBookingDates,
  isTimePeriodAvailableForDate,
  startOfDay,
} from "./dateUtils";
import { formatPrice, normalizePhoneInput } from "./formatUtils";
import {
  getSpecialtyLabel,
  inferSpecialtyFromServiceLabel,
  practiceAreaIconMap,
} from "./legalUtils";
import {
  getLawyerRegistrationLevel,
  getProviderDisplayName,
  isProviderOfType,
} from "./providerUtils";
import { normalizeServiceStageKey } from "@/lib/booking/serviceStageCatalog";
import { saveBookAppointmentPaymentDraft } from "./paymentDraft";
import { SHOW_PUBLIC_PROVIDER_CARDS } from "@/lib/public-ui-features";
import { getConsultationIcon } from "@/lib/consultation-icons/catalog";
import type {
  AvailableLawyer,
  LawyerRegistrationLevel,
  LawyerSelectionMode,
  LawyerSort,
  SpecialtyKey,
  ConsultationMethodCode,
  ProviderSubscriptionType,
  VideoProvider,
} from "./types";

function normalizeBookingServiceKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

export function useBookAppointmentState() {
  const lang = useLocale();
  const isAr = lang === "ar";

  const professionalOfficeName = isAr
    ? `${professionalOffice.nameAr} (${professionalOffice.labelAr})`
    : `${professionalOffice.nameEn} (${professionalOffice.labelEn})`;
  const formatBookingPrice = (price: number) => {
    const currency = countries.find((country) => country.code === countryCode)?.currencyCode ?? "BHD";
    return formatPrice(price, isAr, currency);
  };

  const [now, setNow] = useState(() => new Date());
  const [step, setStep] = useState(1);
  const [service, setService] = useState("");
  const [queryServiceKey, setQueryServiceKey] = useState<string | null>(null);
  const [selectedSpecialtyKey, setSelectedSpecialtyKey] = useState<SpecialtyKey | null>(null);
  const [cardKey, setCardKey] = useState<string | null>(DEFAULT_SERVICE_CARD_KEY);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<number | null>(null);
  const [consultMethods, setConsultMethods] = useState(defaultConsultMethods);
  const [countries, setCountries] = useState<Array<{ code: string; nameAr: string; nameEn: string; currencyCode: string }>>([]);
  const [countryCode, setCountryCode] = useState("");
  const [consultationCatalogueLoading, setConsultationCatalogueLoading] = useState(true);
  const [consultationCatalogueError, setConsultationCatalogueError] = useState<string | null>(null);
  const [videoProvider, setVideoProvider] = useState<VideoProvider>("google-meet");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLawyerSlug, setSelectedLawyerSlug] = useState<string | null>(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [lawyerSelectionMode, setLawyerSelectionMode] = useState<LawyerSelectionMode | null>(null);
  const [lawyerNameFilter, setLawyerNameFilter] = useState("");
  const [lawyerRegistrationLevel, setLawyerRegistrationLevel] = useState<LawyerRegistrationLevel>("all");
  const [lawyerSort, setLawyerSort] = useState<LawyerSort>("experience_desc");
  const [profileLawyer, setProfileLawyer] = useState<AvailableLawyer | null>(null);
  const [availableLawyers, setAvailableLawyers] = useState<AvailableLawyer[]>([]);
  const [lawyersLoading, setLawyersLoading] = useState(false);
  const [lawyersError, setLawyersError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/countries?channel=website", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (cancelled || !response.ok || !Array.isArray(data.countries)) return;
        const next = data.countries.filter((country: { tablesProvisioned?: boolean; servicesActive?: boolean }) => country.tablesProvisioned && country.servicesActive);
        setCountries(next);
        setCountryCode((current) => current || (next.find((country: { code: string }) => country.code === "BH") ?? next[0])?.code || "");
      })
      .catch(() => { if (!cancelled) setConsultationCatalogueError(isAr ? "تعذر تحميل الدول" : "Could not load countries"); });

    return () => { cancelled = true; };
  }, [isAr]);

  useEffect(() => {
    if (!countryCode) return;
    let cancelled = false;

    async function loadConsultationMethods() {
      setConsultationCatalogueLoading(true);
      setConsultationCatalogueError(null);
      try {
        const response = await fetch(
          `/api/consultation-methods?countryCode=${encodeURIComponent(countryCode)}`,
          { cache: "no-store" },
        );

        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          methods?: Array<{
            code: string;
            nameAr: string;
            nameEn: string;
            price: number;
            iconKey: string;
            durationMinutes: number;
            sortOrder?: number;
          }>;
        };

        if (!response.ok || !data.ok || !Array.isArray(data.methods)) {
          throw new Error("catalogue_unavailable");
        }

        const nextMethods = data.methods
          .filter((method) => Number.isFinite(method.price) && Number.isInteger(method.durationMinutes))
          .map((method) => {
            const fallback = defaultConsultMethods.find((item) => item.code === method.code);
            return {
              ...(fallback ?? { icon: getConsultationIcon(method.iconKey) }),
              icon: getConsultationIcon(method.iconKey),
              code: method.code,
              label: { ar: method.nameAr, en: method.nameEn },
              fixedPrice: method.price,
              fixedMinutes: method.durationMinutes,
              sortOrder: method.sortOrder ?? 999,
            };
          })
          .sort((left, right) => left.sortOrder - right.sortOrder);

        const hasOnlineMethod = nextMethods.some((method) => method.code === "online");
        const fallbackOnline = defaultConsultMethods.find((item) => item.code === "online");
        const catalog = hasOnlineMethod ? nextMethods : (
          fallbackOnline
            ? [{ ...fallbackOnline, sortOrder: 0 }, ...nextMethods]
            : nextMethods
        );

        if (!cancelled) {
          setConsultMethods(catalog);
          setConsultType(null);
        }
      } catch {
        if (!cancelled) { setConsultMethods([]); setConsultationCatalogueError(isAr ? "لا توجد أنواع استشارة متاحة لهذه الدولة حاليًا." : "No consultation methods are currently available for this country."); }
      } finally {
        if (!cancelled) setConsultationCatalogueLoading(false);
      }
    }

    loadConsultationMethods();

    return () => {
      cancelled = true;
    };
  }, [countryCode, isAr]);

  function selectBookingCountry(nextCountryCode: string) {
    setCountryCode(nextCountryCode);
    setConsultType(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedLawyerId(null);
    setSelectedLawyerSlug(null);
  }

  const allowedBookingDateOptions = useMemo(() => {
    const dateLocale = isAr ? "ar-BH" : "en-US";
    const today = now;

    return getAllowedBookingDates(today).map((date) => {
      const value = formatDateKey(date);
      const tomorrow = startOfDay(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isTodayOption = value === formatDateKey(today);
      const isTomorrowOption = value === formatDateKey(tomorrow);

      return {
        value,
        dayLabel: new Intl.DateTimeFormat(dateLocale, { weekday: "long" }).format(date),
        dateLabel: new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long" }).format(date),
        badge: isTodayOption
          ? isAr
            ? "اليوم"
            : "Today"
          : isTomorrowOption
            ? isAr
              ? "بكرة"
              : "Tomorrow"
            : isAr
              ? "متاح"
              : "Available",
      };
    });
  }, [isAr, now]);

  const services = isAr ? serviceOptions.ar : serviceOptions.en;
  const displayedServices = service && !services.includes(service) ? [service, ...services] : services;
  const activeSpecialtyKey = selectedSpecialtyKey ?? inferSpecialtyFromServiceLabel(service);
  const activeSpecialtyLabel = getSpecialtyLabel(activeSpecialtyKey, isAr);
  const isDirectLawyerBooking = Boolean(selectedLawyerSlug);
  const isLawyerAuthorizationBooking =
    normalizeBookingServiceKey(queryServiceKey) === LAWYER_AUTHORIZATION_SERVICE_KEY ||
    normalizeBookingServiceKey(service) === LAWYER_AUTHORIZATION_SERVICE_KEY ||
    service === serviceKeyToLabel[LAWYER_AUTHORIZATION_SERVICE_KEY]?.en ||
    service === serviceKeyToLabel[LAWYER_AUTHORIZATION_SERVICE_KEY]?.ar;
  const isBusinessBooking =
    normalizeBookingServiceKey(queryServiceKey) === "business" ||
    normalizeBookingServiceKey(cardKey) === "business" ||
    normalizeBookingServiceKey(service) === "business" ||
    service === serviceKeyToLabel["business"]?.en ||
    service === serviceKeyToLabel["business"]?.ar;
  const activeServiceStageKey =
    normalizeServiceStageKey(queryServiceKey) ??
    normalizeServiceStageKey(cardKey) ??
    "legal";
  const isFixedServiceRequest =
    activeServiceStageKey !== "legal";
  const shouldShowConsultMethods =
    activeServiceStageKey === "legal" &&
    cardKey === "legal" &&
    !isLawyerAuthorizationBooking;
  const shouldShowServiceSelection = true;
  const normalizedServiceForProvider = service
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const isExecutionBooking =
    cardKey === "execution" ||
    normalizedServiceForProvider.includes("تنفيذ") ||
    normalizedServiceForProvider.includes("executor") ||
    normalizedServiceForProvider.includes("execution");

  const isNotaryBooking =
    cardKey === "notary" ||
    normalizedServiceForProvider.includes("توثيق") ||
    normalizedServiceForProvider.includes("موثق") ||
    normalizedServiceForProvider.includes("كاتب_العدل") ||
    normalizedServiceForProvider.includes("notary");

  const requiredProviderType: ProviderSubscriptionType | null = isExecutionBooking
    ? "private_executor"
    : isNotaryBooking
      ? "private_notary"
      : null;

  const requiresPrivateExecutor = requiredProviderType === "private_executor";
  const requiresPrivateNotary = requiredProviderType === "private_notary";
  const requiresSpecificProviderType = requiredProviderType !== null;
  const visibleConsultMethods = isDirectLawyerBooking
    ? consultMethods.filter((method) => method.icon !== BotMessageSquare && method.fixedPrice > 0)
    : consultMethods;
  const hasChosenConsultMethod = shouldShowConsultMethods ? consultType !== null : true;

  const selectedConsultTypeIndex = isLawyerAuthorizationBooking
    ? VOICE_CONSULT_METHOD_INDEX
    : shouldShowConsultMethods
      ? consultType ?? ONLINE_CONSULT_METHOD_INDEX
      : VOICE_CONSULT_METHOD_INDEX;

  const currentMethod = consultMethods[selectedConsultTypeIndex] ?? defaultConsultMethods[VOICE_CONSULT_METHOD_INDEX];
  const currentMethodLabel = isFixedServiceRequest
    ? isAr
      ? "طلب خدمة قانونية"
      : "Legal Service Request"
    : isAr
      ? currentMethod.label.ar
      : currentMethod.label.en;
  const isVideo = !isFixedServiceRequest && currentMethod.code === "video";
  const currentDuration = isFixedServiceRequest
    ? { minutes: 0, price: 10 }
    : { minutes: currentMethod.fixedMinutes, price: currentMethod.fixedPrice };
  const currentPriceLabel = isFixedServiceRequest
    ? formatBookingPrice(10)
    : currentMethod.note
      ? isAr
        ? currentMethod.note.ar
        : currentMethod.note.en
      : formatBookingPrice(currentDuration.price);

  const visibleStepNumbers = isLawyerAuthorizationBooking
    ? [1, 3, 4]
    : isDirectLawyerBooking || isBusinessBooking
      ? [1, 2, 4]
      : [1, 2, 3, 4];

  const selectedLawyer =
    availableLawyers.find((lawyer) => lawyer.id === selectedLawyerId) ??
    (isDirectLawyerBooking ? profileLawyer : null);

  const selectedBookingLawyer = selectedLawyer ?? profileLawyer ?? null;
  const finalAssignmentMode: LawyerSelectionMode | null =
    isDirectLawyerBooking || selectedBookingLawyer || selectedLawyerId ? "lawyer" : lawyerSelectionMode;
  const finalSelectedLawyerId =
    finalAssignmentMode === "lawyer" ? selectedBookingLawyer?.id ?? selectedLawyerId ?? "" : "";
  const finalSelectedLawyerName =
    finalAssignmentMode === "lawyer" && selectedBookingLawyer
      ? getProviderDisplayName(selectedBookingLawyer, isAr)
      : "";

  useEffect(() => {
    if (!service || (!isLawyerAuthorizationBooking && (!selectedDate || !selectedTime))) {
      setAvailableLawyers([]);
      if (!selectedLawyerSlug) setSelectedLawyerId(null);
      return;
    }

    const date = selectedDate;
    const time = selectedTime;

    let cancelled = false;

    async function loadAvailableLawyers() {
      setLawyersLoading(true);
      setLawyersError(null);
      if (!selectedLawyerSlug) setSelectedLawyerId(null);

      try {
        const params = new URLSearchParams({ service, countryCode });
        if (!isLawyerAuthorizationBooking && date && time) {
          params.set("date", date);
          params.set("time", time);
        }
        if (activeSpecialtyKey) params.set("specialty", activeSpecialtyKey);
        if (requiredProviderType) params.set("providerType", requiredProviderType);
        if (selectedLawyerSlug) params.set("lawyer", selectedLawyerSlug);

        const res = await fetch(`/api/available-lawyers?${params.toString()}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          lawyers?: AvailableLawyer[];
          error?: string;
        };

        if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to load lawyers");
        if (cancelled) return;

        const lawyers = (data.lawyers ?? []).filter((lawyer) =>
          isProviderOfType(lawyer, requiredProviderType),
        );
        setAvailableLawyers(lawyers);

        if (selectedLawyerSlug) {
          const matchedLawyer = lawyers.find((lawyer) => lawyer.slug === selectedLawyerSlug) ?? null;
          setProfileLawyer((current) => matchedLawyer ?? current);
          setSelectedLawyerId(matchedLawyer?.id ?? null);
        }
      } catch (error) {
        if (cancelled) return;
        setAvailableLawyers([]);
        if (selectedLawyerSlug) setSelectedLawyerId(null);
        setLawyersError(error instanceof Error ? error.message : "Failed to load lawyers");
      } finally {
        if (!cancelled) setLawyersLoading(false);
      }
    }

    loadAvailableLawyers();
    return () => {
      cancelled = true;
    };
  }, [service, selectedDate, selectedTime, selectedLawyerSlug, activeSpecialtyKey, requiredProviderType, isLawyerAuthorizationBooking, countryCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("service");
    const normalizedKey = normalizeBookingServiceKey(key);
    const lawyerSlug = SHOW_PUBLIC_PROVIDER_CARDS ? params.get("lawyer") : null;

    setSelectedLawyerSlug(lawyerSlug);
    setQueryServiceKey(normalizedKey || null);

    if (key) {
      if (normalizedKey === LAWYER_AUTHORIZATION_SERVICE_KEY) {
        setService("");
        setSelectedSpecialtyKey(null);
        setOpenSection(null);
        setCardKey(DEFAULT_SERVICE_CARD_KEY);
        setConsultType(VOICE_CONSULT_METHOD_INDEX);
      } else {
        const slugMatch = findOptionBySlug(key);

        if (slugMatch) {
          const nextService = isAr && slugMatch.opt.ar ? slugMatch.opt.ar : slugMatch.opt.en;
          setService(nextService);
          setSelectedSpecialtyKey(inferSpecialtyFromServiceLabel(nextService));
          setCardKey(slugMatch.cardKey);
        } else if (serviceKeyToLabel[normalizedKey]) {
          const nextService = isAr
            ? serviceKeyToLabel[normalizedKey].ar
            : serviceKeyToLabel[normalizedKey].en;
          setService(nextService);
          setSelectedSpecialtyKey(inferSpecialtyFromServiceLabel(nextService));
          setOpenSection(null);
          setCardKey(serviceOptionsByKey[normalizedKey] ? normalizedKey : DEFAULT_SERVICE_CARD_KEY);
        } else {
          setService(key);
          setSelectedSpecialtyKey(inferSpecialtyFromServiceLabel(key));
          setCardKey(DEFAULT_SERVICE_CARD_KEY);
        }
      }
    } else {
      setService("");
      setSelectedSpecialtyKey(null);
      setCardKey(DEFAULT_SERVICE_CARD_KEY);
    }

    const consult = params.get("consult");
    if (consult !== null) {
      const idx = parseInt(consult, 10);
      if (
        !Number.isNaN(idx) &&
        idx >= 0 &&
        idx < defaultConsultMethods.length
      ) {
        if (consultMethods[idx]?.note) {
          window.location.href = "https://wa.me/97336470706";
          return;
        }
        setConsultType(idx);
      }
    }
  }, [isAr]);

  useEffect(() => {
    if (!selectedLawyerSlug) {
      setProfileLawyer(null);
      return;
    }

    const lawyerSlug = selectedLawyerSlug;
    let cancelled = false;

    async function loadProfileLawyer() {
      try {
        const params = new URLSearchParams({ lawyer: lawyerSlug, countryCode });
        if (requiredProviderType) params.set("providerType", requiredProviderType);

        const res = await fetch(`/api/available-lawyers?${params.toString()}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; lawyers?: AvailableLawyer[] };
        if (!res.ok || !data.ok) return;

        const lawyer = data.lawyers?.[0] ?? null;
        const matchedLawyer = lawyer && isProviderOfType(lawyer, requiredProviderType) ? lawyer : null;

        if (!cancelled) {
          setProfileLawyer(matchedLawyer);
          setSelectedLawyerId(matchedLawyer?.id ?? null);
        }
      } catch {
        if (!cancelled) setProfileLawyer(null);
      }
    }

    loadProfileLawyer();
    return () => {
      cancelled = true;
    };
  }, [selectedLawyerSlug, requiredProviderType, countryCode]);

  const filteredSortedLawyers = useMemo(() => {
    const nameQuery = lawyerNameFilter.trim().toLowerCase();

    return [...availableLawyers]
      .filter((lawyer) => isProviderOfType(lawyer, requiredProviderType))
      .filter((lawyer) => {
        const nameText = `${lawyer.nameAr} ${lawyer.nameEn}`.toLowerCase();
        const matchesName = !nameQuery || nameText.includes(nameQuery);
        const registrationLevel = getLawyerRegistrationLevel(lawyer);
        const matchesRegistrationLevel =
          requiresSpecificProviderType ||
          lawyerRegistrationLevel === "all" ||
          registrationLevel === lawyerRegistrationLevel;

        return matchesName && matchesRegistrationLevel;
      })
      .sort((a, b) => {
        const aExperience = Number(a.experienceYears) || 0;
        const bExperience = Number(b.experienceYears) || 0;
        const aRating = Number(a.rating) || 0;
        const bRating = Number(b.rating) || 0;

        if (lawyerSort === "experience_desc") return bExperience - aExperience || bRating - aRating;
        if (lawyerSort === "rating_desc") return bRating - aRating || bExperience - aExperience;

        const aName = isAr ? a.nameAr : a.nameEn;
        const bName = isAr ? b.nameAr : b.nameEn;
        return aName.localeCompare(bName, isAr ? "ar" : "en");
      });
  }, [availableLawyers, lawyerNameFilter, lawyerRegistrationLevel, lawyerSort, isAr, requiredProviderType, requiresSpecificProviderType]);

  const selectProfessionalOffice = () => {
    setLawyerSelectionMode("office");
    setSelectedLawyerId(null);
    setStep(4);
  };

  const selectedTimeLabel = formatTimeRange12Hour(selectedTime, isAr);

  const baseVisibleTimePeriods = useMemo(
    () =>
      isDirectLawyerBooking && profileLawyer?.workingHours
        ? [
            {
              value: profileLawyer.workingHours,
              label: { en: "", ar: "" },
              range: {
                en: formatTimeRange12Hour(profileLawyer.workingHours, false),
                ar: formatTimeRange12Hour(profileLawyer.workingHours, true),
              },
            },
          ]
        : timePeriods,
    [isDirectLawyerBooking, profileLawyer?.workingHours],
  );

  const visibleTimePeriods = useMemo(() => {
    if (!selectedDate) return baseVisibleTimePeriods;
    return baseVisibleTimePeriods.filter((period) => isTimePeriodAvailableForDate(period.value, selectedDate, now));
  }, [baseVisibleTimePeriods, selectedDate, now]);

  useEffect(() => {
    if (!selectedDate || !selectedTime) return;
    const stillAvailable = visibleTimePeriods.some((period) => period.value === selectedTime);

    if (!stillAvailable) {
      setSelectedTime(null);
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
    }
  }, [selectedDate, selectedTime, visibleTimePeriods]);

  const isVirtualGuidanceSelected = () => {
    if (cardKey !== "legal") return false;
    if (consultType === null) return false;

    const method = consultMethods[consultType];
    return method.code === "online" || method.icon === BotMessageSquare || method.fixedPrice === 0;
  };

  const isSelectedBranchService = (label = service) => {
    if (!cardKey) return false;
    const source = serviceOptionsByKey[cardKey];
    if (!source || source.kind !== "sectioned") return false;

    return source.sections.some((section) =>
      section.options.some((opt) => getOptionLabel(opt, isAr) === label),
    );
  };

  const buildYourGptMessage = (label = service) => {
    if (isAr) {
      const prefix = isSelectedBranchService(label) ? "في" : "حول";
      return `عندي استفسار قانوني ${prefix} ${label}`;
    }

    return `I have a legal question about ${label}.`;
  };

  const handleVirtualGuidanceNext = (label = service) => {
    const messageText = buildYourGptMessage(label);
    openYourGptChatbot(0, () => sendMessageToYourGpt(messageText));
  };

  const selectServiceAndGoNext = (label: string, specialtyKey?: SpecialtyKey | null) => {
    setService(label);
    setSelectedSpecialtyKey(specialtyKey ?? inferSpecialtyFromServiceLabel(label));

    if (isVirtualGuidanceSelected()) {
      window.setTimeout(() => handleVirtualGuidanceNext(label), 120);
      return;
    }

    window.setTimeout(() => {
      if (isLawyerAuthorizationBooking) {
        setSelectedLawyerId(null);
        setLawyerSelectionMode(null);
        setStep(3);
        return;
      }

      setStep(2);
    }, 120);
  };

  const canProceed = (s: number) => {
    if (s === 1) return hasChosenConsultMethod && service !== "";
    if (s === 2) {
      return selectedDate !== null && selectedTime !== null && (!isDirectLawyerBooking || profileLawyer !== null || selectedLawyerId !== null);
    }
    if (s === 3) {
      return lawyerSelectionMode === "office" || selectedLawyerId !== null;
    }
    if (s === 4) return name !== "" && phone !== "" && email !== "" && termsAccepted;
    return false;
  };

  const shouldOpenAssistantButton = step === 1 && shouldShowConsultMethods && isVirtualGuidanceSelected();

  const goToPreviousStep = () => {
    if (isLawyerAuthorizationBooking && step === 4) {
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
      setStep(3);
      return;
    }

    if (isLawyerAuthorizationBooking && step === 3) {
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
      setStep(1);
      return;
    }

    if (isDirectLawyerBooking && step === 4) {
      setSelectedTime(null);
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
      setStep(2);
      return;
    }

    if (step === 4 && lawyerSelectionMode === "office") {
      setLawyerSelectionMode(null);
      setSelectedLawyerId(null);
      setStep(isBusinessBooking ? 2 : 3);
      return;
    }

    if (step === 4 && lawyerSelectionMode === "lawyer") {
      setSelectedLawyerId(null);
      setStep(3);
      return;
    }

    if (step === 3) {
      setSelectedTime(null);
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
      setStep(2);
      return;
    }

    if (step === 2) {
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
      setStep(1);
      return;
    }

    setStep(step - 1);
  };

  const goToNextStep = () => {
    if (shouldOpenAssistantButton) {
      handleVirtualGuidanceNext();
      return;
    }

    if (isLawyerAuthorizationBooking && step === 1) {
      setSelectedLawyerId(null);
      setLawyerSelectionMode(null);
      setStep(3);
      return;
    }

    if (isLawyerAuthorizationBooking && step === 3) {
      setStep(4);
      return;
    }

    if (isDirectLawyerBooking && step === 2) {
      setStep(4);
      return;
    }

    if (isBusinessBooking && step === 2) {
      setSelectedLawyerId(null);
      setLawyerSelectionMode("office");
      setStep(4);
      return;
    }

    setStep(step + 1);
  };

  const buildPaymentPayload = () => {
    const selectedConsultType = selectedConsultTypeIndex;

    return {
      lang,
      countryCode,
      service,
      serviceKey: activeServiceStageKey,
      specialtyKey: activeSpecialtyKey ?? undefined,
      specialtyLabel: activeSpecialtyLabel ?? undefined,
      requestType: activeServiceStageKey,
      consultationType: isFixedServiceRequest
        ? "Legal Service Request"
        : consultMethods[selectedConsultType].label.en,
      consultationPrice: formatBookingPrice(currentDuration.price),
      consultationMethod: (
        isFixedServiceRequest
          ? "service_request"
          : currentMethod.code
      ) as ConsultationMethodCode,
      durationMinutes: currentDuration.minutes,
      videoProvider: isVideo ? videoProvider : undefined,
      amountBD: currentDuration.price,
      date: selectedDate,
      time: selectedTime,
      assignmentMode: finalAssignmentMode,
      selectedOfficeId: finalAssignmentMode === "office" ? professionalOffice.id : undefined,
      selectedOfficeName: finalAssignmentMode === "office" ? professionalOfficeName : undefined,
      selectedLawyerId:
        finalAssignmentMode === "lawyer" ? finalSelectedLawyerId || undefined : undefined,
      selectedLawyerName:
        finalAssignmentMode === "lawyer" ? finalSelectedLawyerName || undefined : undefined,
      name,
      phone,
      email,
      message,
    };
  };

  const goToPaymentPage = () => {
    if (!canProceed(4)) {
      setSubmitError(
        isAr
          ? "أكمل بيانات التواصل والموافقة على الشروط قبل الانتقال للدفع."
          : "Complete the contact details and accept the terms before continuing to payment.",
      );
      return;
    }

    setSubmitError(null);

    const payload = buildPaymentPayload();

    saveBookAppointmentPaymentDraft({
      createdAt: new Date().toISOString(),
      lang,
      countryCode,
      service,
      specialtyLabel: activeSpecialtyLabel ?? undefined,
      consultationType: payload.consultationType,
      consultationMethod: payload.consultationMethod,
      consultationPrice: payload.consultationPrice,
      durationMinutes: currentDuration.minutes,
      amountBD: currentDuration.price,
      currentPriceLabel,
      date: selectedDate,
      time: selectedTime,
      selectedTimeLabel,
      assignmentMode: finalAssignmentMode,
      selectedOfficeName:
        finalAssignmentMode === "office" ? professionalOfficeName : undefined,
      selectedLawyerName:
        finalAssignmentMode === "lawyer" ? finalSelectedLawyerName || undefined : undefined,
      name,
      phone,
      email,
      message,
      payload,
    });

    window.location.href = `/${lang}/payment`;
  };

  const handleSubmit = async (tapTokenId?: string) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!tapTokenId) {
        throw new Error(
          isAr
            ? "أدخل بيانات البطاقة واضغط ادفع الآن لإتمام الطلب."
            : "Enter your card details and click Pay Now to complete the request.",
        );
      }

      const res = await fetch("/api/tap/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPaymentPayload(),
          tapTokenId,
          sourceId: tapTokenId,
          paymentSourceType: "card_sdk_v2",
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        transactionUrl?: string;
        chargeId?: string;
      };

      if (res.ok && data.ok && data.transactionUrl) {
        window.location.href = data.transactionUrl;
        return;
      }

      if (res.ok && data.ok) {
        window.location.href = `/${lang}/payment/success${data.chargeId ? `?tap_id=${encodeURIComponent(data.chargeId)}` : ""}`;
        return;
      }

      throw new Error(data.error ?? "Request failed");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    lang,
    isAr,
    countries,
    countryCode,
    selectBookingCountry,
    consultationCatalogueLoading,
    consultationCatalogueError,
    service,
    setService,
    queryServiceKey,
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
    isBusinessBooking,
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
    formatPrice: (price: number) => formatBookingPrice(price),
    handleVirtualGuidanceNext,
    selectServiceAndGoNext,
    submitted,
    submitting,
    submitError,
    bookingId,
    canProceed,
    goToPreviousStep,
    goToNextStep,
    buildPaymentPayload,
    goToPaymentPage,
    handleSubmit,
    shouldOpenAssistantButton,
  };
}
