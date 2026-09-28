import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { countryCatalog } from "./catalog";
import { parseCountryProvisionInput } from "./provisioning-input";

export { parseCountryProvisionInput } from "./provisioning-input";

export async function provisionCountryDatabase(raw: unknown) {
  const input = parseCountryProvisionInput(raw);
  const catalogCountry = countryCatalog.find((country) => country.code === input.code)!;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.countries)
      .where(eq(schema.countries.code, input.code))
      .limit(1);

    if (existing?.tablesProvisioned) {
      return existing;
    }

    const values = {
      phoneCode: input.phoneCode,
      currencyCode: input.currencyCode,
      defaultLocale: input.defaultLocale,
      isActive: true,
      updatedAt: new Date(),
    };

    const [country] = existing
      ? await tx
          .update(schema.countries)
          .set(values)
          .where(eq(schema.countries.code, input.code))
          .returning()
      : await tx
          .insert(schema.countries)
          .values({
            code: input.code,
            tablePrefix: input.code.toLowerCase(),
            nameAr: catalogCountry.nameAr,
            nameEn: catalogCountry.nameEn,
            ...values,
          })
          .returning();

    if (!country?.tablesProvisioned) {
      throw new Error("Country tables were not provisioned");
    }
    return country;
  });
}
