import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mobileStatus(status: string) {
  return status === "pending" ? "pending_review" : status;
}

export async function GET(request: Request, { params }: Context) {
  const session = await getMobileLawyerSession(request);
  const { id } = await params;

  if (!session || session.lawyerId !== id) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const [lawyer] = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,
      phone: schema.bahrainLawyers.phone,
      email: schema.bahrainLawyers.email,
      licenseNumber: schema.bahrainLawyers.registrationNo,
      profileImageUrl: schema.bahrainLawyers.profileImageUrl,
      status: schema.bahrainLawyers.status,
      isActive: schema.bahrainLawyers.isActive,
      isEmergencyReady: schema.bahrainLawyers.isEmergencyReady,
      rating: sql<number>`coalesce((
        select avg(rating_value)::float
        from (
          select ${schema.emergencyRequests.ratingStars}::float as rating_value
          from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
            and ${schema.emergencyRequests.assignedLawyerId} = ${id}
            and ${schema.emergencyRequests.ratingStars} is not null
          union all
          select ${schema.bookingReviews.lawyerRating}::float
          from ${schema.bookingReviews}
          where ${schema.bookingReviews.countryCode} = ${session.countryCode}
            and ${schema.bookingReviews.lawyerId} = ${id}
            and ${schema.bookingReviews.status} = 'submitted'
            and ${schema.bookingReviews.lawyerRating} is not null
        ) ratings
      ), 0)`,
      totalRequests: sql<number>`(
        (select count(*) from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
            and ${schema.emergencyRequests.assignedLawyerId} = ${id})
        +
        (select count(*) from ${schema.bookingRequests}
          where ${schema.bookingRequests.countryCode} = ${session.countryCode}
            and ${schema.bookingRequests.selectedLawyerId} = ${id})
      )::int`,
      completedRequests: sql<number>`(
        (select count(*) from ${schema.emergencyRequests}
          where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
            and ${schema.emergencyRequests.assignedLawyerId} = ${id}
            and ${schema.emergencyRequests.serviceStatus} = 'completed')
        +
        (select count(*) from ${schema.bookingRequests}
          where ${schema.bookingRequests.countryCode} = ${session.countryCode}
            and ${schema.bookingRequests.selectedLawyerId} = ${id}
            and ${schema.bookingRequests.adminStatus} = 'completed')
      )::int`,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.id, id),
        eq(schema.bahrainLawyers.countryCode, session.countryCode),
      ),
    )
    .limit(1);

  if (!lawyer) {
    return NextResponse.json(
      { success: false, message: "Lawyer not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...lawyer,
      status: mobileStatus(lawyer.status),
      isAvailable: lawyer.isActive && lawyer.isEmergencyReady,
      stats: {
        rating: Number(lawyer.rating || 0),
        totalRequests: Number(lawyer.totalRequests || 0),
        completedRequests: Number(lawyer.completedRequests || 0),
      },
    },
  });
}
