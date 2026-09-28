import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getCaseTypeBySlug } from "@/lib/sos/caseTypes";
import Content from "./Content";

export const dynamic = "force-dynamic";

export default async function SosConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string; caseRef: string }>;
}) {
  const { locale, caseRef } = await params;
  setRequestLocale(locale);

  const [row] = await db
    .select({
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      contactName: schema.emergencyRequests.contactName,
      contactPhone: schema.emergencyRequests.contactPhone,
      baseFeeBhd: schema.emergencyRequests.baseFeeBhd,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      createdAt: schema.emergencyRequests.createdAt,
      consentId: schema.emergencyRequests.consentId,
      location: schema.emergencyRequests.location,
    })
    .from(schema.emergencyRequests)
    .where(eq(schema.emergencyRequests.caseRef, caseRef))
    .limit(1);

  if (!row) notFound();

  const caseType = getCaseTypeBySlug(row.caseType);

  return (
    <Content
      caseRef={row.caseRef}
      caseTypeLabel={caseType?.label ?? { en: row.caseType, ar: row.caseType }}
      contactName={row.contactName}
      contactPhone={row.contactPhone}
      baseFeeBhd={Number(row.baseFeeBhd)}
      serviceStatus={row.serviceStatus}
      createdAtIso={row.createdAt.toISOString()}
      requestLocation={
        row.location && typeof row.location.lat === "number"
          ? { lat: row.location.lat, lng: row.location.lng }
          : null
      }
    />
  );
}
