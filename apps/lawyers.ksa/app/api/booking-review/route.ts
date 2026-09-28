import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ratingKeys = [
  "lawyerRating",
  "serviceSpeedRating",
  "serviceQualityRating",
  "providerCommunicationRating",
  "appointmentCommitmentRating",
  "platformEaseRating",
  "overallRating",
] as const;

type RatingKey = (typeof ratingKeys)[number];

function hashReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cleanText(value: unknown, max = 1200) {
  return String(value ?? "").trim().slice(0, max);
}

function readRating(data: Record<string, unknown>, key: RatingKey) {
  const rating = Number(data[key]);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return rating;
}

function isExpired(value: Date | string | null | undefined) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}

function toPublicReviewStatus(review: {
  status: string;
  submittedAt: Date | string | null;
  tokenExpiresAt: Date | string | null;
}) {
  if (review.status === "submitted" || review.submittedAt) {
    return "submitted";
  }

  if (isExpired(review.tokenExpiresAt)) {
    return "expired";
  }

  return "pending";
}

async function findReview(bookingId: string, token: string) {
  const tokenHash = hashReviewToken(token);

  const [review] = await db
    .select({
      id: schema.bookingReviews.id,
      bookingRequestId: schema.bookingReviews.bookingRequestId,
      lawyerId: schema.bookingReviews.lawyerId,
      providerName: schema.bookingReviews.providerName,
      customerName: schema.bookingReviews.customerName,
      customerEmail: schema.bookingReviews.customerEmail,
      service: schema.bookingReviews.service,
      consultationType: schema.bookingReviews.consultationType,
      appointmentDate: schema.bookingReviews.appointmentDate,
      appointmentTime: schema.bookingReviews.appointmentTime,
      reviewEmailStatus: schema.bookingReviews.reviewEmailStatus,
      status: schema.bookingReviews.status,
      tokenExpiresAt: schema.bookingReviews.tokenExpiresAt,
      submittedAt: schema.bookingReviews.submittedAt,
      adminStatus: schema.bookingRequests.adminStatus,
    })
    .from(schema.bookingReviews)
    .innerJoin(
      schema.bookingRequests,
      eq(schema.bookingReviews.bookingRequestId, schema.bookingRequests.id),
    )
    .where(
      and(
        eq(schema.bookingReviews.bookingRequestId, bookingId),
        eq(schema.bookingReviews.reviewTokenHash, tokenHash),
      ),
    )
    .limit(1);

  return review ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = cleanText(url.searchParams.get("bookingId"), 80);
  const token = cleanText(url.searchParams.get("token"), 200);

  if (!bookingId || !token) {
    return NextResponse.json(
      { ok: false, error: "Missing review link details" },
      { status: 400 },
    );
  }

  const review = await findReview(bookingId, token);

  if (!review) {
    return NextResponse.json(
      { ok: false, error: "Invalid review link" },
      { status: 404 },
    );
  }

  if (review.adminStatus !== "completed") {
    return NextResponse.json(
      { ok: false, error: "Review is available after completion only" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: toPublicReviewStatus(review),
    booking: {
      id: review.bookingRequestId,
      providerName: review.providerName,
      service: review.service,
      consultationType: review.consultationType,
      appointmentDate: review.appointmentDate,
      appointmentTime: review.appointmentTime,
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const data =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const bookingId = cleanText(data.bookingId, 80);
  const token = cleanText(data.token, 200);

  if (!bookingId || !token) {
    return NextResponse.json(
      { ok: false, error: "Missing review link details" },
      { status: 400 },
    );
  }

  const review = await findReview(bookingId, token);

  if (!review) {
    return NextResponse.json(
      { ok: false, error: "Invalid review link" },
      { status: 404 },
    );
  }

  if (review.adminStatus !== "completed") {
    return NextResponse.json(
      { ok: false, error: "Review is available after completion only" },
      { status: 409 },
    );
  }

  if (review.status === "submitted" || review.submittedAt) {
    return NextResponse.json(
      { ok: false, error: "Review has already been submitted" },
      { status: 409 },
    );
  }

  if (isExpired(review.tokenExpiresAt)) {
    await db
      .update(schema.bookingReviews)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(schema.bookingReviews.id, review.id));

    return NextResponse.json(
      { ok: false, error: "Review link has expired" },
      { status: 410 },
    );
  }

  const ratings = ratingKeys.reduce(
    (acc, key) => {
      const rating = readRating(data, key);

      if (rating !== null) {
        acc[key] = rating;
      }

      return acc;
    },
    {} as Record<RatingKey, number>,
  );

  if (ratingKeys.some((key) => !ratings[key])) {
    return NextResponse.json(
      { ok: false, error: "Please complete all ratings" },
      { status: 400 },
    );
  }

  const submittedAt = new Date();

  await db
    .update(schema.bookingReviews)
    .set({
      status: "submitted",

      lawyerRating: ratings.lawyerRating,
      serviceSpeedRating: ratings.serviceSpeedRating,
      serviceQualityRating: ratings.serviceQualityRating,
      providerCommunicationRating: ratings.providerCommunicationRating,
      appointmentCommitmentRating: ratings.appointmentCommitmentRating,
      platformEaseRating: ratings.platformEaseRating,
      overallRating: ratings.overallRating,

      lawyerComment: cleanText(data.lawyerComment, 1200),
      serviceComment: cleanText(data.serviceComment, 1200),
      publicComment: data.publicComment !== false,

      submittedAt,
      updatedAt: submittedAt,
    })
    .where(eq(schema.bookingReviews.id, review.id));

  return NextResponse.json({
    ok: true,
  });
}
