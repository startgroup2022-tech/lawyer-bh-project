import { NextResponse } from "next/server";

import { getPublicLawyers } from "@/lib/publicLawyers";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = (url.searchParams.get("countryCode") || "BH")
    .trim()
    .toUpperCase();

  let country;
  try {
    country = await requireCountryProduct(countryCode, "lawyers");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  // Reuse the public directory query rather than a second hand-rolled one: it
  // already enforces the publish rules (approved, active, public-directory
  // visible, service-eligible) and computes the photo, specialties, experience
  // and rating the app's profile screen renders.
  const lawyers = await getPublicLawyers(country.code);

  return NextResponse.json({
    ok: true,
    countryCode: country.code,
    data: lawyers
      .filter((lawyer) => !lawyer.isReviewAccount)
      .map((lawyer) => ({
        id: lawyer.id,
        countryCode: lawyer.countryCode,
        fullNameAr: lawyer.nameAr,
        fullNameEn: lawyer.nameEn,
        phone: lawyer.phone,
        email: lawyer.email,
        status: lawyer.status,
        subscriptionType: lawyer.subscriptionType,
        subscriptionTypes: lawyer.subscriptionTypes,
        profileImageUrl: lawyer.image,
        professionalTitleAr: lawyer.subtitleAr,
        professionalTitleEn: lawyer.subtitleEn,
        experienceYears: lawyer.experienceYears,
        specialtyMain: lawyer.specialtyMain,
        specialtySubs: lawyer.specialtySubs,
        specialties: lawyer.specialties,
        languages: lawyer.language,
        workingHours: lawyer.workingHours,
        registrationNo: lawyer.registrationNo,
        registrationLevel: lawyer.registrationLevel,
        rating: lawyer.rating,
        reviewCount: lawyer.reviewCount,
      })),
  });
}
