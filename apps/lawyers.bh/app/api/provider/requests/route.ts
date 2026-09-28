import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getProviderSessionFromRequest } from "../_session";
import { getProviderAccessById } from "../_access";
import {
  isProviderVisiblePaidRequest,
  localizeProviderCaseType,
  normalizeProviderOwnershipEmail,
  paginateProviderRequests,
} from "@/lib/provider/provider-request-list";
import { confirmedProviderPaymentSql } from "@/lib/provider/provider-request-sql";
import { requireLawyerTermsForRequests } from "../_terms-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeBookingReference(id: string) {
  return `BK-${id.slice(0, 8).toUpperCase()}`;
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();

  if (value instanceof Date) {
    return value.toISOString();
  }

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

export async function GET(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { providerId, countryCode } = session;

    const termsBlock = await requireLawyerTermsForRequests(providerId);
    if (termsBlock) return termsBlock;

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

    const [provider] = await db
      .select({
        id: schema.bahrainLawyers.id,
        email: schema.bahrainLawyers.email,
      })
      .from(schema.bahrainLawyers)
      .where(
        and(
          eq(schema.bahrainLawyers.id, providerId),
          eq(schema.bahrainLawyers.countryCode, countryCode),
        ),
      )
      .limit(1);

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "Provider not found" },
        { status: 404 },
      );
    }

    const providerEmail = normalizeProviderOwnershipEmail(provider.email);

    const bookingOwnership = providerEmail
      ? or(
          eq(schema.bookingRequests.selectedLawyerId, providerId),
          sql`lower(trim(coalesce(${schema.bookingRequests.assignedToEmail}, ''))) = ${providerEmail}`,
        )
      : eq(schema.bookingRequests.selectedLawyerId, providerId);

    const bookingWhere = and(
      eq(schema.bookingRequests.countryCode, countryCode),
      bookingOwnership,
      confirmedProviderPaymentSql(
        schema.bookingRequests.paymentStatus,
        schema.bookingRequests.tapStatus,
      ),
    );

    const [bookingRequests, emergencyRequests] = await Promise.all([
      db
        .select({
          id: schema.bookingRequests.id,
          service: schema.bookingRequests.service,
          consultationType: schema.bookingRequests.consultationType,
          consultationMethod: schema.bookingRequests.consultationMethod,
          consultationPrice: schema.bookingRequests.consultationPrice,
          amountBd: schema.bookingRequests.amountBd,
          appointmentDate: schema.bookingRequests.appointmentDate,
          appointmentTime: schema.bookingRequests.appointmentTime,
          assignmentMode: schema.bookingRequests.assignmentMode,
          selectedLawyerId: schema.bookingRequests.selectedLawyerId,
          selectedLawyerName: schema.bookingRequests.selectedLawyerName,
          assignedToEmail: schema.bookingRequests.assignedToEmail,
          customerName: schema.bookingRequests.customerName,
          customerPhone: schema.bookingRequests.customerPhone,
          customerEmail: schema.bookingRequests.customerEmail,
          customerMessage: schema.bookingRequests.customerMessage,
          paymentStatus: schema.bookingRequests.paymentStatus,
          tapStatus: schema.bookingRequests.tapStatus,
          adminStatus: schema.bookingRequests.adminStatus,
          createdAt: schema.bookingRequests.createdAt,
        })
        .from(schema.bookingRequests)
        .where(bookingWhere)
        .orderBy(desc(schema.bookingRequests.createdAt)),

      db
        .select({
          id: schema.emergencyRequests.id,
          caseRef: schema.emergencyRequests.caseRef,
          caseType: schema.emergencyRequests.caseType,
          contactName: schema.emergencyRequests.contactName,
          contactPhone: schema.emergencyRequests.contactPhone,
          paymentStatus: schema.emergencyRequests.paymentStatus,
          tapStatus: schema.emergencyRequests.tapStatus,
          serviceStatus: schema.emergencyRequests.serviceStatus,
          baseFeeBhd: schema.emergencyRequests.baseFeeBhd,
          createdAt: schema.emergencyRequests.createdAt,
        })
        .from(schema.emergencyRequests)
        .where(
          and(
            eq(schema.emergencyRequests.countryCode, countryCode),
            eq(schema.emergencyRequests.assignedLawyerId, providerId),
            confirmedProviderPaymentSql(
              schema.emergencyRequests.paymentStatus,
              schema.emergencyRequests.tapStatus,
            ),
          ),
        )
        .orderBy(desc(schema.emergencyRequests.createdAt)),
    ]);

    const requests = [
      ...bookingRequests.filter(isProviderVisiblePaidRequest).map((item) => ({
        id: item.id,
        reference: makeBookingReference(item.id),
        source: "booking" as const,
        serviceType: formatBookingType(item.service, item.consultationType),
        consultationType: item.consultationType,
        consultationMethod: item.consultationMethod,
        consultationPrice: item.consultationPrice,
        appointmentDate: item.appointmentDate,
        appointmentTime: item.appointmentTime,
        assignmentMode: item.assignmentMode,
        selectedLawyerName: item.selectedLawyerName,
        assignedToEmail: item.assignedToEmail,
        clientName: item.customerName,
        clientPhone: item.customerPhone,
        clientEmail: item.customerEmail,
        clientMessage: item.customerMessage,
        status: item.adminStatus,
        paymentStatus: item.paymentStatus,
        tapStatus: item.tapStatus,
        amount: item.amountBd,
        createdAt: normalizeDate(item.createdAt),
        searchableText: [item.customerName, item.customerPhone, item.customerEmail, item.service, item.consultationType, makeBookingReference(item.id)].filter(Boolean).join(" "),
      })),

      ...emergencyRequests.filter(isProviderVisiblePaidRequest).map((item) => ({
        id: item.id,
        reference: item.caseRef || `EM-${item.id.slice(0, 8).toUpperCase()}`,
        source: "emergency" as const,
        serviceType: item.caseType,
        caseTypeCode: item.caseType,
        caseTypeLabelAr: localizeProviderCaseType(item.caseType).ar,
        caseTypeLabelEn: localizeProviderCaseType(item.caseType).en,
        consultationType: null,
        consultationMethod: null,
        consultationPrice: null,
        appointmentDate: null,
        appointmentTime: null,
        assignmentMode: "lawyer",
        selectedLawyerName: null,
        assignedToEmail: providerEmail || null,
        clientName: item.contactName,
        clientPhone: item.contactPhone,
        clientEmail: null,
        clientMessage: null,
        status: item.serviceStatus,
        paymentStatus: item.paymentStatus,
        tapStatus: item.tapStatus,
        amount: item.baseFeeBhd,
        createdAt: normalizeDate(item.createdAt),
        searchableText: [item.contactName, item.contactPhone, item.caseRef, localizeProviderCaseType(item.caseType).ar, localizeProviderCaseType(item.caseType).en].filter(Boolean).join(" "),
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const paginated = paginateProviderRequests(requests, {
      page,
      source: url.searchParams.get("source") ?? "all",
      status: url.searchParams.get("status") ?? "all",
      query: (url.searchParams.get("query") ?? "").slice(0, 120),
    });
    return NextResponse.json({
      ok: true,
      // searchableText is an internal server-only field used before slicing.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      requests: paginated.items.map(({ searchableText: _searchableText, ...item }) => item),
      pagination: { page: paginated.page, pageSize: paginated.pageSize, totalItems: paginated.totalItems, totalPages: paginated.totalPages },
    });
  } catch (err) {
    console.error("[provider/requests] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not load provider requests" },
      { status: 500 },
    );
  }
}
