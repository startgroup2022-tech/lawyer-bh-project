import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    id: string;
    kind: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id, kind } = await params;

  if (!id || !["profile", "license"].includes(kind)) {
    return NextResponse.json(
      { ok: false, error: "Invalid file request" },
      { status: 400 },
    );
  }

  const [application] = await db
    .select({
      profileImageFileName: schema.saudiLawyers.profileImageFileName,
      profileImageMimeType: schema.saudiLawyers.profileImageMimeType,
      profileImageBase64: schema.saudiLawyers.profileImageBase64,

      licenseFileName: schema.saudiLawyers.licenseFileName,
      licenseFileMimeType: schema.saudiLawyers.licenseFileMimeType,
      licenseFileBase64: schema.saudiLawyers.licenseFileBase64,
    })
    .from(schema.saudiLawyers)
    .where(eq(schema.saudiLawyers.id, id))
    .limit(1);

  if (!application) {
    return NextResponse.json(
      { ok: false, error: "Application not found" },
      { status: 404 },
    );
  }

  const isProfile = kind === "profile";

  const fileName = isProfile
    ? application.profileImageFileName
    : application.licenseFileName;

  const mimeType = isProfile
    ? application.profileImageMimeType
    : application.licenseFileMimeType;

  const base64 = isProfile
    ? application.profileImageBase64
    : application.licenseFileBase64;

  if (!fileName || !mimeType || !base64) {
    return NextResponse.json(
      { ok: false, error: "File not found" },
      { status: 404 },
    );
  }

  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}