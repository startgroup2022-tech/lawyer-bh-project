import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { renderAgreement } from "@/lib/contract/agreementTemplate";
import { rowToAgreementData } from "@/lib/contract/agreementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fetch an agreement for the signing page. Requires the matching sign
 *  token (?token=). Returns the rendered sections + party/fee metadata so
 *  the client can review exactly what they're signing. Already-signed or
 *  expired agreements are refused. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const { caseRef } = await params;
  const token = new URL(req.url).searchParams.get("token");
  if (!caseRef || !token) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

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

  const data = rowToAgreementData(row);
  const sections = renderAgreement(data);

  return NextResponse.json({
    reference: row.reference,
    locale: row.locale,
    status: row.status,
    lawyerName: row.lawyerName,
    clientName: row.clientName,
    sections,
  });
}
