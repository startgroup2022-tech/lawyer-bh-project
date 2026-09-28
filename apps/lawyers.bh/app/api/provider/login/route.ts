import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { setProviderSession } from "../_session";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      licenseNumber?: string;
      password?: string;
      countryCode?: string;
    };

    const licenseNumber = String(body.licenseNumber ?? "").trim();
    const password = String(body.password ?? "").trim();
    const country = await requireCountryProduct(body.countryCode || "BH", "lawyers");

    if (!licenseNumber || !password) {
      return NextResponse.json(
        { ok: false, error: "License number and password are required" },
        { status: 400 },
      );
    }

    const [provider] = await db
      .select({
        id: schema.bahrainLawyers.id,
        countryCode: schema.bahrainLawyers.countryCode,
        registrationNo: schema.bahrainLawyers.registrationNo,
        passwordHash: schema.bahrainLawyers.passwordHash,
        status: schema.bahrainLawyers.status,
        isActive: schema.bahrainLawyers.isActive,
      })
      .from(schema.bahrainLawyers)
      .where(
        and(
          eq(schema.bahrainLawyers.registrationNo, licenseNumber),
          eq(schema.bahrainLawyers.countryCode, country.code),
        ),
      )
      .limit(1);

    if (!provider || !provider.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Invalid login details" },
        { status: 401 },
      );
    }

    const passwordOk = await bcrypt.compare(password, provider.passwordHash);

    if (!passwordOk) {
      return NextResponse.json(
        { ok: false, error: "Invalid login details" },
        { status: 401 },
      );
    }

    if (provider.status !== "approved" || !provider.isActive) {
      return NextResponse.json(
        { ok: false, error: "Account is not active" },
        { status: 403 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      providerId: provider.id,
      countryCode: provider.countryCode,
    });

    setProviderSession(response, provider.id, provider.countryCode);

    return response;
  } catch (err) {
    const mapped = mapCountryProductAccessError(err);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[provider-login] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not login" },
      { status: 500 },
    );
  }
}
