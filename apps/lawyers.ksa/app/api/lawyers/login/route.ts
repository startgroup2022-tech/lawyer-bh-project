import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { assertKsaInputCountry } from "@/lib/ksa/context";
import { findKsaLawyerByRegistration } from "@/lib/ksa/lawyers";
import { createMobileLawyerToken } from "@/lib/mobile-lawyer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mobileStatus(status: string) {
  return status === "pending" ? "pending_review" : status;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { licenseNumber?: string; password?: string; countryCode?: string }
    | null;

  const licenseNumber = String(body?.licenseNumber || "").trim();
  const password = String(body?.password || "");
  try {
    assertKsaInputCountry(body?.countryCode);
  } catch {
    return NextResponse.json(
      { success: false, message: "KSA_COUNTRY_REQUIRED" },
      { status: 400 },
    );
  }

  if (!licenseNumber || !password) {
    return NextResponse.json(
      { success: false, message: "License number and password are required" },
      { status: 400 },
    );
  }

  const lawyer = await findKsaLawyerByRegistration(licenseNumber);

  if (!lawyer?.passwordHash || !(await bcrypt.compare(password, lawyer.passwordHash))) {
    return NextResponse.json(
      { success: false, message: "Invalid login details" },
      { status: 401 },
    );
  }

  if (lawyer.status === "rejected" || lawyer.status === "suspended") {
    return NextResponse.json(
      { success: false, message: "Account is not available" },
      { status: 403 },
    );
  }

  const token = createMobileLawyerToken(lawyer.id, lawyer.countryCode);

  return NextResponse.json({
    success: true,
    data: {
      id: lawyer.id,
      countryCode: lawyer.countryCode,
      licenseNumber: lawyer.registrationNo,
      phone: lawyer.phone,
      status: mobileStatus(lawyer.status),
      isAvailable: lawyer.isActive && lawyer.isEmergencyReady,
      token,
    },
  });
}
