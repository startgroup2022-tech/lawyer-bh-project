import "server-only";

import { eq } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";

/**
 * The mobile lawyer profile: the lawyer's own row, its weekly availability and
 * its rating, shaped the way the Flutter `LawyerProfile` model parses it.
 *
 * Only fields that actually exist in the schema are returned. Fields the app
 * models but the platform has no column for (case fee range, bar association,
 * specialisation/service catalogues) are simply omitted — the client falls back
 * to its own defaults rather than the server inventing values.
 */

export type MobileLawyerProfile = {
  id: string;
  countryCode: string;
  professionalName: string;
  professionalNameEn: string | null;
  title: string | null;
  titleEn: string | null;
  experienceYears: number;
  consultationFee: number;
  currency: string;
  city: string | null;
  location: string | null;
  bio: string | null;
  languages: string[];
  rating: number;
  reviewsCount: number;
  completedCasesCount: number;
  acceptsOnline: boolean;
  acceptsInperson: boolean;
  verificationStatus: string;
  profileStatus: string;
  licenseNumber: string | null;
  profileImageUrl: string | null;
  specializations: Array<{
    specialization_id: string;
    name_ar: string;
    is_primary: boolean;
    years_experience: number;
  }>;
  services: unknown[];
  availability: Array<{
    weekday: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
    consultation_type: string;
  }>;
  verification: unknown[];
};

type LawyerRow = {
  id: string;
  countryCode: string;
  fullNameAr: string | null;
  fullNameEn: string | null;
  professionalTitle: string | null;
  professionalTitleEn: string | null;
  experienceYears: number | null;
  consultationFee: string | number | null;
  city: string | null;
  officeLocation: string | null;
  bio: string | null;
  languages: unknown;
  acceptsOnline: boolean | null;
  acceptsInperson: boolean | null;
  status: string | null;
  profileStatus: string | null;
  registrationNo: string | null;
  profileImageUrl: string | null;
  specialtyMain: string | null;
  specialtySubs: unknown;
  rating: string | number | null;
  reviewsCount: string | number | null;
  completedCasesCount: string | number | null;
  currencyCode: string | null;
};

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      return value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((item) => item.replace(/"/g, "").trim())
        .filter(Boolean);
    }
  }
  return [];
}

function specializationsFrom(row: LawyerRow) {
  const main = row.specialtyMain?.trim();
  const subs = asStringArray(row.specialtySubs);
  const names = [main, ...subs].filter((value): value is string => Boolean(value));
  return Array.from(new Set(names)).map((name, index) => ({
    specialization_id: name,
    name_ar: name,
    is_primary: index === 0,
    years_experience: asNumber(row.experienceYears),
  }));
}

