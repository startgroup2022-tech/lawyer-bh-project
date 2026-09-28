import { NextResponse } from "next/server";

import { submitJoinApplication } from "@/app/api/join/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, code: "MULTIPART_REQUIRED" },
      { status: 415 },
    );
  }

  return submitJoinApplication(request, {
    mode: "web",
    channel: "legalsos-web",
  });
}
