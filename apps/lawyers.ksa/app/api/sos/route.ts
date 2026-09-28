import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/tap";
import { isEmail, str } from "@/lib/postmark";
import { sqlClient } from "@/lib/db/client";
import type { ActiveCountry } from "@/lib/db/country-tables";
import { assertKsaInputCountry, getKsaContext } from "@/lib/ksa/context";
import { findEmergencyCaseType } from "@/lib/sos/emergencyCaseCatalog";
import { getTapMode } from "@/lib/tap/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConsultMethod = "online" | "phone" | "office" | "video";
type AssignmentMode = "office" | "lawyer";
type PaymentFlow = "book_appointment" | "sos";

type ResolvedLawyer = {
  id: string;
  name: string;
  email: string;
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
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

  if (cleanPhone.startsWith("+966")) {
    return {
      country_code: "966",
      number: cleanPhone.slice(4),
    };
  }

  if (cleanPhone.startsWith("966")) {
    return {
      country_code: "966",
      number: cleanPhone.slice(3),
    };
  }

  return {
    country_code: "966",
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
  amount: number;
  currencyCode?: string;
  sourceId: string;
  lang: string;
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
    amount: Number(input.amount.toFixed(2)),
    currency: input.currencyCode || "SAR",
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
      SELECT lawyers.id, lawyers.full_name_ar, lawyers.full_name_en, lawyers.email
      FROM ${sqlClient(input.lawyersTable)} lawyers
      INNER JOIN saudi_tap_retailer_onboarding tap_onboarding
        ON tap_onboarding.lawyer_id = lawyers.id
      WHERE lawyers.id = ${input.selectedLawyerId}::uuid
        AND lawyers.country_code = ${input.countryCode}
        AND lawyers.is_active = true
        AND lawyers.status = 'approved'
        AND tap_onboarding.environment = ${tapEnvironment}
        AND tap_onboarding.stage = 'active'
        AND tap_onboarding.payout_enabled = true
      LIMIT 1
    `;

    const lawyer = rows[0] as
      | {
          id: string;
          full_name_ar: string | null;
          full_name_en: string | null;
          email: string | null;
        }
      | undefined;

    if (lawyer) {
      return {
        id: lawyer.id,
        name: getLawyerDisplayName(lawyer),
        email: lawyer.email || "",
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
    SELECT lawyers.id, lawyers.full_name_ar, lawyers.full_name_en, lawyers.email
    FROM ${sqlClient(input.lawyersTable)} lawyers
    INNER JOIN saudi_tap_retailer_onboarding tap_onboarding
      ON tap_onboarding.lawyer_id = lawyers.id
    WHERE lawyers.country_code = ${input.countryCode}
      AND lawyers.is_active = true
      AND lawyers.status = 'approved'
      AND tap_onboarding.environment = ${tapEnvironment}
      AND tap_onboarding.stage = 'active'
      AND tap_onboarding.payout_enabled = true
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
      }
    | undefined;

  if (!lawyer) return null;

  return {
    id: lawyer.id,
    name: getLawyerDisplayName(lawyer),
    email: lawyer.email || "",
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
  country: ActiveCountry;
}) {
  const data = input.data;
  const lang = data.lang === "ar" || data.locale === "ar" ? "ar" : "en";
  const name = cleanText(data.name ?? data.fullName, 120);
  const phone = cleanText(data.phone, 40);
  const email = cleanText(data.email, 120).toLowerCase();
  const caseType = cleanText(data.caseType, 120);
  const service = cleanText(data.service, 200) || "Legal SOS";
  const caseDefinition = await findEmergencyCaseType(input.country, caseType);

  if (!caseDefinition) {
    return NextResponse.json(
      { ok: false, error: "Invalid or inactive SOS case type" },
      { status: 400 },
    );
  }

  // Never trust a price sent by the browser or mobile application.
  // The database catalogue is the only source of truth for SOS pricing.
  const amount = caseDefinition.baseFee;

  if (!name || !phone) {
    return NextResponse.json(
      { ok: false, error: "Missing SOS customer fields" },
      { status: 400 },
    );
  }

  const reference = `SOS-${Date.now().toString(36).toUpperCase()}`;
  const chargeResult = await createTapCharge({
    request: input.request,
    tapSecretKey: input.tapSecretKey,
    tapMerchantId: input.tapMerchantId,
    amount,
    currencyCode: caseDefinition.currencyCode,
    sourceId: input.sourceId,
    lang,
    description: `${service} - ${
      lang === "ar" ? caseDefinition.label.ar : caseDefinition.label.en
    }`,
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
      caseType: caseDefinition.slug,
      canonicalAmount: amount,
      currencyCode: caseDefinition.currencyCode,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
    },
  });

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
    amount: amount,
    currencyCode: caseDefinition.currencyCode,
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

  const requestedCountryCode = cleanText(
    data.countryCode ?? data.country_code ?? data.country,
    2,
  ).toUpperCase();
  try {
    assertKsaInputCountry(requestedCountryCode);
  } catch {
    return NextResponse.json(
      { ok: false, error: "KSA_COUNTRY_REQUIRED" },
      { status: 400 },
    );
  }
  const { country, tables: countryTables } = await getKsaContext();
  const bookingRequestsTable = countryTables.booking_requests;
  const lawyersTable = countryTables.lawyers;
  const legalCasesTable = countryTables.legal_cases;

  const tapSecretKey = process.env.TAP_SECRET_KEY;
  const tapMerchantId =
    process.env.TAP_MERCHANT_ID || process.env.NEXT_PUBLIC_TAP_MERCHANT_ID;

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

  const paymentFlow: PaymentFlow =
    data.paymentFlow === "sos" ? "sos" : "book_appointment";

  if (paymentFlow === "sos") {
    return handleSosCharge({
      request,
      data,
      tapSecretKey,
      tapMerchantId,
      sourceId: sourceValidation.sourceId,
      country,
    });
  }

  const service = str(data.service, 200);
  const consultationType = str(data.consultationType, 100);
  const consultationPrice = str(data.consultationPrice, 50) ?? "";

  const consultationMethodRaw = str(data.consultationMethod, 20);

  const method: ConsultMethod =
    consultationMethodRaw === "online" ||
    consultationMethodRaw === "phone" ||
    consultationMethodRaw === "office" ||
    consultationMethodRaw === "video"
      ? consultationMethodRaw
      : "online";

  const durationRaw =
    typeof data.durationMinutes === "number"
      ? data.durationMinutes
      : Number(data.durationMinutes ?? 30);

  const durationMinutes = [0, 15, 20, 30, 45].includes(durationRaw)
    ? durationRaw
    : 30;

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

  const lang = data.lang === "ar" ? "ar" : "en";

  const amountRaw = data.amount;
  const amount =
    typeof amountRaw === "number" ? amountRaw : Number(amountRaw);

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
  const requestedLegalCaseId = cleanText(data.legalCaseId, 80);

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

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid amount" },
      { status: 400 },
    );
  }

  let resolvedLegalCaseId = "";

  if (requestedLegalCaseId) {
    if (!isUuid(requestedLegalCaseId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid legalCaseId" },
        { status: 400 },
      );
    }

    const legalCaseRows = await sqlClient`
      SELECT id
      FROM ${sqlClient(legalCasesTable)}
      WHERE id = ${requestedLegalCaseId}::uuid
        AND country_code = ${country.code}
        AND is_active = true
      LIMIT 1
    `;

    const legalCase = legalCaseRows[0] as { id: string } | undefined;

    if (!legalCase?.id) {
      return NextResponse.json(
        { ok: false, error: "Legal case was not found" },
        { status: 400 },
      );
    }

    resolvedLegalCaseId = legalCase.id;
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
      legalCaseId: resolvedLegalCaseId || null,
      assignmentMode,
      selectedOfficeId: assignmentMode === "office" ? selectedOfficeId : "",
      selectedOfficeName: assignmentMode === "office" ? selectedOfficeName : "",
      selectedLawyerId: finalSelectedLawyerId || selectedLawyerId || "",
      selectedLawyerName: finalSelectedLawyerName || selectedLawyerName || "",
      resolvedSelectedLawyerId: finalSelectedLawyerId || null,
      assignedToEmail,
    });

    const bookingRows = await sqlClient`
      INSERT INTO ${sqlClient(bookingRequestsTable)} (
        country_code, lang, service, consultation_type, consultation_method,
        consultation_price, amount_bd, currency_code, amount,
        duration_minutes, video_provider,
        appointment_date, appointment_time, assignment_mode,
        selected_office_id, selected_office_name, legal_case_id, selected_lawyer_id,
        selected_lawyer_name, assigned_to_email, customer_name,
        customer_phone, customer_email, customer_message, payment_status,
        admin_status, tap_charge_id, tap_status, request_payload, tap_payload
      ) VALUES (
        ${country.code}, ${lang}, ${service}, ${consultationType}, ${method},
        ${consultationPrice}, ${String(amount)}, ${"SAR"}, ${String(amount)},
        ${durationMinutes},
        ${videoProvider || null}, ${date}, ${time}, ${assignmentMode},
        ${assignmentMode === "office" ? selectedOfficeId || null : null},
        ${assignmentMode === "office" ? selectedOfficeName || null : null},
        ${resolvedLegalCaseId || null}::uuid,
        ${finalSelectedLawyerId || null}, ${finalSelectedLawyerName},
        ${assignedToEmail}, ${name}, ${phone}, ${email}, ${message || null},
        ${"pending_payment"}, ${"pending_review"}, ${null}, ${"CREATING"},
        ${requestPayloadJson}::jsonb,
        NULL
      )
      RETURNING id
    `;

    const booking = bookingRows[0] as { id: string } | undefined;
    if (!booking?.id) throw new Error("Booking insert did not return an id");
    bookingId = booking.id;

    const orderReference = `L${country.code}-${bookingId.slice(0, 8).toUpperCase()}`;

    const chargeResult = await createTapCharge({
      request,
      tapSecretKey,
      tapMerchantId,
      amount: Number(amount.toFixed(2)),
      currencyCode: "SAR",
      sourceId: sourceValidation.sourceId,
      lang,
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
        bookingId,
        legalCaseId: resolvedLegalCaseId,
        service,
        consultationType,
        consultationMethod: method,
        appointmentDate: date,
        appointmentTime: time,
        assignmentMode,
        selectedLawyerId: finalSelectedLawyerId,
        selectedLawyerName: finalSelectedLawyerName || "",
        selectedOfficeId: assignmentMode === "office" ? selectedOfficeId : "",
        selectedOfficeName: assignmentMode === "office" ? selectedOfficeName : "",
        assignedToEmail,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
      },
    });

    const storedTapStatus =
      chargeResult.tapStatus ||
      (chargeResult.tapResponse.ok ? "INITIATED" : "CREATE_FAILED");

    const tapPayloadJson = JSON.stringify(chargeResult.charge);

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
  } catch (err) {
    console.error("[tap/charge] failed", err);

    if (bookingId) {
      try {
        const errorPayloadJson = JSON.stringify({
          error: err instanceof Error ? err.message : "Tap charge failed",
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

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Tap charge failed",
      },
      { status: 500 },
    );
  }
}
