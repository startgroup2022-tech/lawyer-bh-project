import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { db, schema } from "@/lib/db/client";
import {
  renderAgreementPdf,
  agreementHashSource,
} from "@/lib/contract/agreementPdf";
import type { AgreementData } from "@/lib/contract/agreementTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function formatWeekday(date: Date) {
  return {
    en: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "Asia/Riyadh",
    }).format(date),
    ar: new Intl.DateTimeFormat("ar-SA", {
      weekday: "long",
      timeZone: "Asia/Riyadh",
    }).format(date),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const id = String(url.searchParams.get("id") ?? "").trim();
  const token = String(url.searchParams.get("token") ?? "").trim();
  const download = url.searchParams.get("download") === "1";

  if (!id && !token) {
    return NextResponse.json(
      { ok: false, error: "ID or token is required" },
      { status: 400 },
    );
  }

  const [lawyer] = await db
    .select({
      id: schema.saudiLawyers.id,

      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,

      registrationNo: schema.saudiLawyers.registrationNo,
      signatureDataUrl: schema.saudiLawyers.signatureDataUrl,
      agreementAccepted: schema.saudiLawyers.agreementAccepted,
      profileCompleted: schema.saudiLawyers.profileCompleted,

      completedProfileAt: schema.saudiLawyers.completedProfileAt,
      createdAt: schema.saudiLawyers.createdAt,
    })
    .from(schema.saudiLawyers)
    .where(
      id
        ? eq(schema.saudiLawyers.id, id)
        : eq(schema.saudiLawyers.inviteToken, token),
    )
    .limit(1);

  if (!lawyer) {
    return NextResponse.json(
      { ok: false, error: "Agreement not found" },
      { status: 404 },
    );
  }

  if (!lawyer.signatureDataUrl) {
    return NextResponse.json(
      { ok: false, error: "Signature not found" },
      { status: 404 },
    );
  }

  const signedDate =
    lawyer.completedProfileAt instanceof Date
      ? lawyer.completedProfileAt
      : lawyer.createdAt instanceof Date
        ? lawyer.createdAt
        : new Date();

  const signedAt = signedDate.toISOString();

  const cleanRegistrationNo =
    lawyer.registrationNo && !lawyer.registrationNo.startsWith("INV-")
      ? lawyer.registrationNo
      : "";

  const reference = `PROVIDER-${cleanRegistrationNo || lawyer.id}`;

  const providerName =
    lawyer.fullNameAr ||
    lawyer.fullNameEn ||
    lawyer.email ||
    "Service Provider";

  const agreementData: AgreementData = {
    reference,
    dateLabel: formatDateLabel(signedDate),
    weekday: formatWeekday(signedDate),
    lawyer: {
      name: "Lawyers.bh / Gulf International Collection",
      idOrLicense: "Lawyers.bh",
      address:
        "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town, Kingdom of Bahrain",
      phone: "+97317537070",
      email: "info@lawyers.bh",
    },
    client: {
      name: providerName,
      idOrLicense: cleanRegistrationNo,
      nationality: "Bahrain",
      address: "",
      phone: lawyer.phone ?? "",
      email: lawyer.email ?? "",
    },
    subject:
      "Joining Lawyers.bh as a service provider and accepting the platform terms, appointment handling, electronic requests, payment collection, and applicable commission arrangement.",
    fee: {
      type: "fixed",
      amountBhd: "0",
      installment:
        "No registration fee is charged under this electronic provider onboarding agreement unless separately agreed in writing.",
    },
  };

  const contractTextHash = crypto
    .createHash("sha256")
    .update(agreementHashSource(agreementData))
    .digest("hex");

  const pdfBytes = await renderAgreementPdf({
    data: agreementData,
    reference,
    contractTextHash,
    signedByName: providerName,
    signatureDataUrl: lawyer.signatureDataUrl,
    signedAt,
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  const pdfBuffer = Buffer.from(pdfBytes);
  const fileName = `provider-agreement-${cleanRegistrationNo || lawyer.id}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${
        download ? "attachment" : "inline"
      }; filename="${encodeURIComponent(fileName)}"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
