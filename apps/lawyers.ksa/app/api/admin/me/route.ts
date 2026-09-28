import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    admin,
  });
}
