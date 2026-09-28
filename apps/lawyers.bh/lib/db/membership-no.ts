import "server-only";

import { sqlClient } from "@/lib/db/client";
import type { ActiveCountry } from "@/lib/db/country-tables";

export async function generateLawyerMembershipNo(
  country: ActiveCountry,
): Promise<string> {
  const sequenceName =
    `${country.tablePrefix}_lawyers_membership_no_seq`;

  const rows = await sqlClient`
    SELECT nextval(${sequenceName}::regclass) AS value
  `;

  const valueRaw = (
    rows[0] as { value?: string | number } | undefined
  )?.value;

  if (valueRaw === undefined) {
    throw new Error("Could not generate lawyer membership number");
  }

  const value = Number(valueRaw);

  if (!Number.isFinite(value)) {
    throw new Error("Generated membership number is invalid");
  }

  return `L${country.code}-${String(value).padStart(6, "0")}`;
}