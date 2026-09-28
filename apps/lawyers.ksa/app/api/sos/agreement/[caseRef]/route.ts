import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams the signed SOS agreement PDF for a given case reference.
 *  No auth in v1 — possession of the case ref is treated as the
 *  authorisation token (the ref is opaque and shown only to the
 *  signing client + dispatch). Phase 2 will add a session-bound
 *  signed link with a short TTL. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const { caseRef } = await params;
  if (!caseRef) {
    return NextResponse.json({ error: "missing_case_ref" }, { status: 400 });
  }

  const [row] = await db
    .select({
      consentId: schema.emergencyRequests.consentId,
      caseRef: schema.emergencyRequests.caseRef,
    })
    .from(schema.emergencyRequests)
    .where(eq(schema.emergencyRequests.caseRef, caseRef))
    .limit(1);
  if (!row || !row.consentId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [consent] = await db
    .select({ pdf: schema.consentLog.signedPdfBase64 })
    .from(schema.consentLog)
    .where(eq(schema.consentLog.id, row.consentId))
    .limit(1);
  if (!consent?.pdf) {
    return NextResponse.json({ error: "pdf_not_ready" }, { status: 404 });
  }

  const pdfBytes = Buffer.from(consent.pdf, "base64");
  return new NextResponse(pdfBytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${row.caseRef}-agreement.pdf"`,
      "cache-control": "no-store",
    },
  });
}
