import "server-only";

import type postgres from "postgres";

import { sqlClient } from "@/lib/db/client";
import { markEscalatedAndEnqueue } from "@/lib/mobile-admin/escalation-outbox";
import { createLifecycleStore } from '@/lib/legalsos-account-lifecycle/store';
import {
  rankEligibleCandidates,
  responseDeadline,
  serializeDispatchTimestamp,
  serializeExcludedLawyerIds,
  type DispatchCandidate,
  type RankedCandidate,
} from "./live-dispatch";

export type PaidMobileBooking = {
  id: string;
  countryCode: string;
  locale: string;
  service: string;
  amountBhd: number;
  customerName: string;
  customerPhone: string;
  caseType: string;
  workflowType: "emergency_dispatch" | "direct_consultation";
};

type RequestRow = {
  id: string;
  case_ref: string;
  candidate_lawyer_id: string | null;
  customer_approved_at: Date | string | null;
  lawyer_response_deadline: Date | string | null;
  assigned_lawyer_id: string | null;
  service_status: string;
  excluded_lawyer_ids: unknown;
};

export function mobileCaseRef(bookingId: string): string {
  return `MOBILE-${bookingId}`;
}

export async function findPaidMobileBooking(
  bookingId: string,
): Promise<PaidMobileBooking | null> {
  const rows = await sqlClient<
    Array<{
      id: string;
      country_code: string;
      locale: string;
      description: string | null;
      base_fee_bhd: string | number;
      contact_name: string;
      contact_phone: string;
      case_type: string;
      mobile_payment_case_id: string | null;
      request_payload: Record<string, unknown> | null;
      workflow_type: string | null;
    }>
  >`
    SELECT request.id, request.country_code, request.locale, request.description,
           request.base_fee_bhd, request.contact_name, request.contact_phone,
           request.case_type, request.mobile_payment_case_id, NULL::jsonb request_payload,
           case_type.workflow_type
    FROM public.bahrain_emergency_requests request
    LEFT JOIN public.bahrain_emergency_case_types case_type
      ON case_type.id::text = request.mobile_payment_case_id
    WHERE request.id = ${bookingId}::uuid
      AND payment_status = 'success'
      AND tap_status = 'CAPTURED'
      AND mobile_payment_idempotency_key IS NOT NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const rawCaseType = String(
    row.case_type ?? row.mobile_payment_case_id ?? "",
  );
  if (!rawCaseType) return null;

  return {
    id: row.id,
    countryCode: row.country_code,
    locale: row.locale,
    service: row.description ?? rawCaseType,
    amountBhd: Number(row.base_fee_bhd),
    customerName: row.contact_name,
    customerPhone: row.contact_phone,
    caseType: rawCaseType,
    workflowType: row.workflow_type === "direct_consultation" ? "direct_consultation" : "emergency_dispatch",
  };
}

function excludedIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function candidatePool(
  transaction: postgres.TransactionSql,
  booking: PaidMobileBooking,
): Promise<DispatchCandidate[]> {
  const rows = await transaction<
    Array<{
      id: string;
      name: string;
      profile_image_url: string | null;
      rating: string | number | null;
      specialty_main: string | null;
      live_location: { lat?: unknown; lng?: unknown } | null;
      live_location_updated_at: Date;
      emergency_radius_km: number;
      emergency_rates: Record<string, unknown> | null;
      is_active: boolean;
      status: string;
      suspension_type: string | null;
      is_emergency_ready: boolean;
      location_sharing_enabled: boolean;
      experience_years: number;
      language: string;
      subscription_types: string[];
      created_at: Date;
    }>
  >`
    SELECT lawyers.id,
           COALESCE(NULLIF(lawyers.full_name_ar, ''), NULLIF(lawyers.full_name_en, ''), lawyers.id::text) AS name,
           lawyers.profile_image_url,
           ratings.rating,
           lawyers.specialty_main,
           lawyers.live_location,
           lawyers.live_location_updated_at,
           lawyers.emergency_radius_km,
           lawyers.emergency_rates,
           lawyers.is_active,
           lawyers.status,
           lawyers.suspension_type,
           lawyers.is_emergency_ready,
           lawyers.location_sharing_enabled
           , lawyers.experience_years
           , lawyers.language
           , lawyers.subscription_types
           , lawyers.created_at
    FROM public.bahrain_lawyers lawyers
    LEFT JOIN LATERAL (
      SELECT AVG(review.lawyer_rating)::numeric AS rating
      FROM public.bahrain_booking_reviews review
      WHERE review.lawyer_id = lawyers.id
        AND review.lawyer_rating IS NOT NULL
    ) ratings ON true
    WHERE lawyers.country_code = ${booking.countryCode}
      AND lawyers.is_review_account = false
      AND lawyers.live_location IS NOT NULL
      AND lawyers.live_location_updated_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM bahrain_emergency_requests busy
        WHERE busy.assigned_lawyer_id=lawyers.id
          AND busy.service_status NOT IN ('completed','cancelled','disputed'))
  `;

  return rows.flatMap((row) => {
    const latitude = Number(row.live_location?.lat);
    const longitude = Number(row.live_location?.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const customPrice = Number(row.emergency_rates?.[booking.caseType]);
    return [{
      id: row.id,
      name: row.name,
      profileImageUrl: row.profile_image_url,
      rating: row.rating == null ? null : Number(row.rating),
      specialty: row.specialty_main,
      latitude,
      longitude,
      liveLocationUpdatedAt: row.live_location_updated_at,
      emergencyRadiusKm: row.emergency_radius_km,
      priceBhd: Number.isFinite(customPrice) && customPrice > 0
        ? customPrice
        : booking.amountBhd,
      isActive: row.is_active,
      isApproved: row.status === "approved",
      suspensionType: row.suspension_type,
      isEmergencyReady: row.is_emergency_ready,
      locationSharingEnabled: row.location_sharing_enabled,
      experienceYears: row.experience_years,
      language: row.language,
      subscriptionTypes: row.subscription_types,
      memberSince: row.created_at,
    }];
  });
}

async function consultationCandidatePool(
  transaction: postgres.TransactionSql,
  booking: PaidMobileBooking,
): Promise<RankedCandidate[]> {
  const rows = await transaction<Array<{ id:string; name:string; profile_image_url:string|null; rating:string|number|null; specialty_main:string|null; experience_years:number; language:string; subscription_types:string[]; created_at:Date }>>`
    SELECT lawyers.id,
           COALESCE(NULLIF(lawyers.full_name_ar, ''), NULLIF(lawyers.full_name_en, ''), lawyers.id::text) name,
           lawyers.profile_image_url, ratings.rating, lawyers.specialty_main,
           lawyers.experience_years, lawyers.language,
           lawyers.subscription_types, lawyers.created_at
    FROM public.bahrain_lawyers lawyers
    LEFT JOIN LATERAL (
      SELECT AVG(review.lawyer_rating)::numeric rating FROM public.bahrain_booking_reviews review
      WHERE review.lawyer_id = lawyers.id AND review.lawyer_rating IS NOT NULL
    ) ratings ON true
    WHERE lawyers.country_code = ${booking.countryCode}
      AND lawyers.is_review_account = false AND lawyers.is_active = true
      AND lawyers.status = 'approved' AND lawyers.suspension_type IS NULL
      AND lawyers.is_emergency_ready = true
      AND NOT EXISTS (SELECT 1 FROM bahrain_emergency_requests busy
        WHERE busy.assigned_lawyer_id=lawyers.id
          AND busy.service_status NOT IN ('completed','cancelled','disputed'))
    ORDER BY lawyers.updated_at ASC, lawyers.id ASC
  `;
  return rows.map(row => ({ id:row.id, name:row.name, profileImageUrl:row.profile_image_url,
    rating:row.rating==null?null:Number(row.rating), specialty:row.specialty_main,
    distanceKm:0, priceBhd:booking.amountBhd, experienceYears:row.experience_years,
    language:row.language, subscriptionTypes:row.subscription_types,
    memberSince:row.created_at, verified:true }));
}

export type SelectedCandidateResult = {
  requestId: string;
  candidate: RankedCandidate | null;
  candidateLocation: { lat: number; lng: number } | null;
};

export async function getOrSelectCandidate(input: {
  booking: PaidMobileBooking;
  customerLocation?: { lat: number; lng: number; accuracy?: number; address?: string };
  now?: Date;
}): Promise<SelectedCandidateResult> {
  const now = input.now ?? new Date();
  return sqlClient.begin(async (transaction) => {
    const rows = await transaction<RequestRow[]>`
      SELECT id, case_ref, candidate_lawyer_id, customer_approved_at,
             lawyer_response_deadline, assigned_lawyer_id, service_status,
             excluded_lawyer_ids
      FROM public.bahrain_emergency_requests
      WHERE id = ${input.booking.id}::uuid
      FOR UPDATE
    `;
    const request = rows[0];
    if (!request) throw new Error("dispatch_request_not_found");
    if (request.assigned_lawyer_id || request.service_status !== "pending") {
      throw new Error("dispatch_already_assigned");
    }
    if (
      request.customer_approved_at &&
      request.lawyer_response_deadline &&
      new Date(request.lawyer_response_deadline).getTime() > now.getTime()
    ) {
      throw new Error("lawyer_response_pending");
    }

    let excluded = excludedIds(request.excluded_lawyer_ids);
    if (request.customer_approved_at && request.candidate_lawyer_id) {
      excluded = [...new Set([...excluded, request.candidate_lawyer_id])];
    }
    const direct = input.booking.workflowType === "direct_consultation";
    const pool = direct ? [] : await candidatePool(transaction, input.booking);
    const consultationPool = direct ? await consultationCandidatePool(transaction, input.booking) : [];
    const closedIds = await createLifecycleStore(transaction).closedLawyerIds(
      (direct ? consultationPool : pool).map(item => item.id),
    );
    const ineligibleIds = new Set([...excluded, ...closedIds]);
    const candidate = direct
      ? consultationPool.find(item => !ineligibleIds.has(item.id)) ?? null
      : rankEligibleCandidates({ customerLocation: input.customerLocation!, candidates: pool, excludedLawyerIds: ineligibleIds, now })[0] ?? null;
    const selectedSource = candidate == null
      ? null
        : pool.find((entry) => entry.id === candidate.id) ?? null;
    const nowIso = serializeDispatchTimestamp(now);

    await transaction`
      UPDATE public.bahrain_emergency_requests
      SET candidate_lawyer_id = ${candidate?.id ?? null}::uuid,
          location = ${direct ? null : JSON.stringify(input.customerLocation)}::jsonb,
          candidate_offered_at = ${candidate ? nowIso : null}::timestamptz,
          customer_approved_at = NULL,
          lawyer_response_deadline = NULL,
          excluded_lawyer_ids = ${serializeExcludedLawyerIds(excluded)}::jsonb,
          updated_at = ${nowIso}::timestamptz
      WHERE id = ${request.id}::uuid
    `;
    return {
      requestId: request.id,
      candidate,
      candidateLocation: selectedSource == null
        ? null
        : { lat: selectedSource.latitude, lng: selectedSource.longitude },
    };
  });
}

export async function decideCandidate(input: {
  bookingId: string;
  action: "approve" | "skip";
  candidateId: string;
  now?: Date;
}): Promise<{ approved: boolean; deadline: Date | null }> {
  const now = input.now ?? new Date();
  return sqlClient.begin(async (transaction) => {
    const rows = await transaction<RequestRow[]>`
      SELECT id, case_ref, candidate_lawyer_id, customer_approved_at,
             lawyer_response_deadline, assigned_lawyer_id, service_status,
             excluded_lawyer_ids
      FROM public.bahrain_emergency_requests
      WHERE id = ${input.bookingId}::uuid
      FOR UPDATE
    `;
    const request = rows[0];
    if (!request || request.candidate_lawyer_id !== input.candidateId) {
      throw new Error("candidate_changed");
    }
    if (request.assigned_lawyer_id || request.service_status !== "pending") {
      throw new Error("dispatch_already_assigned");
    }
    if (input.action === "skip") {
      if (
        request.customer_approved_at &&
        request.lawyer_response_deadline &&
        new Date(request.lawyer_response_deadline).getTime() > now.getTime()
      ) throw new Error("lawyer_response_pending");
      const excluded = [...new Set([
        ...excludedIds(request.excluded_lawyer_ids),
        input.candidateId,
      ])];
      const nowIso = serializeDispatchTimestamp(now);
      await transaction`
        UPDATE public.bahrain_emergency_requests
        SET candidate_lawyer_id = NULL, candidate_offered_at = NULL,
            customer_approved_at = NULL, lawyer_response_deadline = NULL,
            excluded_lawyer_ids = ${serializeExcludedLawyerIds(excluded)}::jsonb,
            updated_at = ${nowIso}::timestamptz
        WHERE id = ${request.id}::uuid
      `;
      return { approved: false, deadline: null };
    }
    if (await createLifecycleStore(transaction).isAccountClosed({ role: 'lawyer', id: input.candidateId })) {
      throw new Error('candidate_changed');
    }
    const deadline = responseDeadline(now);
    const nowIso = serializeDispatchTimestamp(now);
    const deadlineIso = serializeDispatchTimestamp(deadline);
    await transaction`
      UPDATE public.bahrain_emergency_requests
      SET customer_approved_at = ${nowIso}::timestamptz,
          lawyer_response_deadline = ${deadlineIso}::timestamptz,
          updated_at = ${nowIso}::timestamptz
      WHERE id = ${request.id}::uuid
        AND candidate_lawyer_id = ${input.candidateId}::uuid
    `;
    return { approved: true, deadline };
  });
}

export async function claimDueLawyerOffers(input: {
  now: Date;
  limit: number;
}): Promise<
  Array<{
    requestId: string;
    lawyerId: string;
    locale: "ar" | "en" | "tr";
    location?: { lat: number; lng: number };
  }>
> {
  return sqlClient.begin(async (transaction) => {
    const rows = await transaction<Array<{
      id: string;
      candidate_lawyer_id: string;
      locale: string;
      location: { lat?: unknown; lng?: unknown } | null;
      excluded_lawyer_ids: unknown;
    }>>`
      SELECT id, candidate_lawyer_id, locale, location, excluded_lawyer_ids
      FROM public.bahrain_emergency_requests
      WHERE service_status = 'pending'
        AND assigned_lawyer_id IS NULL
        AND candidate_lawyer_id IS NOT NULL
        AND customer_approved_at IS NOT NULL
        AND lawyer_response_deadline <= ${serializeDispatchTimestamp(input.now)}::timestamptz
      ORDER BY lawyer_response_deadline ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${Math.min(Math.max(input.limit, 1), 100)}
    `;

    const claimed: Array<{
      requestId: string;
      lawyerId: string;
      locale: "ar" | "en" | "tr";
      location?: { lat: number; lng: number };
    }> = [];
    for (const row of rows) {
      const excluded = [...new Set([...excludedIds(row.excluded_lawyer_ids), row.candidate_lawyer_id])];
      const updated = await transaction<Array<{ id: string }>>`
        UPDATE public.bahrain_emergency_requests
        SET candidate_lawyer_id = NULL,
            candidate_offered_at = NULL,
            customer_approved_at = NULL,
            lawyer_response_deadline = NULL,
            excluded_lawyer_ids = ${serializeExcludedLawyerIds(excluded)}::jsonb,
            updated_at = ${serializeDispatchTimestamp(input.now)}::timestamptz
        WHERE id = ${row.id}::uuid
          AND assigned_lawyer_id IS NULL
          AND lawyer_response_deadline <= ${serializeDispatchTimestamp(input.now)}::timestamptz
        RETURNING id
      `;
      if (updated.length === 0) continue;
      const lat = Number(row.location?.lat);
      const lng = Number(row.location?.lng);
      claimed.push({
        requestId: row.id,
        lawyerId: row.candidate_lawyer_id,
        locale:
          row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
        location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
      });
    }
    return claimed;
  });
}

export async function markAdminEscalated(requestId: string): Promise<boolean> {
  return markEscalatedAndEnqueue(sqlClient as never, requestId);
}
