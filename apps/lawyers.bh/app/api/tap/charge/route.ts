import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/tap";
import { isEmail, str } from "@/lib/postmark";
import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
} from "@/lib/db/country-tables";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { findConsultationMethod } from "@/lib/booking/consultationMethodCatalog";
import { getTapMode } from "@/lib/tap/config";
import { getCaseTypeBySlug } from "@/lib/sos/caseTypes";
import { attachDiscountToCharge, loadDiscountQuote, reserveDiscount } from "@/lib/discounts/repository";
import { parseBhdToFils } from "@/lib/discounts/pricing";
import { DiscountError, type DiscountQuote } from "@/lib/discounts/service";
import { getChargeRecipient } from "@/lib/payments/charge-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConsultMethod = string;
type AssignmentMode = "office" | "lawyer";
type PaymentFlow = "book_appointment" | "sos";

type ResolvedLawyer = {
  id: string;
  name: string;
  email: string;
  ibanNumber: string;
  payoutReady: boolean;
  destinationId: string | null;
};

type TapChargeResponse = {
  id?: string;
  status?: string;
  transaction?: {
    url?: string;
  };
  errors?: {
    code?: string;
    description?: string;
  }[];
  message?: string;
};

function cleanText(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeAssignmentMode(value: unknown): AssignmentMode {
  return value === "lawyer" ? "lawyer" : "office";
}

function normalizeLawyerLookupName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+-\s+.*$/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/^(المستشار|المحامي|الأستاذ|الاستاذ|دكتور|د\.?)\s+/i, "")
    .replace(/^(advocate|lawyer|consultant|dr\.?)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function extractEmail(value: unknown) {
  const match = String(value ?? "").match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  return match?.[0]?.toLowerCase() ?? "";
}

function getTapTransactionUrl(charge: unknown) {
  const payload = charge as {
    transaction?: {
      url?: string;
    };
  };

  return String(payload.transaction?.url ?? "").trim();
}

function getLawyerDisplayName(lawyer: {
  id: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  email: string | null;
}) {
  return lawyer.full_name_ar || lawyer.full_name_en || lawyer.email || lawyer.id;
}

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

  return {
    firstName: parts[0] || "Customer",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "Customer",
  };
}

function getTapErrorMessage(data: TapChargeResponse) {
  return data.errors?.[0]?.description || data.message || "Tap charge failed";
}

function normalizeTapPhone(phone: string) {
  const cleanPhone = phone.replace(/\s+/g, "").replace(/-/g, "");

  if (cleanPhone.startsWith("+973")) {
    return {
      country_code: "973",
      number: cleanPhone.slice(4),
    };
  }

  if (cleanPhone.startsWith("973")) {
    return {
      country_code: "973",
      number: cleanPhone.slice(3),
    };
  }

  return {
    country_code: "973",
    number: cleanPhone || "00000000",
  };
}

function normalizeSourceId(data: Record<string, unknown>) {
  return cleanText(data.sourceId ?? data.tapTokenId ?? data.tokenId, 160);
}

function isBenefitPaySource(data: Record<string, unknown>, sourceId: string) {
  return data.paymentSourceType === "benefitpay" || sourceId === "src_bh.benefit";
}

function validateSourceId(data: Record<string, unknown>) {
  const sourceId = normalizeSourceId(data);
  const benefitPay = isBenefitPaySource(data, sourceId);

  if (benefitPay) {
    if (sourceId !== "src_bh.benefit") {
      return {
        ok: false as const,
        sourceId,
        error: "BenefitPay source.id must be src_bh.benefit.",
      };
    }

    return {
      ok: true as const,
      sourceId,
      benefitPay,
    };
  }

  if (!sourceId || !sourceId.startsWith("tok_")) {
    return {
      ok: false as const,
      sourceId,
      error:
        "Missing Tap payment token. source.id must be tok_... from Tap SDK, or src_bh.benefit for BenefitPay.",
    };
  }

  return {
    ok: true as const,
    sourceId,
    benefitPay,
  };
}

