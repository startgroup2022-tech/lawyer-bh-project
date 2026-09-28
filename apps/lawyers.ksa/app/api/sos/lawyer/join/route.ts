import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db, schema, sqlClient } from "@/lib/db/client";
import { assertKsaInputCountry, getKsaContext } from "@/lib/ksa/context";
import { hashConsentText } from "@/lib/sos/consentText";
import { renderSosConsentPdf } from "@/lib/sos/pdfRenderer";
import { ServerClient } from "postmark";
import type { SosCaseSlug } from "@/lib/sos/caseTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  countryCode?: string;
  locale: "en" | "ar";
  fullName: string;
  registrationNo: string;
  phone: string;
  email: string;
  baseLocation: { lat: number; lng: number; address?: string };
  emergencyRadiusKm: number;
  enabledCases: SosCaseSlug[];
  emergencyRates: Partial<Record<SosCaseSlug, number>>;
  signatureDataUrl: string;
}

const VALID_SLUGS: SosCaseSlug[] = [
  "emergency_arrest",
  "emergency_search",
  "emergency_travel_ban",
  "emergency_evidence",
  "emergency_report",
   "emergency_consultation",
];

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    assertKsaInputCountry(body.countryCode);
  } catch {
    return NextResponse.json({ error: "KSA_COUNTRY_REQUIRED" }, { status: 400 });
  }
  const { country, tables: countryTables } = await getKsaContext();

  if (
    !body.fullName?.trim() ||
    !body.registrationNo?.trim() ||
    !body.phone?.trim() ||
    !body.email?.trim() ||
    !body.signatureDataUrl
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!body.baseLocation || !Number.isFinite(body.baseLocation.lat)) {
    return NextResponse.json({ error: "missing_location" }, { status: 400 });
  }
  if (
    !Number.isFinite(body.emergencyRadiusKm) ||
    body.emergencyRadiusKm < 1 ||
    body.emergencyRadiusKm > 200
  ) {
    return NextResponse.json({ error: "invalid_radius" }, { status: 400 });
  }
  if (!Array.isArray(body.enabledCases) || body.enabledCases.length === 0) {
    return NextResponse.json({ error: "no_cases" }, { status: 400 });
  }

  // Reject duplicates by registration_no — every advocate has a unique
  // Roll number, so this is the natural primary identifier.
  const [existing] = await db
    .select({ id: schema.saudiLawyers.id })
    .from(schema.saudiLawyers)
    .where(
      and(
        eq(schema.saudiLawyers.registrationNo, body.registrationNo.trim()),
        eq(schema.saudiLawyers.countryCode, country.code),
      ),
    )
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "registration_no_taken" },
      { status: 409 },
    );
  }

  // Prune custom rates to only the enabled cases, and to valid slugs.
  const cleanRates: Partial<Record<SosCaseSlug, number>> = {};
  for (const slug of body.enabledCases) {
    if (!VALID_SLUGS.includes(slug)) continue;
    const v = body.emergencyRates?.[slug];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      cleanRates[slug] = v;
    }
  }

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent");
  const contractTextHash = await hashConsentText();
  const now = new Date();

  // 1. Persist the advocate's signed consent.
  const consentRows = await sqlClient`
    INSERT INTO ${sqlClient(countryTables.consent_log)} (
      country_code, full_name, id_type, id_number, role, signature_data_url,
      contract_text_hash, locale, ip_address, user_agent, consented_at
    ) VALUES (
      ${country.code}, ${body.fullName.trim()}, ${"cpr"},
      ${body.registrationNo.trim()}, ${"advocate"}, ${body.signatureDataUrl},
      ${contractTextHash}, ${body.locale}, ${ipAddress}, ${userAgent}, ${now}
    )
    RETURNING id
  `;
  const consent = consentRows[0] as { id: string } | undefined;
  if (!consent?.id) {
    return NextResponse.json({ error: "consent_save_failed" }, { status: 500 });
  }

  // 2. Generate a signed-consent PDF for the advocate's records.
  const pdfBytes = await renderSosConsentPdf({
    fullName: body.fullName.trim(),
    idType: "cpr",
    idNumber: body.registrationNo.trim(),
    role: "advocate",
    locale: body.locale,
    signatureDataUrl: body.signatureDataUrl,
    signedAt: now.toISOString(),
    ipAddress: ipAddress ?? undefined,
    userAgent: userAgent ?? undefined,
    contractTextHash,
  });
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
  await db
    .update(schema.consentLog)
    .set({ signedPdfBase64: pdfBase64 })
    .where(eq(schema.consentLog.id, consent.id));

  // 3. Insert into the Saudi lawyers table with emergency readiness disabled.
  //    flips that flag manually after verifying the registration No
  //    against the Roll of Practising Lawyers.
  await sqlClient`
    INSERT INTO ${sqlClient(countryTables.lawyers)} (
      country_code, full_name_ar, full_name_en, registration_no, phone, email,
      is_emergency_ready, emergency_radius_km, emergency_rates, base_location,
      consent_id, is_active
    ) VALUES (
      ${country.code}, ${body.fullName.trim()}, ${body.fullName.trim()},
      ${body.registrationNo.trim()}, ${body.phone.trim()},
      ${body.email.trim().toLowerCase()}, ${false},
      ${body.emergencyRadiusKm},
      ${Object.keys(cleanRates).length > 0 ? sqlClient.json(cleanRates) : null},
      ${sqlClient.json(body.baseLocation)}, ${consent.id}, ${true}
    )
  `;

  // 4. Email dispatch with the application + signed PDF for review.
  void notifyDispatch({
    countryCode: country.code,
    fullName: body.fullName.trim(),
    registrationNo: body.registrationNo.trim(),
    phone: body.phone.trim(),
    email: body.email.trim(),
    radius: body.emergencyRadiusKm,
    enabledCases: body.enabledCases,
    customRates: cleanRates,
    pdfBase64,
  });

  return NextResponse.json({ countryCode: country.code, status: "received" });
}

