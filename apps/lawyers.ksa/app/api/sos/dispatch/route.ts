import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, schema, sqlClient } from "@/lib/db/client";
import { assertKsaInputCountry, getKsaContext } from "@/lib/ksa/context";
import { generateCaseRef, type SosCaseSlug } from "@/lib/sos/caseTypes";
import {
  findEmergencyCaseType,
  type EmergencyCaseCatalogItem,
} from "@/lib/sos/emergencyCaseCatalog";
import { hashConsentText } from "@/lib/sos/consentText";
import { renderSosConsentPdf } from "@/lib/sos/pdfRenderer";
import { findNearestAdvocates } from "@/lib/sos/geo";
import { pushToAdvocate } from "@/lib/sos/webpush";

export const runtime = "nodejs"; // pdf-lib + fs require node runtime

interface DispatchBody {
  countryCode?: string;
  locale: "en" | "ar";
  caseType: SosCaseSlug;
  fullName: string;
  idType: "cpr" | "residence" | "passport";
  idNumber: string;
  phone: string;
  description?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  manualAddress?: string;
  signatureDataUrl: string | null;
  agreedAtClient: string;
}

export async function POST(req: Request) {
  let body: DispatchBody;
  try {
    body = (await req.json()) as DispatchBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  try {
    assertKsaInputCountry(body.countryCode);
  } catch {
    return NextResponse.json(
      { error: "KSA_COUNTRY_REQUIRED" },
      { status: 400 },
    );
  }
  const { country, tables: countryTables } = await getKsaContext();

  // Minimal server-side validation. The UI does richer validation, but
  // never trust the client.
  if (
    !body.caseType ||
    !body.fullName?.trim() ||
    !body.idNumber?.trim() ||
    !body.phone?.trim() ||
    !body.signatureDataUrl
  ) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 },
    );
  }
  const caseType = await findEmergencyCaseType(country, body.caseType);
  if (!caseType) {
    return NextResponse.json(
      { error: "invalid_case_type" },
      { status: 400 },
    );
  }
  if (!["cpr", "residence", "passport"].includes(body.idType)) {
    return NextResponse.json(
      { error: "invalid_id_type" },
      { status: 400 },
    );
  }
  if (!["en", "ar"].includes(body.locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }

  // Capture audit metadata.
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent");
  const contractTextHash = await hashConsentText();
  const now = new Date();

  // 1. Persist consent first so we can FK the request to it.
  const consentRows = await sqlClient`
    INSERT INTO ${sqlClient(countryTables.consent_log)} (
      country_code, full_name, id_type, id_number, role, signature_data_url,
      contract_text_hash, locale, ip_address, user_agent, consented_at
    ) VALUES (
      ${country.code}, ${body.fullName.trim()}, ${body.idType},
      ${body.idNumber.trim()}, ${"client"}, ${body.signatureDataUrl},
      ${contractTextHash}, ${body.locale}, ${ipAddress}, ${userAgent}, ${now}
    )
    RETURNING id
  `;

  const consent = consentRows[0] as { id: string } | undefined;
  if (!consent?.id) {
    return NextResponse.json({ error: "consent_save_failed" }, { status: 500 });
  }

  const caseRef = generateCaseRef();

  // 2. Generate the signed PDF (consent + dispatch metadata combined).
  const pdfBytes = await renderSosConsentPdf({
    caseRef,
    fullName: body.fullName.trim(),
    idType: body.idType,
    idNumber: body.idNumber.trim(),
    role: "client",
    locale: body.locale,
    signatureDataUrl: body.signatureDataUrl,
    signedAt: now.toISOString(),
    ipAddress: ipAddress ?? undefined,
    userAgent: userAgent ?? undefined,
    contractTextHash,
    caseType: caseType.label,
    baseFee: caseType.baseFee,
    description: body.description,
    location:
      body.location ??
      (body.manualAddress
        ? { lat: 0, lng: 0, address: body.manualAddress }
        : undefined),
  });
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  // 3. Store the PDF on the consent row.
  await db
    .update(schema.consentLog)
    .set({ signedPdfBase64: pdfBase64 })
    .where(eq(schema.consentLog.id, consent.id));

  // 4. Insert the emergency request.
  await sqlClient`
    INSERT INTO ${sqlClient(countryTables.emergency_requests)} (
      country_code, case_ref, consent_id, case_type, description, location,
      contact_name, contact_phone, contact_id_number, base_fee_bhd,
      currency_code, base_fee,
      payment_status, service_status, locale
    ) VALUES (
      ${country.code}, ${caseRef}, ${consent.id}, ${body.caseType},
      ${body.description || null},
      ${sqlClient.json(
        body.location ??
          (body.manualAddress
            ? { lat: 0, lng: 0, address: body.manualAddress }
            : null),
      )},
      ${body.fullName.trim()}, ${body.phone.trim()}, ${body.idNumber.trim()},
      ${String(caseType.baseFee)}, ${caseType.currencyCode},
      ${String(caseType.baseFee)}, ${"pending"}, ${"pending"}, ${body.locale}
    )
  `;

  // 5. Fire dispatch comms (best-effort — don't fail the request if
  //    Postmark/WhatsApp deeplink generation has issues).
  void notifyDispatch({
    caseRef,
    caseType,
    fullName: body.fullName.trim(),
    phone: body.phone.trim(),
    idNumber: body.idNumber.trim(),
    description: body.description,
    location: body.location,
    manualAddress: body.manualAddress,
    locale: body.locale,
    pdfBase64,
  });

  // 6. Push fan-out to nearby emergency-ready advocates. Best-effort
  //    so a Web Push delivery glitch doesn't fail the user's request.
  void notifyAdvocatesByPush({
    countryCode: country.code,
    caseRef,
    caseType,
    location: body.location,
    locale: body.locale,
  });

  return NextResponse.json({ caseRef, countryCode: country.code, status: "received" });
}

