import "server-only";

import { sqlClient } from "@/lib/db/client";
import { getKsaContext } from "./context";

export type KsaLawyerLoginRecord = {
  id: string;
  countryCode: "SA";
  registrationNo: string;
  passwordHash: string | null;
  status: string;
  isActive: boolean;
  isEmergencyReady: boolean;
  phone: string | null;
};

export type ActiveKsaLawyer = {
  id: string;
  countryCode: "SA";
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
  email: string | null;
  status: string;
  subscriptionType: string;
};

export async function findKsaLawyerByRegistration(
  registrationNumber: string,
): Promise<KsaLawyerLoginRecord | null> {
  const { tables } = await getKsaContext();
  const rows = await sqlClient`
    SELECT
      id,
      country_code,
      registration_no,
      password_hash,
      status,
      is_active,
      is_emergency_ready,
      phone
    FROM ${sqlClient(tables.lawyers)}
    WHERE country_code = 'SA'
      AND registration_no = ${registrationNumber}
    LIMIT 1
  `;
  const row = rows[0] as {
    id: string;
    country_code: "SA";
    registration_no: string;
    password_hash: string | null;
    status: string;
    is_active: boolean;
    is_emergency_ready: boolean;
    phone: string | null;
  } | undefined;

  return row
    ? {
        id: row.id,
        countryCode: row.country_code,
        registrationNo: row.registration_no,
        passwordHash: row.password_hash,
        status: row.status,
        isActive: row.is_active,
        isEmergencyReady: row.is_emergency_ready,
        phone: row.phone,
      }
    : null;
}

export async function listActiveKsaLawyers(): Promise<ActiveKsaLawyer[]> {
  const { tables } = await getKsaContext();
  const rows = await sqlClient`
    SELECT
      id,
      country_code,
      full_name_ar,
      full_name_en,
      phone,
      email,
      status,
      subscription_type
    FROM ${sqlClient(tables.lawyers)}
    WHERE country_code = 'SA'
      AND status = 'approved'
      AND is_active = true
  `;

  return (Array.from(rows) as unknown as Array<{
    id: string;
    country_code: "SA";
    full_name_ar: string;
    full_name_en: string;
    phone: string;
    email: string | null;
    status: string;
    subscription_type: string;
  }>).map((row) => ({
    id: row.id,
    countryCode: row.country_code,
    fullNameAr: row.full_name_ar,
    fullNameEn: row.full_name_en,
    phone: row.phone,
    email: row.email,
    status: row.status,
    subscriptionType: row.subscription_type,
  }));
}