interface NotifyArgs {
  countryCode: string;
  fullName: string;
  registrationNo: string;
  phone: string;
  email: string;
  radius: number;
  enabledCases: SosCaseSlug[];
  customRates: Partial<Record<SosCaseSlug, number>>;
  pdfBase64: string;
}

async function notifyDispatch(args: NotifyArgs) {
  const dispatchEmail = process.env.SOS_DISPATCH_EMAIL ?? "info@lawyers.bh";
  const token = process.env.POSTMARK_TOKEN ?? process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.warn("[sos/lawyer/join] no Postmark token; skipping email");
    return;
  }
  try {
    const client = new ServerClient(token);
    const ratesHtml = Object.entries(args.customRates)
      .map(([k, v]) => `<li><b>${k}:</b> ${Number(v).toFixed(2)} SAR</li>`)
      .join("");
    await client.sendEmail({
      From: process.env.POSTMARK_FROM ?? "no-reply@lawyers.bh",
      To: dispatchEmail,
      Subject: `New ${args.countryCode} emergency advocate application — ${args.fullName}`,
      HtmlBody: `
<h2>New SOS Advocate Application</h2>
<p><b>Name:</b> ${args.fullName}</p>
<p><b>Registration No:</b> ${args.registrationNo}</p>
<p><b>Phone:</b> ${args.phone}</p>
<p><b>Email:</b> ${args.email}</p>
<p><b>Emergency Radius:</b> ${args.radius} km</p>
<p><b>Enabled Cases:</b> ${args.enabledCases.join(", ")}</p>
${ratesHtml ? `<p><b>Custom Rates:</b><ul>${ratesHtml}</ul></p>` : ""}
<p>Verify the registration number against the Roll of Practising
Lawyers, then enable the advocate in the ${args.countryCode} lawyers table to
activate the advocate.</p>
<p>Signed advocate consent PDF attached.</p>
      `.trim(),
      TextBody: `New SOS Advocate Application
Name: ${args.fullName}
Reg No: ${args.registrationNo}
Phone: ${args.phone}
Email: ${args.email}
Radius: ${args.radius} km
Cases: ${args.enabledCases.join(", ")}`.trim(),
      Attachments: [
        {
          Name: `advocate-${args.registrationNo}-consent.pdf`,
          Content: args.pdfBase64,
          ContentType: "application/pdf",
          ContentID: "",
        },
      ],
      MessageStream: "outbound",
    });
  } catch (e) {
    console.error("[sos/lawyer/join] postmark failed", e);
  }
}
