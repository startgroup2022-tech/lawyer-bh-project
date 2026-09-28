import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

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

function canRenewExpiredLicense(value: string | null | undefined) {
  const expiry = parseProviderLicenseDate(value);
  if (!expiry) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return expiry.getTime() < today.getTime();
}

export function evaluateProviderAccess(
  provider: ProviderAccessInput,
): ProviderAccess {
  const status = String(provider.status ?? "pending").trim().toLowerCase();
  const licenseExpired = isProviderLicenseExpired(provider.licenseExpiryDate);
  const canUpdateLicense = canRenewExpiredLicense(
    provider.licenseExpiryDate,
  );

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
      id: schema.saudiLawyers.id,
      profileCompleted: schema.saudiLawyers.profileCompleted,
      status: schema.saudiLawyers.status,
      isActive: schema.saudiLawyers.isActive,
      licenseExpiryDate: schema.saudiLawyers.licenseExpiryDate,
      suspensionType: schema.saudiLawyers.suspensionType,
    })
    .from(schema.saudiLawyers)
    .where(
      and(
        eq(schema.saudiLawyers.id, providerId),
        eq(schema.saudiLawyers.countryCode, countryCode),
      ),
    )
    .limit(1);

  if (!provider) return null;

  return {
    provider,
    access: evaluateProviderAccess(provider),
  };
}
