import { NextResponse } from "next/server";
import {
  getPublicLawyers,
  type PublicLawyerSpecialty,
} from "@/lib/publicLawyers";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSpecialties = [
  "administrative",
  "civil",
  "commercial",
  "labor",
  "criminal",
  "sharia",
  "constitutional",
  "cassation",
  "sports",
] as const;

function isPublicLawyerSpecialty(
  value: string,
): value is PublicLawyerSpecialty {
  return allowedSpecialties.includes(value as PublicLawyerSpecialty);
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

function normalizeSpecialtyParam(
  value: string | null,
): PublicLawyerSpecialty | null {
  const normalized = normalize(value ?? "").replace(/-/g, "_");

  return isPublicLawyerSpecialty(normalized) ? normalized : null;
}

function inferSpecialtyFromService(
  service: string,
): PublicLawyerSpecialty | null {
  const value = normalize(service);

  if (
    value.includes("دستور") ||
    value.includes("constitutional")
  ) {
    return "constitutional";
  }

  if (
    value.includes("جنائي") ||
    value.includes("جنايه") ||
    value.includes("جريمه") ||
    value.includes("جرائم") ||
    value.includes("criminal") ||
    value.includes("crime")
  ) {
    return "criminal";
  }

  if (
    value.includes("شرعي") ||
    value.includes("احوال") ||
    value.includes("اسره") ||
    value.includes("اسري") ||
    value.includes("طلاق") ||
    value.includes("نفقه") ||
    value.includes("حضان") ||
    value.includes("ميراث") ||
    value.includes("ارث") ||
    value.includes("تركات") ||
    value.includes("sharia") ||
    value.includes("family") ||
    value.includes("inheritance")
  ) {
    return "sharia";
  }

  if (
    value.includes("تجاري") ||
    value.includes("شرك") ||
    value.includes("اعمال") ||
    value.includes("افلاس") ||
    value.includes("سجل تجاري") ||
    value.includes("علامات") ||
    value.includes("ملكيه فكريه") ||
    value.includes("commercial") ||
    value.includes("corporate") ||
    value.includes("business") ||
    value.includes("intellectual")
  ) {
    return "commercial";
  }

  if (
    value.includes("عمال") ||
    value.includes("عمل") ||
    value.includes("موظف") ||
    value.includes("labor") ||
    value.includes("labour") ||
    value.includes("employment")
  ) {
    return "labor";
  }

  if (
    value.includes("اداري") ||
    value.includes("حكوم") ||
    value.includes("بلدي") ||
    value.includes("ضريب") ||
    value.includes("administrative") ||
    value.includes("government") ||
    value.includes("tax")
  ) {
    return "administrative";
  }

  if (
    value.includes("تمييز") ||
    value.includes("نقض") ||
    value.includes("cassation")
  ) {
    return "cassation";
  }

  if (
    value.includes("رياضي") ||
    value.includes("sports")
  ) {
    return "sports";
  }

  if (
    value.includes("مدني") ||
    value.includes("عقار") ||
    value.includes("تعويض") ||
    value.includes("تامين") ||
    value.includes("مطالب") ||
    value.includes("دين") ||
    value.includes("مرور") ||
    value.includes("طبي") ||
    value.includes("civil") ||
    value.includes("real estate") ||
    value.includes("compensation") ||
    value.includes("insurance") ||
    value.includes("traffic") ||
    value.includes("medical")
  ) {
    return "civil";
  }

  return null;
}

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function parseTimeToMinutes(value: string) {
  let clean = toEnglishDigits(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const isPm =
    clean.includes("pm") ||
    clean.includes("م") ||
    clean.includes("مساء") ||
    clean.includes("عصرا") ||
    clean.includes("عصر");

  const isAm =
    clean.includes("am") ||
    clean.includes("ص") ||
    clean.includes("صباح");

  clean = clean
    .replace("am", "")
    .replace("pm", "")
    .replace("صباحا", "")
    .replace("صباح", "")
    .replace("عصرا", "")
    .replace("عصر", "")
    .replace("مساء", "")
    .replace("ص", "")
    .replace("م", "");

  const [hourPart, minutePart = "00"] = clean.split(":");
  let hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function parseRange(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .replace("–", "-")
    .replace("—", "-")
    .replace("إلى", "-")
    .replace("الى", "-")
    .replace("to", "-");

  const [start, end] = normalized.split("-");

  if (!start || !end) return null;

  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes === null || endMinutes === null) return null;

  return {
    start: startMinutes,
    end: endMinutes,
  };
}

function coversSelectedTime(
  lawyerWorkingHours: string | null | undefined,
  selectedTime: string,
) {
  const lawyerRange = parseRange(lawyerWorkingHours);
  const selectedRange = parseRange(selectedTime);

  if (!lawyerRange || !selectedRange) {
    return true;
  }

  return (
    lawyerRange.start <= selectedRange.start &&
    lawyerRange.end >= selectedRange.end
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const countryCode = (searchParams.get("countryCode") || "BH")
      .trim()
      .toUpperCase();
    const service = searchParams.get("service") ?? "";
    const selectedTime = searchParams.get("time") ?? "";
    const specialty =
      normalizeSpecialtyParam(searchParams.get("specialty")) ??
      inferSpecialtyFromService(service);

    await requireCountryProduct(countryCode, "lawyers");

    const lawyers = await getPublicLawyers(countryCode);

    const filtered = lawyers
      .filter((lawyer) => {
        const matchesSpecialty =
          !specialty ||
          lawyer.specialtyMain === specialty ||
          lawyer.specialtySubs.includes(specialty) ||
          lawyer.specialties.includes(specialty);

        const matchesTime = selectedTime
          ? coversSelectedTime(lawyer.workingHours, selectedTime)
          : true;

        return matchesSpecialty && matchesTime;
      })
      .sort((a, b) => {
        const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;

        return Number(b.experienceYears || 0) - Number(a.experienceYears || 0);
      })
      .map((lawyer) => ({
        id: lawyer.id,
        slug: lawyer.slug,
        nameAr: lawyer.nameAr,
        nameEn: lawyer.nameEn,
        subtitleAr: lawyer.subtitleAr,
        subtitleEn: lawyer.subtitleEn,
        image: lawyer.image,
        rating: lawyer.rating,
        reviewCount: lawyer.reviewCount,
        experienceYears: lawyer.experienceYears,
        workingHours: lawyer.workingHours,
        registrationLevel: lawyer.registrationLevel,
        subscriptionType: lawyer.subscriptionType,
      }));

    return NextResponse.json({
      ok: true,
      countryCode,
      specialty,
      lawyers: filtered,
    });
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
