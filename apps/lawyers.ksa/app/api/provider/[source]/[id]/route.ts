import { NextRequest, NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getProviderSessionFromRequest } from "../../_session";
import { getProviderAccessById } from "../../_access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_SOURCES = ["booking", "emergency"] as const;

type Source = (typeof REQUEST_SOURCES)[number];

type RouteContext = {
  params: Promise<{
    source: string;
    id: string;
  }>;
};

function isSource(value: string): value is Source {
  return (REQUEST_SOURCES as readonly string[]).includes(value);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function makeBookingReference(id: string) {
  return `BK-${id.slice(0, 8).toUpperCase()}`;
}

function makeEmergencyReference(id: string) {
  return `EM-${id.slice(0, 8).toUpperCase()}`;
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) return value.toISOString();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function formatBookingType(service: string | null, consultationType: string | null) {
  const cleanService = String(service ?? "").trim();
  const cleanConsultationType = String(consultationType ?? "").trim();

  if (cleanService && cleanConsultationType) {
    return `${cleanService} - ${cleanConsultationType}`;
  }

  return cleanService || cleanConsultationType || "Booking Request";
}

function getLocationAddress(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const address = record.address || record.label || record.name;

  return address ? String(address) : null;
}

function getLocationCoordinates(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const lat = record.lat ?? record.latitude;
  const lng = record.lng ?? record.longitude;

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  return `${lat}, ${lng}`;
}

async function getProvider(providerId: string, countryCode: string) {
  const [provider] = await db
    .select({
      id: schema.saudiLawyers.id,
      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,
      registrationNo: schema.saudiLawyers.registrationNo,
    })
    .from(schema.saudiLawyers)
    .where(
      and(
        eq(schema.saudiLawyers.id, providerId),
        eq(schema.saudiLawyers.countryCode, countryCode),
      ),
    )
    .limit(1);

  return provider ?? null;
}

function buildBookingOwnership(providerId: string, providerEmail: string) {
  return providerEmail
    ? or(
        eq(schema.bookingRequests.selectedLawyerId, providerId),
        sql`lower(coalesce(${schema.bookingRequests.assignedToEmail}, '')) = ${providerEmail}`,
      )
    : eq(schema.bookingRequests.selectedLawyerId, providerId);
}

async function getBookingRequest(
  id: string,
  providerId: string,
  providerEmail: string,
  countryCode: string,
) {
  const [request] = await db
    .select({
      id: schema.bookingRequests.id,
      lang: schema.bookingRequests.lang,
      service: schema.bookingRequests.service,
      consultationType: schema.bookingRequests.consultationType,
      consultationMethod: schema.bookingRequests.consultationMethod,
      consultationPrice: schema.bookingRequests.consultationPrice,
      amountBd: schema.bookingRequests.amountBd,
      durationMinutes: schema.bookingRequests.durationMinutes,
      videoProvider: schema.bookingRequests.videoProvider,
      appointmentDate: schema.bookingRequests.appointmentDate,
      appointmentTime: schema.bookingRequests.appointmentTime,
      assignmentMode: schema.bookingRequests.assignmentMode,
      selectedOfficeName: schema.bookingRequests.selectedOfficeName,
      selectedLawyerId: schema.bookingRequests.selectedLawyerId,
      selectedLawyerName: schema.bookingRequests.selectedLawyerName,
      assignedToEmail: schema.bookingRequests.assignedToEmail,
      customerName: schema.bookingRequests.customerName,
      customerPhone: schema.bookingRequests.customerPhone,
      customerEmail: schema.bookingRequests.customerEmail,
      customerMessage: schema.bookingRequests.customerMessage,
      paymentStatus: schema.bookingRequests.paymentStatus,
      adminStatus: schema.bookingRequests.adminStatus,
      tapStatus: schema.bookingRequests.tapStatus,
      tapChargeId: schema.bookingRequests.tapChargeId,
      createdAt: schema.bookingRequests.createdAt,
      updatedAt: schema.bookingRequests.updatedAt,
    })
    .from(schema.bookingRequests)
    .where(
      and(
        eq(schema.bookingRequests.id, id),
        eq(schema.bookingRequests.countryCode, countryCode),
        buildBookingOwnership(providerId, providerEmail),
      ),
    )
    .limit(1);

  return request ?? null;
}

async function getEmergencyRequest(
  id: string,
  providerId: string,
  countryCode: string,
) {
  const [request] = await db
    .select({
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      description: schema.emergencyRequests.description,
      location: schema.emergencyRequests.location,
      contactName: schema.emergencyRequests.contactName,
      contactPhone: schema.emergencyRequests.contactPhone,
      contactIdNumber: schema.emergencyRequests.contactIdNumber,
      baseFee: schema.emergencyRequests.baseFee,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      paymentRef: schema.emergencyRequests.paymentRef,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      responseTimestamp: schema.emergencyRequests.responseTimestamp,
      arrivalTimestamp: schema.emergencyRequests.arrivalTimestamp,
      completedTimestamp: schema.emergencyRequests.completedTimestamp,
      createdAt: schema.emergencyRequests.createdAt,
      updatedAt: schema.emergencyRequests.updatedAt,
    })
    .from(schema.emergencyRequests)
    .where(
      and(
        eq(schema.emergencyRequests.id, id),
        eq(schema.emergencyRequests.countryCode, countryCode),
        eq(schema.emergencyRequests.assignedLawyerId, providerId),
      ),
    )
    .limit(1);

  return request ?? null;
}

function bookingToResponse(
  request: Awaited<ReturnType<typeof getBookingRequest>>,
  provider: Awaited<ReturnType<typeof getProvider>>,
) {
  if (!request || !provider) return null;

  const providerName =
    request.assignmentMode === "office"
      ? request.selectedOfficeName || request.assignedToEmail || ""
      : provider.fullNameAr ||
        provider.fullNameEn ||
        request.selectedLawyerName ||
        request.assignedToEmail ||
        "";

  return {
    id: request.id,
    reference: makeBookingReference(request.id),
    source: "booking" as const,

    serviceType: formatBookingType(request.service, request.consultationType),
    consultationType: request.consultationType,
    consultationMethod: request.consultationMethod,
    consultationPrice: request.consultationPrice,
    durationMinutes: request.durationMinutes,
    videoProvider: request.videoProvider,

    appointmentDate: request.appointmentDate,
    appointmentTime: request.appointmentTime,

    assignmentMode: request.assignmentMode,
    selectedOfficeName: request.selectedOfficeName,
    selectedLawyerName: request.selectedLawyerName,
    assignedToEmail: request.assignedToEmail,

    clientName: request.customerName,
    clientPhone: request.customerPhone,
    clientEmail: request.customerEmail,
    clientMessage: request.customerMessage,

    status: request.adminStatus || "pending_review",
    paymentStatus: request.paymentStatus || "pending_payment",
    tapStatus: request.tapStatus,
    paymentRef: request.tapChargeId,
    amount: request.amountBd,

    providerName,
    providerEmail: provider.email,
    providerPhone: provider.phone,
    providerRegistrationNo: provider.registrationNo,

    createdAt: normalizeDate(request.createdAt) || new Date().toISOString(),
    updatedAt: normalizeDate(request.updatedAt),
  };
}

function emergencyToResponse(
  request: Awaited<ReturnType<typeof getEmergencyRequest>>,
  provider: Awaited<ReturnType<typeof getProvider>>,
) {
  if (!request || !provider) return null;

  const providerName = provider.fullNameAr || provider.fullNameEn || provider.email || "";

  return {
    id: request.id,
    reference: request.caseRef || makeEmergencyReference(request.id),
    source: "emergency" as const,

    serviceType: request.caseType,
    consultationType: null,
    consultationMethod: null,
    consultationPrice: null,
    durationMinutes: null,
    videoProvider: null,

    appointmentDate: null,
    appointmentTime: null,

    assignmentMode: "lawyer",
    selectedOfficeName: null,
    selectedLawyerName: providerName,
    assignedToEmail: provider.email,

    clientName: request.contactName,
    clientPhone: request.contactPhone,
    clientEmail: null,
    clientIdNumber: request.contactIdNumber,
    clientMessage: request.description,

    locationAddress: getLocationAddress(request.location),
    locationCoordinates: getLocationCoordinates(request.location),

    status: request.serviceStatus || "pending",
    paymentStatus: request.paymentStatus,
    tapStatus: null,
    paymentRef: request.paymentRef,
    amount: request.baseFee,

    providerName,
    providerEmail: provider.email,
    providerPhone: provider.phone,
    providerRegistrationNo: provider.registrationNo,

    responseTimestamp: normalizeDate(request.responseTimestamp),
    arrivalTimestamp: normalizeDate(request.arrivalTimestamp),
    completedTimestamp: normalizeDate(request.completedTimestamp),
    createdAt: normalizeDate(request.createdAt) || new Date().toISOString(),
    updatedAt: normalizeDate(request.updatedAt),
  };
}

async function getOwnedRequest(
  source: Source,
  id: string,
  providerId: string,
  provider: Awaited<ReturnType<typeof getProvider>>,
  countryCode: string,
) {
  const providerEmail = normalizeEmail(provider?.email);

  if (source === "booking") {
    const booking = await getBookingRequest(
      id,
      providerId,
      providerEmail,
      countryCode,
    );
    return bookingToResponse(booking, provider);
  }

  const emergency = await getEmergencyRequest(id, providerId, countryCode);
  return emergencyToResponse(emergency, provider);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = getProviderSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { source: rawSource, id } = await context.params;

  if (!isSource(rawSource)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request source" },
      { status: 400 },
    );
  }

  const source: Source = rawSource;
  const { providerId, countryCode } = session;

  try {
    const accessResult = await getProviderAccessById(providerId, countryCode);

    if (!accessResult) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    if (!accessResult.access.canUseDashboard) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account is locked",
          code: "PROVIDER_ACCOUNT_LOCKED",
          access: accessResult.access,
        },
        { status: 403 },
      );
    }

    const provider = await getProvider(providerId, countryCode);

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    const ownedRequest = await getOwnedRequest(
      source,
      id,
      providerId,
      provider,
      countryCode,
    );

    if (!ownedRequest) {
      return NextResponse.json(
        { ok: false, error: "Request not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, request: ownedRequest });
  } catch (err) {
    console.error("[provider/request-details] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not load request details" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = getProviderSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { source: rawSource, id } = await context.params;

  if (!isSource(rawSource)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request source" },
      { status: 400 },
    );
  }

  const source: Source = rawSource;
  const { providerId, countryCode } = session;

  const body = (await request.json().catch(() => ({}))) as {
    action?: "approve" | "complete";
  };

  const action = body.action;

  if (action !== "approve" && action !== "complete") {
    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 },
    );
  }

  try {
    const accessResult = await getProviderAccessById(providerId, countryCode);

    if (!accessResult) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    if (!accessResult.access.canUseDashboard) {
      return NextResponse.json(
        {
          ok: false,
          error: "Account is locked",
          code: "PROVIDER_ACCOUNT_LOCKED",
          access: accessResult.access,
        },
        { status: 403 },
      );
    }

    const provider = await getProvider(providerId, countryCode);

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    const providerEmail = normalizeEmail(provider.email);

    if (source === "booking") {
      const current = await getBookingRequest(
        id,
        providerId,
        providerEmail,
        countryCode,
      );

      if (!current) {
        return NextResponse.json(
          { ok: false, error: "Request not found" },
          { status: 404 },
        );
      }

      const currentStatus = String(current.adminStatus ?? "").trim().toLowerCase();

      const nextStatus = action === "approve" ? "approved" : "completed";

      const allowed =
        action === "approve"
          ? currentStatus === "pending" || currentStatus === "pending_review"
          : currentStatus === "approved";

      if (!allowed) {
        return NextResponse.json(
          { ok: false, error: "Action is not allowed for current status" },
          { status: 400 },
        );
      }

      await db
        .update(schema.bookingRequests)
        .set({
          adminStatus: nextStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.bookingRequests.id, id),
            eq(schema.bookingRequests.countryCode, countryCode),
            buildBookingOwnership(providerId, providerEmail),
          ),
        );
    }

    if (source === "emergency") {
      const current = await getEmergencyRequest(id, providerId, countryCode);

      if (!current) {
        return NextResponse.json(
          { ok: false, error: "Request not found" },
          { status: 404 },
        );
      }

      const currentStatus = String(current.serviceStatus ?? "").trim().toLowerCase();
      const now = new Date();

      const allowed =
        action === "approve"
          ? currentStatus === "pending" || currentStatus === "accepted"
          : currentStatus === "mobilizing" ||
            currentStatus === "arrived" ||
            currentStatus === "accepted";

      if (!allowed) {
        return NextResponse.json(
          { ok: false, error: "Action is not allowed for current status" },
          { status: 400 },
        );
      }

      await db
        .update(schema.emergencyRequests)
        .set({
          serviceStatus: action === "approve" ? "mobilizing" : "completed",
          ...(action === "approve"
            ? { responseTimestamp: now }
            : { completedTimestamp: now }),
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.emergencyRequests.id, id),
            eq(schema.emergencyRequests.countryCode, countryCode),
            eq(schema.emergencyRequests.assignedLawyerId, providerId),
          ),
        );
    }

    const updatedRequest = await getOwnedRequest(
      source,
      id,
      providerId,
      provider,
      countryCode,
    );

    return NextResponse.json({ ok: true, request: updatedRequest });
  } catch (err) {
    console.error("[provider/request-details] update failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not update request status" },
      { status: 500 },
    );
  }
}