async function createTapCharge(input: {
  request: Request;
  tapSecretKey: string;
  tapMerchantId?: string;
  amountBD: number;
  sourceId: string;
  description: string;
  statementDescriptor: string;
  customerName: string;
  email?: string;
  phone: string;
  redirectPath: string;
  postPath?: string;
  reference: {
    transaction: string;
    order: string;
  };
  metadata: Record<string, unknown>;
}) {
  const origin = siteOrigin(input.request);
  const { firstName, lastName } = splitCustomerName(input.customerName);
  const redirectUrl = `${origin}${input.redirectPath}`;
  const postUrl = input.postPath
    ? `${origin}${input.postPath}`
    : `${origin}/api/tap/webhook`;

  const chargePayload = {
    amount: Number(input.amountBD.toFixed(3)),
    currency: "BHD",
    threeDSecure: true,
    save_card: false,
    description: input.description,
    statement_descriptor: input.statementDescriptor,

    reference: input.reference,

    customer: {
      first_name: firstName,
      last_name: lastName,
      email: input.email || "customer@example.com",
      phone: normalizeTapPhone(input.phone),
    },

    merchant: input.tapMerchantId
      ? {
          id: input.tapMerchantId,
        }
      : undefined,

    source: {
      id: input.sourceId,
    },

    redirect: {
      url: redirectUrl,
    },

    post: {
      url: postUrl,
    },

    metadata: input.metadata,
  };

  const tapResponse = await fetch("https://api.tap.company/v2/charges", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.tapSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chargePayload),
  });

  const charge = (await tapResponse.json()) as TapChargeResponse;

  return {
    tapResponse,
    charge,
    transactionUrl: getTapTransactionUrl(charge),
    tapChargeId: String(charge.id ?? "").trim(),
    tapStatus: String(charge.status ?? "").trim(),
  };
}

async function resolveSelectedLawyer(input: {
  assignmentMode: AssignmentMode;
  selectedLawyerId: string;
  selectedLawyerName: string;
  countryCode: string;
  lawyersTable: string;
}): Promise<ResolvedLawyer | null> {
  if (input.assignmentMode !== "lawyer") return null;
  const tapEnvironment = getTapMode();

  if (isUuid(input.selectedLawyerId)) {
    const rows = await sqlClient`
      SELECT lawyers.id, lawyers.full_name_ar, lawyers.full_name_en, lawyers.email,
        lawyers.iban_number,
        (tap_onboarding.stage = 'active' AND tap_onboarding.payout_enabled = true
          AND tap_onboarding.destination_id IS NOT NULL) AS payout_ready,
        tap_onboarding.destination_id
      FROM ${sqlClient(input.lawyersTable)} lawyers
      LEFT JOIN bahrain_tap_retailer_onboarding tap_onboarding
        ON tap_onboarding.lawyer_id = lawyers.id
       AND tap_onboarding.environment = ${tapEnvironment}
      WHERE lawyers.id = ${input.selectedLawyerId}::uuid
        AND lawyers.country_code = ${input.countryCode}
        AND lawyers.is_active = true
        AND lawyers.status = 'approved'
        AND lawyers.suspension_type IS NULL
      LIMIT 1
    `;

    const lawyer = rows[0] as
      | {
          id: string;
          full_name_ar: string | null;
          full_name_en: string | null;
          email: string | null;
          iban_number: string | null;
          payout_ready: boolean | null;
          destination_id: string | null;
        }
      | undefined;

    if (lawyer) {
      return {
        id: lawyer.id,
        name: getLawyerDisplayName(lawyer),
        email: lawyer.email || "",
        ibanNumber: lawyer.iban_number || "",
        payoutReady: lawyer.payout_ready === true,
        destinationId: lawyer.destination_id,
      };
    }
  }

  const lookupName = normalizeLawyerLookupName(input.selectedLawyerName);
  const lookupEmail = extractEmail(
    `${input.selectedLawyerId} ${input.selectedLawyerName}`,
  );

  if (!lookupName && !lookupEmail) return null;

  const lookupPattern = lookupName ? `%${lookupName}%` : "";

  const rows = await sqlClient`
    SELECT lawyers.id, lawyers.full_name_ar, lawyers.full_name_en, lawyers.email,
      lawyers.iban_number,
      (tap_onboarding.stage = 'active' AND tap_onboarding.payout_enabled = true
        AND tap_onboarding.destination_id IS NOT NULL) AS payout_ready,
      tap_onboarding.destination_id
    FROM ${sqlClient(input.lawyersTable)} lawyers
    LEFT JOIN bahrain_tap_retailer_onboarding tap_onboarding
      ON tap_onboarding.lawyer_id = lawyers.id
     AND tap_onboarding.environment = ${tapEnvironment}
    WHERE lawyers.country_code = ${input.countryCode}
      AND lawyers.is_active = true
      AND lawyers.status = 'approved'
      AND lawyers.suspension_type IS NULL
      AND (
        (
          ${lookupName} <> ''
          AND (
            coalesce(lawyers.full_name_ar, '') ILIKE ${lookupPattern}
            OR coalesce(lawyers.full_name_en, '') ILIKE ${lookupPattern}
            OR ${lookupName} ILIKE ('%' || coalesce(lawyers.full_name_ar, '') || '%')
            OR ${lookupName} ILIKE ('%' || coalesce(lawyers.full_name_en, '') || '%')
          )
        )
        OR (
          ${lookupEmail} <> ''
          AND lower(coalesce(lawyers.email, '')) = ${lookupEmail}
        )
      )
    LIMIT 1
  `;

  const lawyer = rows[0] as
    | {
        id: string;
        full_name_ar: string | null;
        full_name_en: string | null;
        email: string | null;
        iban_number: string | null;
        payout_ready: boolean | null;
        destination_id: string | null;
      }
    | undefined;

  if (!lawyer) return null;

  return {
    id: lawyer.id,
    name: getLawyerDisplayName(lawyer),
    email: lawyer.email || "",
    ibanNumber: lawyer.iban_number || "",
    payoutReady: lawyer.payout_ready === true,
    destinationId: lawyer.destination_id,
  };
}

