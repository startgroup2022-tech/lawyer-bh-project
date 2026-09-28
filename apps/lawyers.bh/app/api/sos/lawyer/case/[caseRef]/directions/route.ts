import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { computeDrivingRoute } from "@/lib/sos/google-routes";
import { requireAdvocateRequest } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Coordinates = { lat: number; lng: number };

function coordinates(value: unknown): Coordinates | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { lat, lng } = value as Record<string, unknown>;
  if (
    typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180
  ) return null;
  return { lat, lng };
}

function error(code: string, status: number) {
  return NextResponse.json({ error: code }, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocateRequest(request);
  if (!auth.ok) return error("unauthenticated", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("invalid_origin", 400);
  }
  const origin = coordinates(
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).origin
      : null,
  );
  if (!origin) return error("invalid_origin", 400);

  const { caseRef } = await params;
  const rows = await sqlClient<Array<{
    assigned_lawyer_id: string | null;
    service_status: string;
    location: unknown;
    mobile_payment_case_id: string | null;
    workflow_type: string | null;
  }>>`
    SELECT request.assigned_lawyer_id, request.service_status,
           request.location, request.mobile_payment_case_id,
           case_type.workflow_type
    FROM public.bahrain_emergency_requests request
    LEFT JOIN public.bahrain_emergency_case_types case_type
      ON case_type.id::text = request.mobile_payment_case_id
     AND case_type.country_code = request.country_code
    WHERE request.case_ref = ${caseRef}
      AND request.country_code = ${auth.advocate.countryCode}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return error("not_found", 404);
  if (row.assigned_lawyer_id !== auth.advocate.id) {
    return error("not_your_case", 403);
  }
  if (
    row.service_status !== "mobilizing" ||
    (row.mobile_payment_case_id !== null && row.workflow_type !== "emergency_dispatch")
  ) {
    return error("invalid_transition", 409);
  }
  const destination = coordinates(row.location);
  if (!destination) return error("request_has_no_location", 409);

  const route = await computeDrivingRoute({ origin, destination }, {
    onFailure: reason => console.warn("[lawyer-directions] route unavailable", {
      caseRef,
      reason,
    }),
  });
  if (!route) return NextResponse.json({ origin, destination, routeAvailable: false }, {
    headers: { "cache-control": "no-store" },
  });

  return NextResponse.json({ origin, destination, ...route }, {
    headers: { "cache-control": "no-store" },
  });
}
