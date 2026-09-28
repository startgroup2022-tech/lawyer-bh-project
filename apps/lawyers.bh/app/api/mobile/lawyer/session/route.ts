import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function mobileStatus(status: string) {
  return status === "pending" ? "pending_review" : status;
}

export async function GET(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) return json({ ok: false, error: "UNAUTHORIZED" }, 401);

  const [lawyer] = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      nameAr: schema.bahrainLawyers.fullNameAr,
      nameEn: schema.bahrainLawyers.fullNameEn,
      email: schema.bahrainLawyers.email,
      phone: schema.bahrainLawyers.phone,
      registrationNo: schema.bahrainLawyers.registrationNo,
      status: schema.bahrainLawyers.status,
      active: schema.bahrainLawyers.isActive,
      emergencyReady: schema.bahrainLawyers.isEmergencyReady,
      image: schema.bahrainLawyers.profileImageUrl,
      rating: sql<number>`coalesce((
        select avg(rating_value)::float
        from (
          select ${schema.emergencyRequests.ratingStars}::float as rating_value
          from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
            and ${schema.emergencyRequests.assignedLawyerId} = ${session.lawyerId}
            and ${schema.emergencyRequests.ratingStars} is not null
          union all
          select ${schema.bookingReviews.lawyerRating}::float
          from ${schema.bookingReviews}
          where ${schema.bookingReviews.countryCode} = ${session.countryCode}
            and ${schema.bookingReviews.lawyerId} = ${session.lawyerId}
            and ${schema.bookingReviews.status} = 'submitted'
            and ${schema.bookingReviews.lawyerRating} is not null
        ) ratings
      ), 0)`,
      totalRequests: sql<number>`(
        (select count(*) from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
            and ${schema.emergencyRequests.assignedLawyerId} = ${session.lawyerId})
        +
        (select count(*) from ${schema.bookingRequests}
          where ${schema.bookingRequests.countryCode} = ${session.countryCode}
            and ${schema.bookingRequests.selectedLawyerId} = ${session.lawyerId})
      )::int`,
      completedRequests: sql<number>`(
        (select count(*) from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
            and ${schema.emergencyRequests.assignedLawyerId} = ${session.lawyerId}
            and ${schema.emergencyRequests.serviceStatus} = 'completed')
        +
        (select count(*) from ${schema.bookingRequests}
          where ${schema.bookingRequests.countryCode} = ${session.countryCode}
            and ${schema.bookingRequests.selectedLawyerId} = ${session.lawyerId}
            and ${schema.bookingRequests.adminStatus} = 'completed')
      )::int`,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.id, session.lawyerId),
        eq(schema.bahrainLawyers.countryCode, session.countryCode),
      ),
    )
    .limit(1);

  if (!lawyer) return json({ ok: false, error: "LAWYER_NOT_FOUND" }, 404);
  if (lawyer.status === "rejected" || lawyer.status === "suspended") {
    return json({ ok: false, error: "ACCOUNT_UNAVAILABLE" }, 403);
  }

  const active = Boolean(lawyer.active);
  const emergencyReady = Boolean(lawyer.emergencyReady);

  return json({
    ok: true,
    lawyer: {
      id: lawyer.id,
      countryCode: lawyer.countryCode,
      nameAr: lawyer.nameAr,
      nameEn: lawyer.nameEn,
      email: lawyer.email,
      phone: lawyer.phone,
      registrationNo: lawyer.registrationNo,
      status: mobileStatus(lawyer.status),
      active,
      emergencyReady,
      isAvailable: active && emergencyReady,
      image: lawyer.image,
      rating: Number(lawyer.rating || 0),
      totalRequests: Number(lawyer.totalRequests || 0),
      completedRequests: Number(lawyer.completedRequests || 0),
    },
  });
}
