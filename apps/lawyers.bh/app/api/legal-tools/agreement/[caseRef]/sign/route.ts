import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { renderAgreementPdf } from "@/lib/contract/agreementPdf";
import { rowToAgreementData, feeSummary } from "@/lib/contract/agreementService";
import { sendEmail } from "@/lib/postmark";
import { agreementSignedCopy } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

/** Client signs the agreement (in-person same-session OR remote link).
 *  Requires the sign token. Generates the bilingual signed PDF, emails it
 *  to BOTH parties, and persists the signature audit trail. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const { caseRef } = await params;
  type SignBody = { token?: string; signedByName?: string; signatureDataUrl?: string };
  let body: SignBody | null = null;
  try {
    body = (await req.json()) as SignBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = typeof body?.token === "string" ? body.token : "";
  const signedByName =
    typeof body?.signedByName === "string" ? body.signedByName.trim().slice(0, 200) : "";
  const signatureDataUrl =
    typeof body?.signatureDataUrl === "string" &&
    body.signatureDataUrl.startsWith("data:image/png;base64,")
      ? body.signatureDataUrl
      : null;

  if (!caseRef || !token) return NextResponse.json({ error: "missing_params" }, { status: 400 });
  if (!signedByName) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const [row] = await db
    .select()
    .from(schema.lawyerAgreements)
    .where(eq(schema.lawyerAgreements.reference, caseRef))
    .limit(1);

  if (!row || row.signToken !== token) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status === "signed") {
    return NextResponse.json({ error: "already_signed" }, { status: 409 });
  }
  if (row.status === "void") {
    return NextResponse.json({ error: "void" }, { status: 410 });
  }
  if (row.signTokenExpiresAt && row.signTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const signedAtIso = new Date().toISOString();
  const data = rowToAgreementData(row);

  // Generate the signed bilingual PDF.
  const pdfBytes = await renderAgreementPdf({
    data,
    reference: row.reference,
    contractTextHash: row.contractTextHash,
    signedByName,
    signatureDataUrl,
    signedAt: signedAtIso,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
  const locale = row.locale === "ar" ? "ar" : "en";

  // Persist before emailing so a flaky mail provider can't lose the record.
  await db
    .update(schema.lawyerAgreements)
    .set({
      status: "signed",
      signedAt: new Date(signedAtIso),
      signedByName,
      signatureDataUrl,
      signedIp: clientIp(req),
      signedUserAgent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      signedPdfBase64: pdfBase64,
      signToken: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.lawyerAgreements.id, row.id));

  // Email both parties the signed copy.
  const attachment = {
    name: `${row.reference}-agreement.pdf`,
    content: pdfBase64,
    contentType: "application/pdf",
  };
  const fee = feeSummary(row, locale);
  const recipients: Array<{ email: string; name: string }> = [
    { email: row.clientEmail, name: row.clientName },
    { email: row.lawyerEmail, name: row.lawyerName },
  ];
  let emailed = true;
  for (const r of recipients) {
    try {
      const email = agreementSignedCopy({
        lang: locale,
        reference: row.reference,
        recipientName: r.name,
        lawyerName: row.lawyerName,
        clientName: row.clientName,
        feeSummary: fee,
        signedAt: signedAtIso,
      });
      await sendEmail({
        to: r.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: [attachment],
      });
    } catch {
      emailed = false;
    }
  }

  return NextResponse.json({ ok: true, reference: row.reference, emailed });
}
