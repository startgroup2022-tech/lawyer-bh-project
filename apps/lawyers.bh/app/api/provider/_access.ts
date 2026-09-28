import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { canRenewProviderLicense } from "@/lib/provider/license-renewal-policy";

export type ProviderAccessReason =
  | "profile_incomplete"
  | "pending_approval"
  | "rejected"
  | "suspended"
  | "license_expired"
  | "inactive"
  | null;

export type ProviderAccess = {
  canUseDashboard: boolean;
  canUpdateLicense: boolean;
  licenseExpired: boolean;
  reason: ProviderAccessReason;
};

type ProviderAccessInput = {
  profileCompleted: boolean | null;
  status: string | null;
  isActive: boolean | null;
  licenseExpiryDate: string | null;
  suspensionType: string | null;
};

function parseProviderLicenseDate(value: string | null | undefined) {
  if (!value) return null;

  const expiry = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(expiry.getTime()) ? null : expiry;
}

export function isProviderLicenseExpired(value: string | null | undefined) {
  const expiry = parseProviderLicenseDate(value);
  if (!expiry) return true;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return expiry.getTime() < today.getTime();
}

export function evaluateProviderAccess(
  provider: ProviderAccessInput,
): ProviderAccess {
  const status = String(provider.status ?? "pending").trim().toLowerCase();
  const licenseExpired = isProviderLicenseExpired(provider.licenseExpiryDate);
  const canUpdateLicense = canRenewProviderLicense(provider);

  let reason: ProviderAccessReason = null;

  if (!provider.profileCompleted) {
    reason = "profile_incomplete";
  } else if (status === "pending") {
    reason = "pending_approval";
  } else if (status === "rejected") {
    reason = "rejected";
  } else if (status === "suspended") {
    reason = "suspended";
  } else if (status !== "approved") {
    reason = "pending_approval";
  } else if (licenseExpired) {
    reason = "license_expired";
  } else if (!provider.isActive) {
    reason = "inactive";
  }

  return {
    canUseDashboard: reason === null,
    canUpdateLicense,
    licenseExpired,
    reason,
  };
}

export async function getProviderAccessById(
  providerId: string,
  countryCode: string,
) {
  const [provider] = await db
    .select({
      id: schema.bahrainLawyers.id,
      profileCompleted: schema.bahrainLawyers.profileCompleted,
      status: schema.bahrainLawyers.status,
      isActive: schema.bahrainLawyers.isActive,
      licenseExpiryDate: schema.bahrainLawyers.licenseExpiryDate,
      suspensionType: schema.bahrainLawyers.suspensionType,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.id, providerId),
        eq(schema.bahrainLawyers.countryCode, countryCode),
      ),
    )
    .limit(1);

  if (!provider) return null;

  return {
    provider,
    access: evaluateProviderAccess(provider),
  };
}
