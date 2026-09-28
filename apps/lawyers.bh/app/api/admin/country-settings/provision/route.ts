import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { provisionCountryDatabase } from "@/lib/countries/provisioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  try {
    const country = await provisionCountryDatabase(await request.json());
    return NextResponse.json({ ok: true, country });
  } catch (error) {
    const invalid = error instanceof Error && error.name === "CountryProvisionInputError";
    return NextResponse.json(
      { error: invalid ? error.message : "Could not provision country database" },
      { status: invalid ? 400 : 503 },
    );
  }
}
