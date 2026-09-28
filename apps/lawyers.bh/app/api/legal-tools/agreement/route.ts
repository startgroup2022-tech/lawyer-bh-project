import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { buildCountryTableSet } from "@/lib/db/country-tables";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import {
  validateAgreementInput,
  generateReference,
  generateSignToken,
  sha256Hex,
  type RawAgreementInput,
} from "@/lib/contract/agreementService";
import { agreementHashSource } from "@/lib/contract/agreementPdf";
import { AGREEMENT_VERSION } from "@/lib/contract/agreementTemplate";
import { sendEmail } from "@/lib/postmark";
import { agreementSignInvite } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/** Lawyer fills the agreement form. Creates a row and either:
 *  - mode="remote": emails the client a signing link, returns { reference }
 *  - mode="in_person": returns { reference, token } so the client can sign
 *    on the same device immediately via the /sign endpoint.
 */
export async function POST(req: Request) {
  let body: (RawAgreementInput & { mode?: string; countryCode?: string }) | null = null;
  try {
    body = (await req.json()) as RawAgreementInput & {
      mode?: string;
      countryCode?: string;
    };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let country;
  try {
    country = await requireCountryProduct(body.countryCode || "BH", "lawyers");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }
  const countryTables = buildCountryTableSet(country);

  const mode = body.mode === "remote" ? "remote" : "in_person";
  const reference = generateReference();

  let validated;
  try {
    validated = validateAgreementInput(body, reference);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "validation_failed" },
      { status: 400 },
    );
  }
  const { data, locale, fee } = validated;

  const contractTextHash = sha256Hex(agreementHashSource(data));
  const signToken = generateSignToken();
  const signTokenExpiresAt = new Date(Date.now() + SIGN_TOKEN_TTL_MS);

  await sqlClient`
    INSERT INTO ${sqlClient(countryTables.lawyer_agreements)} (
      country_code, reference, status, lawyer_name, lawyer_license_no,
      lawyer_address, lawyer_phone, lawyer_email, client_name, client_id_no,
      client_nationality, client_address, client_phone, client_email, subject,
      fee_type, fee_fixed_amount_bhd, fee_fixed_installment,
      fee_contingency_percent, fee_contingency_basis, locale, contract_version,
      contract_text_hash, sign_token, sign_token_expires_at
    ) VALUES (
      ${country.code}, ${reference}, ${mode === "remote" ? "sent" : "draft"},
      ${data.lawyer.name}, ${data.lawyer.idOrLicense ?? null},
      ${data.lawyer.address ?? null}, ${data.lawyer.phone ?? null},
      ${data.lawyer.email}, ${data.client.name},
      ${data.client.idOrLicense ?? null}, ${data.client.nationality ?? null},
      ${data.client.address ?? null}, ${data.client.phone ?? null},
      ${data.client.email}, ${data.subject}, ${fee.type},
      ${fee.type === "fixed" ? fee.amountBhd : null},
      ${fee.type === "fixed" ? fee.installment ?? null : null},
      ${fee.type === "contingency" ? fee.percent : null},
      ${fee.type === "contingency" ? fee.basis : null},
      ${locale}, ${AGREEMENT_VERSION}, ${contractTextHash}, ${signToken},
      ${signTokenExpiresAt}
    )
  `;

  if (mode === "remote") {
    // Email the client the signing link. Best-effort: if email fails we
    // still return ok with a warning so the lawyer can copy the link.
    const origin = new URL(req.url).origin;
    const signUrl = `${origin}/${locale}/agreement/${reference}?token=${signToken}`;
    try {
      const email = agreementSignInvite({
        lang: locale,
        reference,
        lawyerName: data.lawyer.name,
        clientName: data.client.name,
        signUrl,
      });
      await sendEmail({
        to: data.client.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: data.lawyer.email,
      });
    } catch {
      return NextResponse.json({ reference, countryCode: country.code, emailed: false, signUrl });
    }
    return NextResponse.json({ reference, countryCode: country.code, emailed: true });
  }

  // In-person: hand the token back for same-session signing.
  return NextResponse.json({ reference, countryCode: country.code, token: signToken });
}
