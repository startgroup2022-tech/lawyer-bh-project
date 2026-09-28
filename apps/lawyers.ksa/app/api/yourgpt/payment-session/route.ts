import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import {
  getPublicLawyers,
  type PublicLawyerSpecialty,
} from "@/lib/publicLawyers";
import { siteOrigin } from "@/lib/tap";
import { findConsultationMethod } from "@/lib/booking/consultationMethodCatalog";
import {
  FIXED_SERVICE_REQUEST_AMOUNT_SAR,
  FIXED_SERVICE_REQUEST_DURATION_MINUTES,
  getServiceStage,
  normalizeServiceStageKey,
  type ServiceStageKey,
} from "@/lib/booking/serviceStageCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TIME_PERIODS = new Set([
  "09:00-13:00",
  "13:00-17:00",
  "09:00-17:00",
]);

const PUBLIC_LAWYER_SPECIALTIES = new Set<PublicLawyerSpecialty>([
  "administrative",
  "civil",
  "commercial",
  "labor",
  "criminal",
  "sharia",
  "constitutional",
  "cassation",
  "sports",
]);

function isPublicLawyerSpecialty(
  value: string,
): value is PublicLawyerSpecialty {
  return PUBLIC_LAWYER_SPECIALTIES.has(value as PublicLawyerSpecialty);
}

const OFFICE_ID = "gulf-international-collection-consulting";
const OFFICE_NAME_AR =
  "المكتب الرئيسي";
const OFFICE_NAME_EN =
  "Main Office";
type AssignmentMode = "office" | "lawyer";
type PaymentConsultationMethod =
  | "phone"
  | "whatsapp"
  | "video"
  | "office"
  | "service_request";

type CreatePaymentSessionBody = {
  lang?: string;
  legalCaseId?: string;
  legalCaseKey?: string;
  caseDescription?: string;
  serviceKey?: string;
  consultationMethod?: string;
  assignmentMode?: string;
  selectedLawyerId?: string;
  selectedLawyerName?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  appointmentDate?: string;
  date?: string;
  appointmentTime?: string;
  time?: string;
  appointmentTimeSlot?: string;
  appointmentStartTime?: string;
  appointmentEndTime?: string;
};

function cleanText(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: unknown) {
  let phone = String(value ?? "")
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/\D/g, "");

  if (phone.startsWith("00966")) phone = phone.slice(5);
  else if (phone.startsWith("966")) phone = phone.slice(3);
  if (phone.startsWith("0")) phone = phone.slice(1);

  return phone;
}

function normalizeAssignmentMode(value: unknown): AssignmentMode | null {
  const normalized = cleanText(value, 40)
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (
    normalized === "office" ||
    normalized === "legal office" ||
    normalized === "مكتب" ||
    normalized === "مكتب قانوني"
  ) {
    return "office";
  }

  if (
    normalized === "lawyer" ||
    normalized === "provider" ||
    normalized === "محامي" ||
    normalized === "محام"
  ) {
    return "lawyer";
  }

  return null;
}

function normalizeConsultationMethod(value: unknown) {
  const normalized = cleanText(value, 80)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const aliases: Record<string, string> = {
    whatsapp: "whatsapp",
    "whats app": "whatsapp",
    "استشارة عبر واتساب": "whatsapp",
    واتساب: "whatsapp",
    phone: "phone",
    "phone call": "phone",
    "مكالمة صوتية": "phone",
    "استشارة هاتفية": "phone",
    video: "video",
    "video call": "video",
    "مكالمة فيديو": "video",
    office: "office",
    "office visit": "office",
    "زيارة المكتب": "office",
    "استشارة في المكتب": "office",
  };

  if (aliases[normalized]) return aliases[normalized];
  if (normalized.includes("واتساب") || normalized.includes("whatsapp")) {
    return "whatsapp";
  }
  if (
    normalized.includes("هاتف") ||
    normalized.includes("صوت") ||
    normalized.includes("phone")
  ) {
    return "phone";
  }
  if (normalized.includes("فيديو") || normalized.includes("video")) {
    return "video";
  }
  if (normalized.includes("مكتب") || normalized.includes("office")) {
    return "office";
  }

  return normalized;
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.YOURGPT_BOOKING_SECRET;

  if (!expectedSecret) {
    console.error(
      "[yourgpt/payment-session] YOURGPT_BOOKING_SECRET is not configured",
    );
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
}

function getBookingSecret() {
  const secret = process.env.YOURGPT_BOOKING_SECRET?.trim();
  if (!secret) {
    throw new Error("YOURGPT_BOOKING_SECRET is not configured");
  }
  return secret;
}

function signBookingAccess(bookingId: string, expiresAtUnix: number) {
  return crypto
    .createHmac("sha256", getBookingSecret())
    .update(`${bookingId}.${expiresAtUnix}`)
    .digest("hex");
}

function verifyBookingAccess(
  bookingId: string,
  expiresAtUnix: number,
  signature: string,
) {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  if (!Number.isSafeInteger(expiresAtUnix)) return false;
  if (expiresAtUnix <= Math.floor(Date.now() / 1000)) return false;

  const expected = signBookingAccess(bookingId, expiresAtUnix);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

function getSaudiDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    );
}

function isValidDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function normalizeAppointmentDate(value: unknown) {
  const raw = normalizeDigits(cleanText(value, 100))
    .toLowerCase()
    .replace(/[،,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ymd = raw.match(/(?:^|\D)(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?:\D|$)/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  const dmy = raw.match(/(?:^|\D)(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\D|$)/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const months: Record<string, number> = {
    يناير: 1,
    فبراير: 2,
    مارس: 3,
    أبريل: 4,
    ابريل: 4,
    مايو: 5,
    يونيو: 6,
    يوليو: 7,
    أغسطس: 8,
    اغسطس: 8,
    سبتمبر: 9,
    أكتوبر: 10,
    اكتوبر: 10,
    نوفمبر: 11,
    ديسمبر: 12,
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  const monthEntry = Object.entries(months).find(([monthName]) =>
    raw.includes(monthName),
  );
  if (!monthEntry) return "";

  const month = monthEntry[1];
  const numbers = raw.match(/\d{1,4}/g) ?? [];
  const dayText = numbers.find((part) => {
    const number = Number(part);
    return part.length <= 2 && number >= 1 && number <= 31;
  });
  if (!dayText) return "";

  const explicitYear = numbers.find(
    (part) => part.length === 4 && Number(part) >= 2000,
  );

  let year = explicitYear
    ? Number(explicitYear)
    : Number(getSaudiDateKey().slice(0, 4));

  const buildDate = (targetYear: number) =>
    `${targetYear}-${String(month).padStart(2, "0")}-${String(
      Number(dayText),
    ).padStart(2, "0")}`;

  let result = buildDate(year);

  if (!explicitYear && result < getSaudiDateKey()) {
    year += 1;
    result = buildDate(year);
  }

  return result;
}

function isSaudiWorkingDay(dateKey: string) {
  if (!isValidDateKey(dateKey)) return false;

  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return weekday !== 5 && weekday !== 6;
}

function formatTimeLabel(value: string, lang: "ar" | "en") {
  const labels: Record<string, { ar: string; en: string }> = {
    "09:00-13:00": { ar: "9 صباحاً - 1 ظهراً", en: "9:00 AM - 1:00 PM" },
    "13:00-17:00": { ar: "1 ظهراً - 5 عصراً", en: "1:00 PM - 5:00 PM" },
    "09:00-17:00": { ar: "9 صباحاً - 5 عصراً", en: "9:00 AM - 5:00 PM" },
  };

  return labels[value]?.[lang] ?? value;
}

function normalizeClock(value: unknown) {
  const normalized = normalizeDigits(cleanText(value, 8)).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(normalized);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeAppointmentTime(body: CreatePaymentSessionBody) {
  const directTime = normalizeDigits(
    cleanText(body.appointmentTime ?? body.time, 100),
  )
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const aliases: Record<string, string> = {
    "09:00-13:00": "09:00-13:00",
    "09:00 - 13:00": "09:00-13:00",
    morning: "09:00-13:00",
    "first period": "09:00-13:00",
    "الفترة الأولى": "09:00-13:00",
    "الفترة الأولى": "09:00-13:00",
    "الفترة الاولى": "09:00-13:00",
    "الفترة الاولي": "09:00-13:00",

    "13:00-17:00": "13:00-17:00",
    "13:00 - 17:00": "13:00-17:00",
    afternoon: "13:00-17:00",
    "second period": "13:00-17:00",
    "الفترة الثانية": "13:00-17:00",

    "09:00-17:00": "09:00-17:00",
    "09:00 - 17:00": "09:00-17:00",
    full_day: "09:00-17:00",
    "full day": "09:00-17:00",
    "third period": "09:00-17:00",
    "الفترة الثالثة": "09:00-17:00",
  };

  if (aliases[directTime]) {
    return aliases[directTime];
  }

  if (
    /9(?::?00)?/.test(directTime) &&
    /5(?::?00)?/.test(directTime) &&
    (directTime.includes("صباح") || directTime.includes("am")) &&
    (directTime.includes("عصر") ||
      directTime.includes("مساء") ||
      directTime.includes("pm"))
  ) {
    return "09:00-17:00";
  }

  if (
    /1(?::?00)?/.test(directTime) &&
    /5(?::?00)?/.test(directTime) &&
    (directTime.includes("ظهر") ||
      directTime.includes("عصر") ||
      directTime.includes("مساء") ||
      directTime.includes("pm"))
  ) {
    return "13:00-17:00";
  }

  if (
    /9(?::?00)?/.test(directTime) &&
    /1(?::?00)?/.test(directTime) &&
    (directTime.includes("صباح") || directTime.includes("am")) &&
    (directTime.includes("ظهر") || directTime.includes("pm"))
  ) {
    return "09:00-13:00";
  }

  const slot = cleanText(body.appointmentTimeSlot, 30)
    .toLowerCase()
    .replace(/\s+/g, "_");

  const slotMap: Record<string, string> = {
    morning: "09:00-13:00",
    first_period: "09:00-13:00",
    "الفترة_الأولى": "09:00-13:00",
    "الفترة_الاولى": "09:00-13:00",
    afternoon: "13:00-17:00",
    second_period: "13:00-17:00",
    "الفترة_الثانية": "13:00-17:00",
    full_day: "09:00-17:00",
    third_period: "09:00-17:00",
    "الفترة_الثالثة": "09:00-17:00",
  };

  if (slotMap[slot]) return slotMap[slot];

  const start = normalizeClock(body.appointmentStartTime);
  const end = normalizeClock(body.appointmentEndTime);
  const combined = start && end ? `${start}-${end}` : "";

  return ALLOWED_TIME_PERIODS.has(combined) ? combined : "";
}

async function resolveLegalCase(input: {
  countryCode: string;
  legalCasesTable: string;
  legalCaseCategoriesTable: string;
  legalCaseId: string;
  legalCaseKey: string;
}) {
  if (input.legalCaseId && !isUuid(input.legalCaseId)) return null;

  const rows = input.legalCaseId
    ? await sqlClient`
        SELECT
          lc.id, lc.key, lc.name_ar, lc.name_en,
          category.key AS category_key,
          category.name_ar AS category_name_ar,
          category.name_en AS category_name_en
        FROM ${sqlClient(input.legalCasesTable)} AS lc
        INNER JOIN ${sqlClient(input.legalCaseCategoriesTable)} AS category
          ON category.id = lc.category_id
          AND category.country_code = lc.country_code
        WHERE lc.id = ${input.legalCaseId}::uuid
          AND lc.country_code = ${input.countryCode}
          AND lc.is_active = true
          AND category.is_active = true
        LIMIT 1
      `
    : await sqlClient`
        SELECT
          lc.id, lc.key, lc.name_ar, lc.name_en,
          category.key AS category_key,
          category.name_ar AS category_name_ar,
          category.name_en AS category_name_en
        FROM ${sqlClient(input.legalCasesTable)} AS lc
        INNER JOIN ${sqlClient(input.legalCaseCategoriesTable)} AS category
          ON category.id = lc.category_id
          AND category.country_code = lc.country_code
        WHERE lc.key = ${input.legalCaseKey}
          AND lc.country_code = ${input.countryCode}
          AND lc.is_active = true
          AND category.is_active = true
        LIMIT 1
      `;

  return rows[0] as
    | {
        id: string;
        key: string;
        name_ar: string;
        name_en: string;
        category_key: string;
        category_name_ar: string;
        category_name_en: string;
      }
    | undefined;
}

async function resolveSelectedLawyer(input: {
  countryCode: string;
  selectedLawyerId: string;
  legalCaseCategoryKey: string;
  serviceKey: ServiceStageKey;
}) {
  if (!isUuid(input.selectedLawyerId)) return null;

  const lawyers = await getPublicLawyers(input.countryCode);
  const serviceStage = getServiceStage(input.serviceKey);

  if (!serviceStage || serviceStage.officeOnly) {
    return null;
  }

  const lawyer = lawyers.find(
    (item) =>
      item.id === input.selectedLawyerId &&
      serviceStage.providerTypes.includes(item.subscriptionType),
  );

  if (!lawyer) return null;

  if (
    lawyer.subscriptionType === "private_executor" ||
    lawyer.subscriptionType === "private_notary"
  ) {
    return lawyer;
  }

  const categoryKey = input.legalCaseCategoryKey;
  if (!isPublicLawyerSpecialty(categoryKey)) return null;

  const matchesCategory =
    lawyer.specialtyMain === categoryKey ||
    lawyer.specialtySubs.includes(categoryKey) ||
    lawyer.specialties.includes(categoryKey);

  return matchesCategory ? lawyer : null;
}

async function handlePost(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePaymentSessionBody;
  try {
    body = (await request.json()) as CreatePaymentSessionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const lang: "ar" | "en" = body.lang === "en" ? "en" : "ar";
  const countryCode = "SA";
  const legalCaseId = cleanText(body.legalCaseId, 80);
  const legalCaseKey = cleanText(body.legalCaseKey, 120);
  const caseDescription = cleanText(body.caseDescription, 500);
  const serviceKey = normalizeServiceStageKey(body.serviceKey);
  const serviceStage = getServiceStage(serviceKey);
  const requestedConsultationMethod = normalizeConsultationMethod(
    body.consultationMethod,
  );
  const requestedAssignmentMode = normalizeAssignmentMode(body.assignmentMode);
  const assignmentMode = serviceStage?.officeOnly
    ? "office"
    : requestedAssignmentMode;
  const selectedLawyerId = cleanText(body.selectedLawyerId, 80);
  const name = cleanText(body.name ?? body.fullName, 120);
  const phone = normalizePhone(body.phone);
  const email = cleanText(body.email, 120).toLowerCase();
  const rawAppointmentDate = cleanText(
    body.appointmentDate ?? body.date,
    100,
  );
  const appointmentDate = normalizeAppointmentDate(rawAppointmentDate);
  const appointmentTime = normalizeAppointmentTime(body);

  console.info("[yourgpt/payment-session] normalized request", {
    legalCaseId: legalCaseId || null,
    legalCaseKey: legalCaseKey || null,
    serviceKey: serviceKey || null,
    consultationMethod: requestedConsultationMethod || null,
    assignmentMode: assignmentMode || null,
    nameLength: name.length,
    phoneLength: phone.length,
    hasEmail: Boolean(email),
    caseDescriptionLength: caseDescription.length,
    rawAppointmentDate: rawAppointmentDate || null,
    appointmentDate: appointmentDate || null,
    rawAppointmentTime:
      body.appointmentTime ?? body.time ?? body.appointmentTimeSlot ?? null,
    appointmentTime: appointmentTime || null,
  });

  if (!legalCaseId && !legalCaseKey) {
    return NextResponse.json(
      { ok: false, error: "legalCaseId or legalCaseKey is required" },
      { status: 400 },
    );
  }

  if (!serviceStage || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "serviceKey is invalid" },
      { status: 400 },
    );
  }

  if (!assignmentMode) {
    return NextResponse.json(
      { ok: false, error: "assignmentMode must be office or lawyer" },
      { status: 400 },
    );
  }

  if (serviceStage.officeOnly && requestedAssignmentMode === "lawyer") {
    return NextResponse.json(
      { ok: false, error: "This service is assigned to the office" },
      { status: 400 },
    );
  }

  if (assignmentMode === "lawyer" && !selectedLawyerId) {
    return NextResponse.json(
      { ok: false, error: "selectedLawyerId is required for lawyer mode" },
      { status: 400 },
    );
  }

  if (name.length < 3) {
    return NextResponse.json({ ok: false, error: "Full name is required" }, { status: 400 });
  }

  if (!/^5\d{8}$/.test(phone)) {
    return NextResponse.json({ ok: false, error: "Invalid Saudi phone number" }, { status: 400 });
  }

  if (!isEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          lang === "ar"
            ? "يرجى إدخال بريد إلكتروني صحيح."
            : "Invalid email address",
      },
      { status: 400 },
    );
  }

  if (caseDescription.length < 10) {
    return NextResponse.json({ ok: false, error: "Case description is too short" }, { status: 400 });
  }

  if (!isValidDateKey(appointmentDate) || appointmentDate <= getSaudiDateKey()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid appointment date",
        field: "appointmentDate",
        received: rawAppointmentDate || null,
        normalized: appointmentDate || null,
      },
      { status: 400 },
    );
  }

  if (!isSaudiWorkingDay(appointmentDate)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Appointment date must be a Saudi working day",
        field: "appointmentDate",
        received: rawAppointmentDate || null,
        normalized: appointmentDate,
      },
      { status: 400 },
    );
  }

  if (!appointmentTime || !ALLOWED_TIME_PERIODS.has(appointmentTime)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid appointment time. Use 09:00-13:00, 13:00-17:00, or 09:00-17:00",
        field: "appointmentTime",
        normalized: appointmentTime || null,
        received: {
          appointmentTime: body.appointmentTime ?? body.time ?? null,
          appointmentTimeSlot: body.appointmentTimeSlot ?? null,
          appointmentStartTime: body.appointmentStartTime ?? null,
          appointmentEndTime: body.appointmentEndTime ?? null,
        },
      },
      { status: 400 },
    );
  }

  const country = await getActiveCountry(countryCode);
  if (!country) {
    return NextResponse.json(
      { ok: false, error: "Country is not active or its tables are not ready" },
      { status: 400 },
    );
  }

  const tables = buildCountryTableSet(country);
  const bookingRequestsTable = tables.booking_requests;

  const legalCase = await resolveLegalCase({
    countryCode: country.code,
    legalCasesTable: tables.legal_cases,
    legalCaseCategoriesTable: tables.legal_case_categories,
    legalCaseId,
    legalCaseKey,
  });

  if (!legalCase) {
    return NextResponse.json({ ok: false, error: "Legal case was not found" }, { status: 404 });
  }

  let consultationMethod: PaymentConsultationMethod;
  let consultationType: string;
  let amountSar: number;
  let durationMinutes: number;

  if (serviceKey === "legal") {
    const catalogueMethod = await findConsultationMethod(
      country,
      requestedConsultationMethod,
    );

    if (!catalogueMethod) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "consultationMethod must be an active paid method returned by the service catalogue",
        },
        { status: 400 },
      );
    }

    consultationMethod = catalogueMethod.code;
    consultationType = catalogueMethod.name[lang];
    amountSar = catalogueMethod.price;
    durationMinutes = catalogueMethod.durationMinutes;
  } else {
    consultationMethod = "service_request";
    consultationType =
      lang === "ar" ? "طلب خدمة قانونية" : "Legal Service Request";
    amountSar =
      serviceStage.fixedAmountBhd ??
      FIXED_SERVICE_REQUEST_AMOUNT_SAR;
    durationMinutes = FIXED_SERVICE_REQUEST_DURATION_MINUTES;
  }

  const selectedLawyer =
    assignmentMode === "lawyer"
      ? await resolveSelectedLawyer({
          countryCode: country.code,
          selectedLawyerId,
          legalCaseCategoryKey: legalCase.category_key,
          serviceKey,
        })
      : null;

  if (assignmentMode === "lawyer" && !selectedLawyer) {
    return NextResponse.json(
      {
        ok: false,
        error: "Selected lawyer is unavailable or does not match the legal case specialty",
      },
      { status: 400 },
    );
  }

  const service = serviceStage.name[lang];
  const specialtyLabel =
    lang === "ar" ? legalCase.category_name_ar : legalCase.category_name_en;
  const officeName = lang === "ar" ? OFFICE_NAME_AR : OFFICE_NAME_EN;
  const selectedLawyerName = selectedLawyer
    ? lang === "ar"
      ? selectedLawyer.nameAr
      : selectedLawyer.nameEn
    : "";
  const consultationPrice =
    lang === "ar" ? `${amountSar} ر.س` : `${amountSar} SAR`;
  const currentPriceLabel = consultationPrice;
  const selectedTimeLabel = formatTimeLabel(appointmentTime, lang);

  const payload = {
    countryCode: country.code,
    lang,
    service,
    legalCaseId: legalCase.id,
    legalCaseKey: legalCase.key,
    specialtyKey: legalCase.category_key,
    specialtyLabel,
    serviceKey,
    requestType: serviceKey,
    consultationType,
    consultationPrice: `${amountSar} SAR`,
    consultationMethod,
    durationMinutes,
    amountBD: amountSar,
    date: appointmentDate,
    time: appointmentTime,
    assignmentMode,
    selectedOfficeId: assignmentMode === "office" ? OFFICE_ID : "",
    selectedOfficeName: assignmentMode === "office" ? officeName : "",
    selectedLawyerId: assignmentMode === "lawyer" ? selectedLawyer?.id ?? "" : "",
    selectedLawyerName: assignmentMode === "lawyer" ? selectedLawyerName : "",
    name,
    phone,
    email,
    message: caseDescription,
    source: "yourgpt",
  };

  const paymentDraft = {
    flow: "book_appointment" as const,
    createdAt: new Date().toISOString(),
    lang,
    service,
    legalCaseId: legalCase.id,
    legalCaseKey: legalCase.key,
    specialtyLabel,
    serviceKey,
    consultationType,
    consultationMethod,
    consultationPrice,
    durationMinutes,
    amountBD: amountSar,
    currentPriceLabel,
    date: appointmentDate,
    time: appointmentTime,
    selectedTimeLabel,
    assignmentMode,
    selectedOfficeId: assignmentMode === "office" ? OFFICE_ID : "",
    selectedOfficeName: assignmentMode === "office" ? officeName : "",
    selectedLawyerId: assignmentMode === "lawyer" ? selectedLawyer?.id ?? "" : "",
    selectedLawyerName: assignmentMode === "lawyer" ? selectedLawyerName : "",
    name,
    phone,
    email,
    message: caseDescription,
    payload,
  };

  const requestPayloadJson = JSON.stringify(paymentDraft);
  const assignedToEmail =
    process.env.PROFESSIONAL_OFFICE_EMAIL ||
    process.env.ADMIN_REQUEST_EMAIL ||
    process.env.POSTMARK_TO_EMAIL ||
    "info@lawyers.bh";

  let bookingId = "";

  try {
    const bookingRows = await sqlClient`
      INSERT INTO ${sqlClient(bookingRequestsTable)} (
        country_code,
        lang,
        service,
        consultation_type,
        consultation_method,
        consultation_price,
        amount_bd,
        duration_minutes,
        video_provider,
        appointment_date,
        appointment_time,
        assignment_mode,
        selected_office_id,
        selected_office_name,
        selected_lawyer_id,
        selected_lawyer_name,
        assigned_to_email,
        customer_name,
        customer_phone,
        customer_email,
        customer_message,
        payment_status,
        admin_status,
        tap_charge_id,
        tap_status,
        request_payload,
        tap_payload
      ) VALUES (
        ${country.code},
        ${lang},
        ${service},
        ${consultationType},
        ${consultationMethod},
        ${consultationPrice},
        ${String(amountSar)},
        ${durationMinutes},
        ${null},
        ${appointmentDate},
        ${appointmentTime},
        ${assignmentMode},
        ${assignmentMode === "office" ? OFFICE_ID : null},
        ${assignmentMode === "office" ? officeName : null},
        ${assignmentMode === "lawyer" ? selectedLawyer?.id ?? null : null},
        ${assignmentMode === "lawyer" ? selectedLawyerName || null : null},
        ${assignedToEmail},
        ${name},
        ${phone},
        ${email},
        ${caseDescription},
        ${"pending_payment"},
        ${"pending_review"},
        ${null},
        ${"CREATING"},
        ${requestPayloadJson}::jsonb,
        ${null}
      )
      RETURNING id
    `;

    const booking = bookingRows[0] as { id: string } | undefined;

    if (!booking?.id || !isUuid(booking.id)) {
      throw new Error("Booking insert did not return a valid id");
    }

    bookingId = booking.id;

    const finalPayload = {
      ...payload,
      bookingId,
      existingBookingId: bookingId,
    };

    const finalPaymentDraft = {
      ...paymentDraft,
      bookingId,
      existingBookingId: bookingId,
      payload: finalPayload,
    };

    await sqlClient`
      UPDATE ${sqlClient(bookingRequestsTable)}
      SET
        request_payload = ${JSON.stringify(finalPaymentDraft)}::jsonb,
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
    `;
  } catch (error) {
    const dbError = error as {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
      column?: string;
    };

    console.error("[yourgpt/payment-session] failed to save booking", {
      message: dbError?.message,
      code: dbError?.code,
      detail: dbError?.detail,
      constraint: dbError?.constraint,
      table: dbError?.table,
      column: dbError?.column,
      bookingId: bookingId || null,
      consultationMethod,
      appointmentDate,
      appointmentTime,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to save booking request",
        code: dbError?.code ?? null,
      },
      { status: 500 },
    );
  }

  const expiresAtUnix = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = signBookingAccess(bookingId, expiresAtUnix);
  const expiresAt = new Date(expiresAtUnix * 1000);

  // Keep the existing payment page compatible by sending one `token` query param.
  // The token is stateless and contains bookingId, expiry, and signature.
  const paymentToken = `${bookingId}.${expiresAtUnix}.${signature}`;

  const paymentUrl =
    `${siteOrigin(request)}/${lang}/payment/yourgpt` +
    `?token=${encodeURIComponent(paymentToken)}`;

  return NextResponse.json({
    ok: true,
    bookingId,
    paymentUrl,
    expiresAt: expiresAt.toISOString(),
    amount: amountSar,
    currency: "SAR",
    service: {
      key: serviceKey,
      name: service,
    },
    consultationMethod:
      serviceKey === "legal"
        ? {
            key: consultationMethod,
            name: consultationType,
            durationMinutes,
          }
        : null,
    legalCase: {
      id: legalCase.id,
      key: legalCase.key,
      name: lang === "ar" ? legalCase.name_ar : legalCase.name_en,
      category: specialtyLabel,
    },
    assignment: {
      mode: assignmentMode,
      name: assignmentMode === "office" ? officeName : selectedLawyerName,
      lawyerId: assignmentMode === "lawyer" ? selectedLawyer?.id ?? null : null,
    },
  });
}

