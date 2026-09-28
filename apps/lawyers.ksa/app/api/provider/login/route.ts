import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setProviderSession } from "../_session";
import { assertKsaInputCountry } from "@/lib/ksa/context";
import { findKsaLawyerByRegistration } from "@/lib/ksa/lawyers";

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
    assertKsaInputCountry(body.countryCode);

    if (!licenseNumber || !password) {
      return NextResponse.json(
        { ok: false, error: "License number and password are required" },
        { status: 400 },
      );
    }

    const provider = await findKsaLawyerByRegistration(licenseNumber);

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
    if (err instanceof Error && err.message === "KSA_COUNTRY_REQUIRED") {
      return NextResponse.json(
        { ok: false, error: "KSA_COUNTRY_REQUIRED" },
        { status: 400 },
      );
    }
    console.error("[provider-login] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not login" },
      { status: 500 },
    );
  }
}
