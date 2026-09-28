import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import type { ProposedProfileFiles } from "@/lib/provider/profile-change-review";

const allowedKinds = new Set(["profileImage", "licenseFile", "ibanCertificate", "institutionLicense", "personalId", "signature"]);

export async function GET(_request: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  if (!(await requireAdminPermission("manage_approvals"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id, kind } = await context.params;
  if (!allowedKinds.has(kind)) return NextResponse.json({ ok: false, error: "Invalid file kind" }, { status: 400 });
  const [change] = await db.select({ proposedFiles: schema.providerProfileChangeRequests.proposedFiles }).from(schema.providerProfileChangeRequests).where(eq(schema.providerProfileChangeRequests.id, id)).limit(1);
  const file = (change?.proposedFiles as ProposedProfileFiles | undefined)?.[kind as keyof ProposedProfileFiles];
  if (!file?.url) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  const upstream = await fetch(file.url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ ok: false, error: "File unavailable" }, { status: 502 });
  return new Response(upstream.body, { headers: { "content-type": file.mimeType, "content-disposition": `inline; filename="${file.fileName.replace(/["\r\n]/g, "_")}"`, "cache-control": "private, no-store" } });
}