import { eq } from "drizzle-orm";
import { ServerClient } from "postmark";

interface NotifyArgs {
  caseRef: string;
  caseType: EmergencyCaseCatalogItem;
  fullName: string;
  phone: string;
  idNumber: string;
  description?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  manualAddress?: string;
  locale: "en" | "ar";
  pdfBase64: string;
}

async function notifyDispatch(args: NotifyArgs) {
  const dispatchEmail = process.env.SOS_DISPATCH_EMAIL ?? "info@lawyers.bh";
  const dispatchPhone =
    process.env.SOS_DISPATCH_PHONE?.replace(/[^0-9+]/g, "") ?? "+97336470706";

  const locText = args.location
    ? `https://maps.google.com/?q=${args.location.lat},${args.location.lng}`
    : args.manualAddress ?? "—";

  // 1. Email dispatch with the signed PDF attached so on-call has the
  //    full audit trail at hand.
  const token = process.env.POSTMARK_TOKEN;
  if (token) {
    try {
      const client = new ServerClient(token);
      await client.sendEmail({
        From: process.env.POSTMARK_FROM ?? "no-reply@lawyers.bh",
        To: dispatchEmail,
        Subject: `🚨 Legal SOS — ${args.caseRef} — ${args.caseType.label.en}`,
        HtmlBody: `
<h2 style="color:#D32F2F">Legal SOS Request</h2>
<p><b>Case Reference:</b> ${args.caseRef}</p>
<p><b>Case Type:</b> ${args.caseType.label.en} / ${args.caseType.label.ar}</p>
<p><b>Initial Response Fee:</b> ${args.caseType.baseFee.toFixed(2)} ${args.caseType.currencyCode}</p>
<p><b>Client:</b> ${args.fullName} · ${args.idNumber} · ${args.phone}</p>
<p><b>Location:</b> ${locText}</p>
${args.description ? `<p><b>Description:</b> ${args.description}</p>` : ""}
<p>Signed agreement PDF attached. Dispatch within 10 min.</p>
        `.trim(),
        TextBody: `Legal SOS Request — ${args.caseRef}
Case: ${args.caseType.label.en}
Fee: ${args.caseType.baseFee.toFixed(2)} ${args.caseType.currencyCode}
Client: ${args.fullName} · ${args.idNumber} · ${args.phone}
Location: ${locText}
${args.description ? `Description: ${args.description}\n` : ""}`.trim(),
        Attachments: [
          {
            Name: `${args.caseRef}-agreement.pdf`,
            Content: args.pdfBase64,
            ContentType: "application/pdf",
            ContentID: "",
          },
        ],
        MessageStream: "outbound",
      });
    } catch (e) {
      console.error("[sos] postmark dispatch failed", e);
    }
  } else {
    console.warn(
      `[sos] POSTMARK_TOKEN missing — dispatch email skipped for ${args.caseRef}`,
    );
  }

  // 2. WhatsApp deeplink prefilled — dispatcher clicks once to send.
  //    We don't have outbound WhatsApp Business API, so this is logged
  //    server-side and intended to be triggered from the dashboard.
  const wapText = encodeURIComponent(
    `🚨 SOS ${args.caseRef}\n` +
      `${args.caseType.label.en}\n` +
      `${args.fullName} · ${args.phone}\n` +
      `${locText}`,
  );
  console.info(
    `[sos] dispatch link: https://wa.me/${dispatchPhone.replace(/^\+/, "")}?text=${wapText}`,
  );
}

interface PushFanoutArgs {
  countryCode: string;
  caseRef: string;
  caseType: EmergencyCaseCatalogItem;
  location: { lat: number; lng: number; accuracy?: number } | undefined;
  locale: "en" | "ar";
}

/** Web Push fan-out — finds the nearest emergency-ready advocates and
 *  sends each a high-priority notification with the case ref, type
 *  and SAR amount. The advocate's service worker shows it as a
 *  banner; tap → focuses /sos/lawyer/dashboard for one-tap accept. */
async function notifyAdvocatesByPush(args: PushFanoutArgs) {
  if (!args.location) return; // can't match without GPS
  try {
    const matches = await findNearestAdvocates(
      args.countryCode,
      args.location,
      args.caseType.slug,
      args.caseType.baseFee,
      8,
    );
    if (matches.length === 0) {
      console.info(`[sos/push] no nearby advocates for ${args.caseRef}`);
      return;
    }
    const isAr = args.locale === "ar";
    const titleAr = `🚨 طلب طوارئ — ${args.caseType.label.ar}`;
    const titleEn = `🚨 Legal SOS — ${args.caseType.label.en}`;
    await Promise.all(
      matches.map(async (m) => {
        const bodyEn =
          `${args.caseType.baseFee.toFixed(2)} ${args.caseType.currencyCode} · ${m.distanceKm.toFixed(1)} km away · ` +
          `Tap to accept`;
        const bodyAr =
          `${args.caseType.baseFee.toFixed(2)} ${args.caseType.currencyCode} · على بعد ${m.distanceKm.toFixed(1)} كم · ` +
          `اضغط للقبول`;
        await pushToAdvocate(m.id, {
          title: isAr ? titleAr : titleEn,
          body: isAr ? bodyAr : bodyEn,
          url: `/${args.locale}/sos/lawyer/dashboard`,
          tag: `sos-${args.caseRef}`,
        });
      }),
    );
  } catch (e) {
    console.warn("[sos/push] fan-out failed", e);
  }
}