function getDefaultAssignedEmail() {
  return (
    process.env.PROFESSIONAL_OFFICE_EMAIL ||
    process.env.ADMIN_REQUEST_EMAIL ||
    process.env.POSTMARK_TO_EMAIL ||
    "info@lawyers.bh"
  );
}

async function handleSosCharge(input: {
  request: Request;
  data: Record<string, unknown>;
  tapSecretKey: string;
  tapMerchantId?: string;
  sourceId: string;
}) {
  const data = input.data;
  const lang = data.lang === "ar" || data.locale === "ar" ? "ar" : "en";
  const resolvedCaseType = getCaseTypeBySlug(cleanText(data.caseType, 120));
  let amountBD = resolvedCaseType?.baseFeeBhd ?? 0;
  const name = cleanText(data.name ?? data.fullName, 120);
  const phone = cleanText(data.phone, 40);
  const email = cleanText(data.email, 120).toLowerCase();
  const caseType = cleanText(data.caseType, 120);
  const service = cleanText(data.service, 200) || "Legal SOS";
  const countryCode =
    cleanText(data.countryCode ?? data.country_code ?? data.country, 2)
      .toUpperCase() || "BH";

  if (!resolvedCaseType || !Number.isFinite(amountBD) || amountBD <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid amount" },
      { status: 400 },
    );
  }

  if (!name || !phone) {
    return NextResponse.json(
      { ok: false, error: "Missing SOS customer fields" },
      { status: 400 },
    );
  }

  const reference = `SOS-${Date.now().toString(36).toUpperCase()}`;
  let discountQuote: DiscountQuote | null = null;
  let redemptionId: string | null = null;
  if (cleanText(data.discountCode, 32)) {
    try {
      discountQuote = await loadDiscountQuote({ code: data.discountCode, email, originalFils: parseBhdToFils(amountBD), includeReservations: true });
      amountBD = Number(discountQuote.finalAmountBd);
      redemptionId = await reserveDiscount({ quote: discountQuote, email, flow: "sos" });
    } catch (error) {
      if (error instanceof DiscountError) return NextResponse.json({ ok: false, error: "Discount code is no longer available", errorCode: error.code }, { status: 400 });
      throw error;
    }
  }
  const chargeResult = await createTapCharge({
    request: input.request,
    tapSecretKey: input.tapSecretKey,
    tapMerchantId: input.tapMerchantId,
    amountBD,
    sourceId: input.sourceId,
    description: `${service}${caseType ? ` - ${caseType}` : ""}`,
    statementDescriptor: "Lawyers.bh",
    customerName: name,
    email: email || "customer@example.com",
    phone,
    redirectPath: `/${lang}/payment/callback`,
    postPath: "/api/tap/webhook",
    reference: {
      transaction: reference,
      order: reference,
    },
    metadata: {
      paymentFlow: "sos",
      countryCode,
      caseType,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      discountCode: discountQuote?.code ?? "",
      originalAmountBd: discountQuote?.originalAmountBd ?? amountBD.toFixed(3),
      discountAmountBd: discountQuote?.discountAmountBd ?? "0.000",
    },
  });

  await attachDiscountToCharge(redemptionId, chargeResult.tapChargeId || null, !chargeResult.tapResponse.ok);

  if (!chargeResult.tapResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: getTapErrorMessage(chargeResult.charge),
        chargeId: chargeResult.tapChargeId || null,
        tap: chargeResult.charge,
      },
      { status: chargeResult.tapResponse.status },
    );
  }

  return NextResponse.json({
    ok: true,
    paymentFlow: "sos",
    chargeId: chargeResult.tapChargeId,
    status: chargeResult.tapStatus,
    transactionUrl: chargeResult.transactionUrl || null,
    requiresRedirect: Boolean(chargeResult.transactionUrl),
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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const requestedCountryCode =
    cleanText(data.countryCode ?? data.country_code ?? data.country, 2)
      .toUpperCase() || "BH";

  const paymentFlow: PaymentFlow =
    data.paymentFlow === "sos" ? "sos" : "book_appointment";

  let country;
  try {
    country = await requireCountryProduct(
      requestedCountryCode,
      paymentFlow === "sos" ? "legal_sos" : "lawyers",
    );
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  const countryTables = buildCountryTableSet(country);
  const bookingRequestsTable = countryTables.booking_requests;
  const lawyersTable = countryTables.lawyers;

  const tapSecretKey = (
    process.env.TAP_SECRET_KEY ||
    ""
  ).trim();
  const tapMerchantId = (
    process.env.TAP_MERCHANT_ID ||
    process.env.NEXT_PUBLIC_TAP_MERCHANT_ID ||
    ""
  ).trim();

  if (!tapSecretKey) {
    return NextResponse.json(
      { ok: false, error: "Missing TAP_SECRET_KEY" },
      { status: 500 },
    );
  }

  const sourceValidation = validateSourceId(data);

  if (!sourceValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: sourceValidation.error,
      },
      { status: 400 },
    );
  }

  if (paymentFlow === "sos") {
    return handleSosCharge({
      request,
      data,
      tapSecretKey,
      tapMerchantId: tapMerchantId || undefined,
      sourceId: sourceValidation.sourceId,
    });
  }

  const service = str(data.service, 200);
  const requestedConsultationType = str(data.consultationType, 100);
  const requestType = str(data.requestType, 50);
  const lang = data.lang === "ar" ? "ar" : "en";

  const consultationMethodRaw = str(data.consultationMethod, 20);

  const method: ConsultMethod = consultationMethodRaw ?? "";

  const isLawyerAuthorizationBooking = requestType === "lawyer_authorization";

  let consultationType = requestedConsultationType ?? "";
  let consultationPrice = "";
  let durationMinutes = 0;
  let amountBD = 0;
  let originalAmountBD = 0;
  let discountQuote: DiscountQuote | null = null;

  if (isLawyerAuthorizationBooking) {
    consultationType = "Lawyer follow-up";
    consultationPrice = "10 BD";
    durationMinutes = 0;
    amountBD = 10;
  } else {
    const catalogueMethod = await findConsultationMethod(country, method);

    if (!catalogueMethod) {
      return NextResponse.json(
        { ok: false, error: "Invalid or inactive consultation method" },
        { status: 400 },
      );
    }

    consultationType = catalogueMethod.name.en;
    consultationPrice = `${catalogueMethod.price} BD`;
    durationMinutes = catalogueMethod.durationMinutes;
    amountBD = catalogueMethod.price;
  }
  originalAmountBD = amountBD;

  const videoProviderRaw = str(data.videoProvider, 20);

  const videoProvider =
    videoProviderRaw === "google-meet" || videoProviderRaw === "whatsapp"
      ? videoProviderRaw
      : "";

  const date = str(data.date, 50);
  const time = str(data.time, 50);

  const name = str(data.name, 120);
  const phone = str(data.phone, 40);
  const email = str(data.email, 120)?.toLowerCase();

  const message =
    typeof data.message === "string" ? data.message.trim().slice(0, 500) : "";

  const rawSelectedLawyerId =
    data.selectedLawyerId ??
    data.lawyerId ??
    data.selectedProviderId ??
    data.providerId;

  const rawSelectedLawyerName =
    data.selectedLawyerName ??
    data.lawyerName ??
    data.selectedProviderName ??
    data.providerName;

  const selectedLawyerId = cleanText(rawSelectedLawyerId, 80);
  const selectedLawyerName = cleanText(rawSelectedLawyerName, 200);

  const assignmentMode = normalizeAssignmentMode(
    data.assignmentMode ??
      (selectedLawyerId || selectedLawyerName ? "lawyer" : "office"),
  );

  const selectedOfficeId = cleanText(data.selectedOfficeId, 120);
  const selectedOfficeName = cleanText(data.selectedOfficeName, 200);

  if (
    !service ||
    !consultationType ||
    !date ||
    !time ||
    !name ||
    !phone ||
    !email
  ) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!isEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(amountBD) || amountBD <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid amount" },
      { status: 400 },
    );
  }

  const resolvedLawyer = await resolveSelectedLawyer({
    assignmentMode,
    selectedLawyerId,
    selectedLawyerName,
    countryCode: country.code,
    lawyersTable,
  });

  if (assignmentMode === "lawyer" && !resolvedLawyer) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Selected lawyer could not be found. Please send selectedLawyerId or a valid selectedLawyerName.",
      },
      { status: 400 },
    );
  }

  const finalSelectedLawyerId =
    assignmentMode === "lawyer" ? resolvedLawyer?.id ?? "" : "";

  const finalSelectedLawyerName =
    assignmentMode === "lawyer"
      ? resolvedLawyer?.name || selectedLawyerName || null
      : null;

  const assignedToEmail =
    assignmentMode === "lawyer"
      ? resolvedLawyer?.email || getDefaultAssignedEmail()
      : getDefaultAssignedEmail();

  const chargeRecipient = getChargeRecipient({
    assignmentMode,
    providerId: finalSelectedLawyerId || null,
    payoutReady: resolvedLawyer?.payoutReady ?? false,
    destinationId: resolvedLawyer?.destinationId ?? null,
  });

  const existingBookingId = cleanText(
    data.bookingId ?? data.existingBookingId,
    80,
  );

  if (existingBookingId && !isUuid(existingBookingId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid bookingId" },
      { status: 400 },
    );
  }

  let bookingId = "";

  try {
    const safeRequestPayload: Record<string, unknown> = {
      ...data,
      sourceId: sourceValidation.benefitPay ? "src_bh.benefit" : "[tap_token]",
      tapTokenId: sourceValidation.benefitPay ? "" : "[tap_token]",
      tokenId: sourceValidation.benefitPay ? "" : "[tap_token]",
    };

    const requestPayloadJson = JSON.stringify({
      ...safeRequestPayload,
      countryCode: country.code,
      consultationType,
      consultationMethod: method,
      consultationPrice,
      durationMinutes,
      amountBD,
      amount: amountBD,
      assignmentMode,
      selectedOfficeId: assignmentMode === "office" ? selectedOfficeId : "",
      selectedOfficeName:
        assignmentMode === "office" ? selectedOfficeName : "",
      selectedLawyerId: finalSelectedLawyerId || selectedLawyerId || "",
      selectedLawyerName: finalSelectedLawyerName || selectedLawyerName || "",
      resolvedSelectedLawyerId: finalSelectedLawyerId || null,
      assignedToEmail,
      allocationMode: chargeRecipient.allocationMode,
      providerPayoutReady: resolvedLawyer?.payoutReady ?? false,
    });

    if (existingBookingId) {
      const existingRows = await sqlClient`
        SELECT id, payment_status
        FROM ${sqlClient(bookingRequestsTable)}
        WHERE id = ${existingBookingId}::uuid
          AND country_code = ${country.code}
        LIMIT 1
      `;

      const existingBooking = existingRows[0] as
        | { id: string; payment_status: string | null }
        | undefined;

      if (!existingBooking) {
        return NextResponse.json(
          { ok: false, error: "Booking request was not found" },
          { status: 404 },
        );
      }

      if (
        existingBooking.payment_status &&
        existingBooking.payment_status !== "pending_payment" &&
        existingBooking.payment_status !== "failed"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "This booking is not available for payment",
            paymentStatus: existingBooking.payment_status,
          },
          { status: 409 },
        );
      }

      bookingId = existingBooking.id;

      await sqlClient`
        UPDATE ${sqlClient(bookingRequestsTable)}
        SET
          lang = ${lang},
          service = ${service},
          consultation_type = ${consultationType},
          consultation_method = ${method},
          consultation_price = ${consultationPrice},
          amount_bd = ${String(amountBD)},
          duration_minutes = ${durationMinutes},
          video_provider = ${videoProvider || null},
          appointment_date = ${date},
          appointment_time = ${time},
          assignment_mode = ${assignmentMode},
          selected_office_id =
            ${assignmentMode === "office" ? selectedOfficeId || null : null},
          selected_office_name =
            ${assignmentMode === "office" ? selectedOfficeName || null : null},
          selected_lawyer_id = ${finalSelectedLawyerId || null},
          selected_lawyer_name = ${finalSelectedLawyerName},
          assigned_to_email = ${assignedToEmail},
          customer_name = ${name},
          customer_phone = ${phone},
          customer_email = ${email},
          customer_message = ${message || null},
          payment_status = ${"pending_payment"},
          admin_status = ${"pending_review"},
          tap_charge_id = ${null},
          tap_status = ${"CREATING"},
          request_payload = ${requestPayloadJson}::jsonb,
          tap_payload = NULL,
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;
    } else {
      const bookingRows = await sqlClient`
        INSERT INTO ${sqlClient(bookingRequestsTable)} (
          country_code, lang, service, consultation_type, consultation_method,
          consultation_price, amount_bd, duration_minutes, video_provider,
          appointment_date, appointment_time, assignment_mode,
          selected_office_id, selected_office_name, selected_lawyer_id,
          selected_lawyer_name, assigned_to_email, customer_name,
          customer_phone, customer_email, customer_message, payment_status,
          admin_status, tap_charge_id, tap_status, request_payload, tap_payload
        ) VALUES (
          ${country.code}, ${lang}, ${service}, ${consultationType}, ${method},
          ${consultationPrice}, ${String(amountBD)}, ${durationMinutes},
          ${videoProvider || null}, ${date}, ${time}, ${assignmentMode},
          ${assignmentMode === "office" ? selectedOfficeId || null : null},
          ${assignmentMode === "office" ? selectedOfficeName || null : null},
          ${finalSelectedLawyerId || null}, ${finalSelectedLawyerName},
          ${assignedToEmail}, ${name}, ${phone}, ${email}, ${message || null},
          ${"pending_payment"}, ${"pending_review"}, ${null}, ${"CREATING"},
          ${requestPayloadJson}::jsonb,
          NULL
        )
        RETURNING id
      `;

      const booking = bookingRows[0] as { id: string } | undefined;

      if (!booking?.id) {
        throw new Error("Booking insert did not return an id");
      }

      bookingId = booking.id;
    }

    if (cleanText(data.discountCode, 32)) {
      discountQuote = await loadDiscountQuote({ code: data.discountCode, email, originalFils: parseBhdToFils(originalAmountBD), includeReservations: true });
      amountBD = Number(discountQuote.finalAmountBd);
      await sqlClient`UPDATE ${sqlClient(bookingRequestsTable)} SET discount_code_id = ${discountQuote.codeId}::uuid, discount_code = ${discountQuote.code}, original_amount_bd = ${discountQuote.originalAmountBd}, discount_amount_bd = ${discountQuote.discountAmountBd}, final_amount_bd = ${discountQuote.finalAmountBd}, amount_bd = ${discountQuote.finalAmountBd}, updated_at = NOW() WHERE id = ${bookingId}::uuid`;
    } else {
      await sqlClient`UPDATE ${sqlClient(bookingRequestsTable)} SET discount_code_id = NULL, discount_code = NULL, original_amount_bd = ${originalAmountBD.toFixed(3)}, discount_amount_bd = ${"0.000"}, final_amount_bd = ${originalAmountBD.toFixed(3)}, amount_bd = ${originalAmountBD.toFixed(3)}, updated_at = NOW() WHERE id = ${bookingId}::uuid`;
    }

    const redemptionId = discountQuote ? await reserveDiscount({ quote: discountQuote, email, flow: "book_appointment", bookingId }) : null;

    const orderReference = `L${country.code}-${bookingId
      .slice(0, 8)
      .toUpperCase()}`;

    const chargeResult = await createTapCharge({
      request,
      tapSecretKey,
      tapMerchantId: tapMerchantId || undefined,
      amountBD: Number(amountBD.toFixed(3)),
      sourceId: sourceValidation.sourceId,
      description: `${service} - ${consultationType}`,
      statementDescriptor: "Lawyers.bh",
      customerName: name,
      email,
      phone,
      redirectPath: `/${lang}/booking-confirmed?bookingId=${bookingId}`,
      postPath: "/api/tap/webhook",
      reference: {
        transaction: orderReference,
        order: orderReference,
      },
      metadata: {
        paymentFlow: "book_appointment",
        countryCode: country.code,
        bookingId,
        service,
        consultationType,
        consultationMethod: method,
        appointmentDate: date,
        appointmentTime: time,
        assignmentMode,
        selectedLawyerId: finalSelectedLawyerId,
        selectedLawyerName: finalSelectedLawyerName || "",
        selectedOfficeId: assignmentMode === "office" ? selectedOfficeId : "",
        selectedOfficeName:
          assignmentMode === "office" ? selectedOfficeName : "",
        assignedToEmail,
        allocationMode: chargeRecipient.allocationMode,
        providerPayoutReady: resolvedLawyer?.payoutReady ?? false,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
      },
    });

    const storedTapStatus =
      chargeResult.tapStatus ||
      (chargeResult.tapResponse.ok ? "INITIATED" : "CREATE_FAILED");

    const tapPayloadJson = JSON.stringify(chargeResult.charge);
    await attachDiscountToCharge(redemptionId, chargeResult.tapChargeId || null, !chargeResult.tapResponse.ok);

    await sqlClient`
      UPDATE ${sqlClient(bookingRequestsTable)}
      SET
        tap_charge_id = ${chargeResult.tapChargeId || null},
        tap_status = ${storedTapStatus},
        tap_payload = ${tapPayloadJson}::jsonb,
        updated_at = NOW()
      WHERE id = ${bookingId}
    `;

    if (!chargeResult.tapResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: getTapErrorMessage(chargeResult.charge),
          bookingId,
          chargeId: chargeResult.tapChargeId || null,
          tap: chargeResult.charge,
        },
        { status: chargeResult.tapResponse.status },
      );
    }

    return NextResponse.json({
      ok: true,
      paymentFlow: "book_appointment",
      bookingId,
      countryCode: country.code,
      chargeId: chargeResult.tapChargeId,
      status: chargeResult.tapStatus,
      transactionUrl: chargeResult.transactionUrl || null,
      requiresRedirect: Boolean(chargeResult.transactionUrl),
    });
  } catch (error) {
    console.error("[tap/charge] failed", error);

    if (bookingId) {
      try {
        const errorPayloadJson = JSON.stringify({
          error:
            error instanceof Error ? error.message : "Tap charge failed",
        });

        await sqlClient`
          UPDATE ${sqlClient(bookingRequestsTable)}
          SET
            payment_status = ${"failed"},
            tap_status = ${"CREATE_FAILED"},
            tap_payload = ${errorPayloadJson}::jsonb,
            updated_at = NOW()
          WHERE id = ${bookingId}
        `;
      } catch (updateError) {
        console.error(
          "[tap/charge] failed to mark booking as failed",
          updateError,
        );
      }
    }

    if (error instanceof DiscountError) return NextResponse.json({ ok: false, error: "Discount code is no longer available", errorCode: error.code }, { status: 400 });
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Tap charge failed",
      },
      { status: 500 },
    );
  }
}
