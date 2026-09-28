import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { bearerToken, authorizeMobileDispatchToken } from "@/lib/sos/mobile-dispatch-auth";
import { computeDrivingRoute } from "@/lib/sos/google-routes";
import { resolveTrackingState } from "@/lib/sos/tracking-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!await authorizeMobileDispatchToken(requestId, bearerToken(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await sqlClient<Array<{
    id: string; candidate_lawyer_id: string | null; assigned_lawyer_id: string | null;
    case_ref: string; case_type: string; description: string | null;
    payment_status: string; service_status: string; base_fee_bhd: string | number;
    created_at: Date | string;
    workflow_type: string | null;
    location: { lat?: unknown; lng?: unknown; address?: unknown } | null;
    last_advocate_location: {
      lat?: unknown; lng?: unknown; accuracy?: unknown; reportedAt?: unknown;
    } | null;
    customer_approved_at: Date | string | null;
    lawyer_response_deadline: Date | string | null;
    admin_escalated_at: Date | string | null;
    candidate_name: string | null; assigned_name: string | null;
    candidate_profile_image_url: string | null; assigned_profile_image_url: string | null;
    candidate_rating: string | number | null; assigned_rating: string | number | null;
    candidate_specialty: string | null; assigned_specialty: string | null;
  }>>`
    SELECT request.id, request.case_ref, request.case_type, request.description,
           case_type.workflow_type,
           request.payment_status, request.service_status, request.base_fee_bhd,
           request.created_at, request.location, request.last_advocate_location,
           request.candidate_lawyer_id, request.assigned_lawyer_id,
           request.customer_approved_at, request.lawyer_response_deadline,
           request.admin_escalated_at,
           COALESCE(candidate.full_name_ar, candidate.full_name_en) candidate_name,
           COALESCE(assigned.full_name_ar, assigned.full_name_en) assigned_name,
           candidate.profile_image_url candidate_profile_image_url,
           assigned.profile_image_url assigned_profile_image_url,
           candidate.specialty_main candidate_specialty,
           assigned.specialty_main assigned_specialty,
           candidate_ratings.rating candidate_rating,
           assigned_ratings.rating assigned_rating
    FROM public.bahrain_emergency_requests request
    LEFT JOIN public.bahrain_emergency_case_types case_type
      ON case_type.id::text = request.mobile_payment_case_id
    LEFT JOIN public.bahrain_lawyers candidate ON candidate.id = request.candidate_lawyer_id
    LEFT JOIN public.bahrain_lawyers assigned ON assigned.id = request.assigned_lawyer_id
    LEFT JOIN LATERAL (
      SELECT AVG(review.lawyer_rating)::numeric AS rating
      FROM public.bahrain_booking_reviews review
      WHERE review.lawyer_id = candidate.id AND review.lawyer_rating IS NOT NULL
    ) candidate_ratings ON true
    LEFT JOIN LATERAL (
      SELECT AVG(review.lawyer_rating)::numeric AS rating
      FROM public.bahrain_booking_reviews review
      WHERE review.lawyer_id = assigned.id AND review.lawyer_rating IS NOT NULL
    ) assigned_ratings ON true
    WHERE request.id = ${requestId}::uuid LIMIT 1
  `;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const now = new Date();
  const deadline = row.lawyer_response_deadline == null
    ? null
    : new Date(row.lawyer_response_deadline);
  const awaiting = row.customer_approved_at !== null && row.assigned_lawyer_id === null && deadline !== null && Number.isFinite(deadline.getTime()) && deadline.getTime() > now.getTime();
  const canChangeLawyer = row.assigned_lawyer_id === null && row.customer_approved_at !== null && !awaiting;
  const createdAt = new Date(row.created_at);
  const locationAddress = typeof row.location?.address === "string"
    ? row.location.address
    : null;
  const customerLat = Number(row.location?.lat);
  const customerLng = Number(row.location?.lng);
  const lawyerLat = Number(row.last_advocate_location?.lat);
  const lawyerLng = Number(row.last_advocate_location?.lng);
  const trackingStatus = resolveTrackingState(
    row.service_status,
    row.last_advocate_location?.reportedAt,
    now,
  );
  const hasCustomerCoordinates =
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng);
  const hasLawyerCoordinates =
    row.service_status === "mobilizing" &&
    Number.isFinite(lawyerLat) &&
    Number.isFinite(lawyerLng);
  const hasTrackingCoordinates =
    trackingStatus.state === "live" &&
    hasCustomerCoordinates &&
    hasLawyerCoordinates;
  const customerLocation = hasCustomerCoordinates
    ? { lat: customerLat, lng: customerLng }
    : null;
  const lawyerLocation = hasLawyerCoordinates
    ? {
        lat: lawyerLat,
        lng: lawyerLng,
        accuracy: Number.isFinite(Number(row.last_advocate_location?.accuracy))
          ? Number(row.last_advocate_location?.accuracy)
          : null,
        reportedAt: trackingStatus.reportedAt,
      }
    : null;
  const googleRoute = hasTrackingCoordinates
    ? await computeDrivingRoute({
        origin: { lat: lawyerLat, lng: lawyerLng },
        destination: { lat: customerLat, lng: customerLng },
      }, {
        onFailure: (reason) => console.warn(
          "[sos-tracking] Driving route unavailable",
          { requestId, reason },
        ),
      })
    : null;
  const tracking = hasTrackingCoordinates && googleRoute ? {
    customerLocation,
    lawyerLocation,
    etaMinutes: googleRoute.etaMinutes,
    distanceKm: googleRoute.distanceKm,
    encodedPolyline: googleRoute.encodedPolyline,
    freshUntil: trackingStatus.freshUntil,
  } : null;
  return NextResponse.json({
    requestId: row.id,
    requestReference: row.case_ref,
    caseType: row.case_type,
    description: row.description,
    paymentStatus: row.payment_status,
    serviceStatus: row.service_status,
    workflowType: row.workflow_type ?? "emergency_dispatch",
    amount: Number(row.base_fee_bhd),
    currency: "BHD",
    createdAt: createdAt.toISOString(),
    locationAddress,
    state: row.assigned_lawyer_id
      ? "accepted"
      : awaiting
        ? "awaiting_lawyer"
        : row.admin_escalated_at
          ? "awaiting_on_call_assignment"
          : canChangeLawyer
            ? "change_available"
            : "candidate_review",
    candidate: row.candidate_lawyer_id ? {
      id: row.candidate_lawyer_id,
      name: row.candidate_name,
      profileImageUrl: row.candidate_profile_image_url,
      rating: row.candidate_rating == null ? null : Number(row.candidate_rating),
      specialty: row.candidate_specialty,
      etaMinutes: null,
      distanceKm: null,
      priceBhd: Number(row.base_fee_bhd),
    } : null,
    acceptedLawyer: row.assigned_lawyer_id ? {
      id: row.assigned_lawyer_id,
      name: row.assigned_name,
      profileImageUrl: row.assigned_profile_image_url,
      rating: row.assigned_rating == null ? null : Number(row.assigned_rating),
      specialty: row.assigned_specialty,
      etaMinutes: null,
      distanceKm: null,
      priceBhd: Number(row.base_fee_bhd),
    } : null,
    deadline: deadline?.toISOString() ?? null,
    serverNow: now.toISOString(),
    canChangeLawyer,
    trackingState:
      hasTrackingCoordinates && !googleRoute
        ? "calculating_route"
        : trackingStatus.state,
    customerLocation,
    lawyerLocation,
    tracking,
  }, { headers: { "cache-control": "no-store" } });
}
