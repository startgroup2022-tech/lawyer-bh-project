import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import Content from "./Content";

export const dynamic = "force-dynamic";

export default async function ProviderProfileChangesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_approvals"))) redirect(`/${locale}/admin`);
  const rows = await db
    .select({
      id: schema.providerProfileChangeRequests.id,
      status: schema.providerProfileChangeRequests.status,
      proposedValues: schema.providerProfileChangeRequests.proposedValues,
      proposedFiles: schema.providerProfileChangeRequests.proposedFiles,
      rejectionReason: schema.providerProfileChangeRequests.rejectionReason,
      createdAt: schema.providerProfileChangeRequests.createdAt,
      updatedAt: schema.providerProfileChangeRequests.updatedAt,
      reviewedAt: schema.providerProfileChangeRequests.reviewedAt,
      providerId: schema.bahrainLawyers.id,
      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,
      registrationNo: schema.bahrainLawyers.registrationNo,
      registrationLevel: schema.bahrainLawyers.registrationLevel,
      ibanNumber: schema.bahrainLawyers.ibanNumber,
      licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
      crNumber: schema.bahrainLawyers.crNumber,
      subscriptionTypes: schema.bahrainLawyers.subscriptionTypes,
    })
    .from(schema.providerProfileChangeRequests)
    .innerJoin(schema.bahrainLawyers, eq(schema.providerProfileChangeRequests.providerId, schema.bahrainLawyers.id))
    .orderBy(desc(schema.providerProfileChangeRequests.updatedAt));
  return <Content locale={locale} initialItems={rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), reviewedAt: row.reviewedAt?.toISOString() ?? null }))} />;
}
