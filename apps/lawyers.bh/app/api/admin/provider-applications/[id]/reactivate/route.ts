import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema, sqlClient } from "@/lib/db/client";
import { providerApplicationsRepository } from "@/lib/admin/provider-applications-repository";
import { createDefaultProviderCommissionRates } from "@/lib/payments/commission";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";

async function requireAdmin() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_session")?.value;

  if (!adminId) return null;

  const [admin] = await db
    .select({
      id: schema.adminUsers.id,
      isActive: schema.adminUsers.isActive,
    })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, adminId))
    .limit(1);

  if (!admin || !admin.isActive) return null;

  return admin.id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { countryCode?: string };
  const destination = await providerApplicationsRepository.destination(id, String(body.countryCode ?? ""));
  if (!destination) return NextResponse.json({ok:false,error:"Application not found"},{status:404});

  const [updated] = await sqlClient<{id:string;countryCode:string;reviewedAt:Date|null}[]>`
    UPDATE ${sqlClient(destination.table)} SET status='approved',is_active=true,
      suspension_type=NULL,suspension_reason=NULL,suspended_at=NULL,suspended_by=NULL,
      reviewed_at=now(),reviewed_by=${adminId},updated_at=now()
    WHERE id=${id}::uuid AND country_code=${destination.countryCode}
    RETURNING id,country_code AS "countryCode",reviewed_at AS "reviewedAt"`;

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Application not found" },
      { status: 404 },
    );
  }

  const country = await getActiveCountry(updated.countryCode ?? "BH");

  if (!country) {
    return NextResponse.json(
      {
        ok: false,
        error: "Application country is not active",
      },
      { status: 400 },
    );
  }

  const tables = buildCountryTableSet(country);

  await createDefaultProviderCommissionRates({
    providerId: updated.id,
    countryCode: country.code,
    commissionRatesTable: tables.provider_commission_rates,
    startsAt: updated.reviewedAt ?? new Date(),
  });

  return NextResponse.json({
    ok: true,
    id: updated.id,
  });
}
