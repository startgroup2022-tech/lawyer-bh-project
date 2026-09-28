import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { providerApplicationsRepository } from "@/lib/admin/provider-applications-repository";
import { requireAdminPermission } from "@/lib/auth/admin-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  if (!(await requireAdminPermission("manage_approvals"))) {
    return NextResponse.json({ ok:false, error:"Forbidden" }, { status:403 });
  }
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Application id is required" },
      { status: 400 },
    );
  }

  let body: { reason?: string; countryCode?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason = String(body.reason ?? "").trim().slice(0, 500);
  const destination = await providerApplicationsRepository.destination(id, String(body.countryCode ?? ""));

  if (!reason) {
    return NextResponse.json(
      { ok: false, error: "Rejection reason is required" },
      { status: 400 },
    );
  }
  if (!destination) return NextResponse.json({ ok:false, error:"Application not found" }, { status:404 });

  try {
    const [application] = await sqlClient<{id:string;status:string}[]>`
      SELECT id,status FROM ${sqlClient(destination.table)}
      WHERE id=${id}::uuid AND country_code=${destination.countryCode} LIMIT 1`;

    if (!application) {
      return NextResponse.json(
        { ok: false, error: "Application not found" },
        { status: 404 },
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Application is already reviewed" },
        { status: 409 },
      );
    }

    await sqlClient`UPDATE ${sqlClient(destination.table)} SET
      status='rejected',is_active=false,reviewed_at=now(),reviewed_by='admin',
      rejection_reason=${reason},updated_at=now()
      WHERE id=${id}::uuid AND country_code=${destination.countryCode}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin reject application] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not reject application" },
      { status: 500 },
    );
  }
}