export async function loadMobileLawyerProfile(
  lawyerId: string,
): Promise<MobileLawyerProfile | null> {
  const rows = await sqlClient<LawyerRow[]>`
    SELECT
      l.id,
      l.country_code AS "countryCode",
      l.full_name_ar AS "fullNameAr",
      l.full_name_en AS "fullNameEn",
      l.professional_title AS "professionalTitle",
      l.professional_title_en AS "professionalTitleEn",
      l.experience_years AS "experienceYears",
      l.consultation_fee AS "consultationFee",
      l.city,
      l.office_location AS "officeLocation",
      l.bio,
      l.languages,
      l.accepts_online AS "acceptsOnline",
      l.accepts_inperson AS "acceptsInperson",
      l.status,
      l.profile_status AS "profileStatus",
      l.registration_no AS "registrationNo",
      l.profile_image_url AS "profileImageUrl",
      l.specialty_main AS "specialtyMain",
      l.specialty_subs AS "specialtySubs",
      c.currency_code AS "currencyCode",
      coalesce((
        SELECT avg(rating_value)::float FROM (
          SELECT e.rating_stars::float AS rating_value
          FROM public.bahrain_emergency_requests e
          WHERE e.assigned_lawyer_id = l.id AND e.country_code = l.country_code
            AND e.rating_stars IS NOT NULL
          UNION ALL
          SELECT r.lawyer_rating::float
          FROM public.bahrain_booking_reviews r
          WHERE r.lawyer_id = l.id AND r.country_code = l.country_code
            AND r.status = 'submitted' AND r.lawyer_rating IS NOT NULL
        ) ratings WHERE rating_value BETWEEN 1 AND 5
      ), 0) AS rating,
      coalesce((
        SELECT count(*)::int FROM (
          SELECT e.rating_stars AS rating_value
          FROM public.bahrain_emergency_requests e
          WHERE e.assigned_lawyer_id = l.id AND e.country_code = l.country_code
            AND e.rating_stars IS NOT NULL
          UNION ALL
          SELECT r.lawyer_rating AS rating_value
          FROM public.bahrain_booking_reviews r
          WHERE r.lawyer_id = l.id AND r.country_code = l.country_code
            AND r.status = 'submitted' AND r.lawyer_rating IS NOT NULL
        ) ratings WHERE rating_value BETWEEN 1 AND 5
      ), 0) AS "reviewsCount",
      (
        SELECT count(*)::int FROM public.bahrain_appointment_slots s
        JOIN public.bahrain_booking_requests b ON b.id = s.booking_request_id
        WHERE s.lawyer_id = l.id AND b.admin_status = 'completed'
      ) AS "completedCasesCount"
    FROM public.bahrain_lawyers l
    LEFT JOIN public.countries c ON c.code = l.country_code
    WHERE l.id = ${lawyerId}::uuid
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const availability = await sqlClient<
    {
      weekday: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes: number;
      consultation_type: string;
    }[]
  >`
    SELECT weekday, start_time, end_time, slot_duration_minutes, consultation_type
    FROM public.bahrain_lawyer_availability
    WHERE lawyer_id = ${lawyerId}::uuid AND is_active = true
    ORDER BY weekday, start_time
  `;

  return {
    id: row.id,
    countryCode: row.countryCode,
    professionalName: row.fullNameAr ?? row.fullNameEn ?? "",
    professionalNameEn: row.fullNameEn ?? null,
    title: row.professionalTitle ?? null,
    titleEn: row.professionalTitleEn ?? null,
    experienceYears: asNumber(row.experienceYears),
    consultationFee: asNumber(row.consultationFee),
    currency: row.currencyCode ?? "BHD",
    city: row.city ?? null,
    location: row.officeLocation ?? null,
    bio: row.bio ?? null,
    languages: asStringArray(row.languages),
    rating: Math.round(asNumber(row.rating) * 10) / 10,
    reviewsCount: asNumber(row.reviewsCount),
    completedCasesCount: asNumber(row.completedCasesCount),
    acceptsOnline: row.acceptsOnline === true,
    acceptsInperson: row.acceptsInperson === true,
    verificationStatus: row.status ?? "pending",
    profileStatus: row.profileStatus ?? "draft",
    licenseNumber: row.registrationNo ?? null,
    profileImageUrl: row.profileImageUrl ?? null,
    specializations: specializationsFrom(row),
    services: [],
    availability: availability.map((slot) => ({
      weekday: Number(slot.weekday),
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      slot_duration_minutes: Number(slot.slot_duration_minutes),
      consultation_type: slot.consultation_type,
    })),
    verification: [],
  };
}

export type LawyerProfileUpdate = {
  professionalName?: string;
  professionalNameEn?: string;
  title?: string;
  titleEn?: string;
  bio?: string;
  city?: string;
  location?: string;
  experienceYears?: number;
  consultationFee?: number;
  languages?: string[];
  acceptsOnline?: boolean;
  acceptsInperson?: boolean;
  profileStatus?: "draft" | "published" | "hidden";
};

const TEXT_LIMITS: Record<string, number> = {
  professionalName: 120,
  professionalNameEn: 120,
  title: 120,
  titleEn: 120,
  bio: 2000,
  city: 80,
  location: 200,
};

/** Maps the Flutter snake_case profile payload onto the canonical field names. */
const FIELD_ALIASES: Record<string, string> = {
  professional_name: "professionalName",
  professional_name_en: "professionalNameEn",
  title: "title",
  title_en: "titleEn",
  bio: "bio",
  city: "city",
  location: "location",
  experience_years: "experienceYears",
  consultation_fee: "consultationFee",
  languages: "languages",
  accepts_online: "acceptsOnline",
  accepts_inperson: "acceptsInperson",
  profile_status: "profileStatus",
};

const ALLOWED_FIELDS = new Set([
  "professionalName",
  "professionalNameEn",
  "title",
  "titleEn",
  "bio",
  "city",
  "location",
  "experienceYears",
  "consultationFee",
  "languages",
  "acceptsOnline",
  "acceptsInperson",
  "profileStatus",
]);

/** Validates a profile update payload. Only present keys are returned. */
export function parseLawyerProfileUpdate(
  raw: unknown,
): { ok: true; update: LawyerProfileUpdate } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_input" };
  }
  const source = raw as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const canonical = FIELD_ALIASES[key] ?? key;
    if (ALLOWED_FIELDS.has(canonical)) data[canonical] = value;
  }
  const update: LawyerProfileUpdate = {};

  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    const value = data[key];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") return { ok: false, error: "invalid_input" };
    const text = typeof value === "string" ? value.trim() : "";
    if (text.length > limit) return { ok: false, error: "invalid_input" };
    if (key === "professionalName" && text.length < 2) {
      return { ok: false, error: "invalid_name" };
    }
    (update as Record<string, unknown>)[key] = text;
  }

  if (data.experienceYears !== undefined) {
    const value = Number(data.experienceYears);
    if (!Number.isInteger(value) || value < 0 || value > 70) {
      return { ok: false, error: "invalid_experience" };
    }
    update.experienceYears = value;
  }

  if (data.consultationFee !== undefined) {
    const value = Number(data.consultationFee);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
      return { ok: false, error: "invalid_fee" };
    }
    update.consultationFee = Math.round(value * 1000) / 1000;
  }

  if (data.languages !== undefined) {
    if (!Array.isArray(data.languages) || data.languages.length > 20) {
      return { ok: false, error: "invalid_languages" };
    }
    update.languages = data.languages.map((item) => String(item).trim().slice(0, 40)).filter(Boolean);
  }

  for (const key of ["acceptsOnline", "acceptsInperson"] as const) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== "boolean") return { ok: false, error: "invalid_input" };
    update[key] = data[key];
  }

  if (data.profileStatus !== undefined) {
    if (
      data.profileStatus !== "draft" &&
      data.profileStatus !== "published" &&
      data.profileStatus !== "hidden"
    ) {
      return { ok: false, error: "invalid_status" };
    }
    update.profileStatus = data.profileStatus;
  }

  return { ok: true, update };
}

/** Applies a validated update. Returns the refreshed profile, or null if the lawyer is gone. */
export async function saveLawyerProfile(
  lawyerId: string,
  update: LawyerProfileUpdate,
): Promise<MobileLawyerProfile | null> {
  const assignments: Partial<typeof schema.bahrainLawyers.$inferInsert> = {};
  if (update.professionalName !== undefined) assignments.fullNameAr = update.professionalName;
  if (update.professionalNameEn !== undefined) assignments.fullNameEn = update.professionalNameEn;
  if (update.title !== undefined) assignments.professionalTitle = update.title || null;
  if (update.titleEn !== undefined) assignments.professionalTitleEn = update.titleEn || null;
  if (update.bio !== undefined) assignments.bio = update.bio || null;
  if (update.city !== undefined) assignments.city = update.city || null;
  if (update.location !== undefined) assignments.officeLocation = update.location || null;
  if (update.experienceYears !== undefined) assignments.experienceYears = update.experienceYears;
  if (update.consultationFee !== undefined) {
    assignments.consultationFee = update.consultationFee.toFixed(3);
  }
  if (update.languages !== undefined) assignments.languages = update.languages;
  if (update.acceptsOnline !== undefined) assignments.acceptsOnline = update.acceptsOnline;
  if (update.acceptsInperson !== undefined) assignments.acceptsInperson = update.acceptsInperson;
  if (update.profileStatus !== undefined) assignments.profileStatus = update.profileStatus;

  if (Object.keys(assignments).length > 0) {
    await db
      .update(schema.bahrainLawyers)
      .set({ ...assignments, updatedAt: new Date() })
      .where(eq(schema.bahrainLawyers.id, lawyerId));
  }

  return await loadMobileLawyerProfile(lawyerId);
}