async function handleGet(request: Request) {
  const url = new URL(request.url);
  const token = cleanText(url.searchParams.get("token"), 220);

  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return NextResponse.json(
      { ok: false, error: "Invalid payment session token" },
      { status: 400 },
    );
  }

  const [bookingId, expiresAtRaw, signature] = tokenParts;
  const expiresAtUnix = Number(expiresAtRaw);

  if (!isUuid(bookingId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid booking id" },
      { status: 400 },
    );
  }

  if (!verifyBookingAccess(bookingId, expiresAtUnix, signature)) {
    return NextResponse.json(
      { ok: false, error: "Payment link is invalid or has expired" },
      { status: 401 },
    );
  }

  const country = await getActiveCountry("SA");
  if (!country) {
    return NextResponse.json(
      { ok: false, error: "Country is not active or its tables are not ready" },
      { status: 400 },
    );
  }

  const tables = buildCountryTableSet(country);
  const bookingRequestsTable = tables.booking_requests;

  let row:
    | {
        id: string;
        request_payload: unknown;
        payment_status: string | null;
      }
    | undefined;

  try {
    const rows = await sqlClient`
      SELECT
        id,
        request_payload,
        payment_status
      FROM ${sqlClient(bookingRequestsTable)}
      WHERE id = ${bookingId}::uuid
        AND country_code = ${country.code}
      LIMIT 1
    `;

    row = rows[0] as
      | {
          id: string;
          request_payload: unknown;
          payment_status: string | null;
        }
      | undefined;
  } catch (error) {
    console.error("[yourgpt/payment-session] failed to load booking", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load booking request" },
      { status: 500 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Booking request was not found" },
      { status: 404 },
    );
  }

  if (
    row.payment_status &&
    row.payment_status !== "pending_payment" &&
    row.payment_status !== "failed"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "This booking is no longer awaiting payment",
        paymentStatus: row.payment_status,
      },
      { status: 409 },
    );
  }

  if (!row.request_payload || typeof row.request_payload !== "object") {
    return NextResponse.json(
      { ok: false, error: "Booking payment data is unavailable" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    bookingId: row.id,
    draft: row.request_payload,
    expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    console.error("[yourgpt/payment-session] unhandled POST error", error);

    return NextResponse.json(
      { ok: false, error: "Unable to create payment session" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    return await handleGet(request);
  } catch (error) {
    console.error("[yourgpt/payment-session] unhandled GET error", error);

    return NextResponse.json(
      { ok: false, error: "Unable to load payment session" },
      { status: 500 },
    );
  }
}
